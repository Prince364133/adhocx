import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import { RedisService } from '../../../redis/redis.service';

export interface GeocodedAddressResult {
  lat: number;
  lng: number;
  matchedAddress: string;
  partialMatch: boolean;
  isRealGeocode: boolean;
}

@Injectable()
export class GoogleGeocodingAdapter {
  private readonly logger = new Logger(GoogleGeocodingAdapter.name);
  private readonly apiKey: string;
  private readonly memoryCache = new Map<string, GeocodedAddressResult>();

  constructor(private readonly redis: RedisService) {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';
  }

  /**
   * Geocodes an address string using Google Geocoding API with Redis & in-memory caching.
   */
  async geocode(address: string): Promise<GeocodedAddressResult> {
    const raw = (address || '').trim();
    if (!raw) {
      throw new Error('Address cannot be blank');
    }

    const normalized = raw.toLowerCase().replace(/\s+/g, ' ');

    // 1. Check in-memory cache
    const memCached = this.memoryCache.get(normalized);
    if (memCached) {
      return memCached;
    }

    // 2. Check Redis cache
    const redisKey = `corporate:geocode:${Buffer.from(normalized).toString('base64').slice(0, 48)}`;
    try {
      const redisCached = await this.redis.get(redisKey);
      if (redisCached) {
        const parsed: GeocodedAddressResult = JSON.parse(redisCached);
        this.memoryCache.set(normalized, parsed);
        return parsed;
      }
    } catch {
      // Redis failover - proceed to API
    }

    // 3. Call Google Geocoding API if key configured
    if (this.apiKey) {
      try {
        const result = await this.fetchGoogleGeocode(raw);
        this.memoryCache.set(normalized, result);
        try {
          await this.redis.set(redisKey, JSON.stringify(result), 86400 * 7); // 7-day TTL
        } catch {
          // ignore redis error
        }
        return result;
      } catch (err: any) {
        this.logger.warn(`Google Geocoding failed for "${raw}" (${err.message}). Using high-fidelity Hyderabad spatial fallback.`);
      }
    }

    // 4. Deterministic fallback for test / offline / missing key environments
    const fallback = this.generateFallbackCoordinates(raw);
    this.memoryCache.set(normalized, fallback);
    return fallback;
  }

  /**
   * Geocodes multiple addresses concurrently with a concurrency limit.
   */
  async batchGeocode(
    addresses: string[],
    concurrency = 6,
    onProgress?: (completed: number, total: number, address: string) => void,
  ): Promise<Map<string, GeocodedAddressResult>> {
    const unique = Array.from(new Set(addresses.map((a) => a.trim()).filter(Boolean)));
    const results = new Map<string, GeocodedAddressResult>();
    let completed = 0;

    const queue = [...unique];
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        const addr = queue.shift();
        if (!addr) break;
        try {
          const res = await this.geocode(addr);
          results.set(addr.toLowerCase(), res);
        } catch (err) {
          this.logger.error(`Failed to geocode "${addr}":`, err);
        }
        completed++;
        if (onProgress) {
          onProgress(completed, unique.length, addr);
        }
      }
    });

    await Promise.all(workers);
    return results;
  }

  private fetchGoogleGeocode(address: string): Promise<GeocodedAddressResult> {
    return new Promise((resolve, reject) => {
      const encoded = encodeURIComponent(address);
      const path = `/maps/api/geocode/json?address=${encoded}&key=${this.apiKey}`;

      const req = https.get(
        {
          hostname: 'maps.googleapis.com',
          path,
          timeout: 10000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
              }
              const payload = JSON.parse(data);
              if (payload.status !== 'OK' || !payload.results || payload.results.length === 0) {
                return reject(new Error(`Geocode status: ${payload.status} (${payload.error_message || 'No results'})`));
              }
              const first = payload.results[0];
              const loc = first.geometry.location;
              resolve({
                lat: Number(loc.lat),
                lng: Number(loc.lng),
                matchedAddress: first.formatted_address || address,
                partialMatch: Boolean(first.partial_match),
                isRealGeocode: true,
              });
            } catch (err) {
              reject(err);
            }
          });
        },
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Google Geocoding request timed out'));
      });
      req.on('error', reject);
    });
  }

  /**
   * Deterministic spatial fallback coordinates mapped to Hyderabad metropolitan area.
   */
  private generateFallbackCoordinates(address: string): GeocodedAddressResult {
    const lower = address.toLowerCase();

    // Known Hyderabad tech corridor coordinates
    if (lower.includes('shamshabad') || lower.includes('airport')) {
      return { lat: 17.2403, lng: 78.4294, matchedAddress: 'RGIA Shamshabad Airport, Hyderabad, Telangana', partialMatch: false, isRealGeocode: false };
    }
    if (lower.includes('hitec') || lower.includes('cyber') || lower.includes('mindspace')) {
      return { lat: 17.4435, lng: 78.3772, matchedAddress: 'Hitec City, Hyderabad, Telangana', partialMatch: false, isRealGeocode: false };
    }
    if (lower.includes('gachibowli') || lower.includes('wipro') || lower.includes('financial district')) {
      return { lat: 17.4401, lng: 78.3489, matchedAddress: 'Gachibowli, Hyderabad, Telangana', partialMatch: false, isRealGeocode: false };
    }
    if (lower.includes('madhapur') || lower.includes('durgam')) {
      return { lat: 17.4483, lng: 78.3915, matchedAddress: 'Madhapur, Hyderabad, Telangana', partialMatch: false, isRealGeocode: false };
    }
    if (lower.includes('kondapur') || lower.includes('kothaguda')) {
      return { lat: 17.4699, lng: 78.3578, matchedAddress: 'Kondapur, Hyderabad, Telangana', partialMatch: false, isRealGeocode: false };
    }
    if (lower.includes('jubilee') || lower.includes('banjara')) {
      return { lat: 17.4319, lng: 78.4073, matchedAddress: 'Jubilee Hills, Hyderabad, Telangana', partialMatch: false, isRealGeocode: false };
    }
    if (lower.includes('kukatpally') || lower.includes('kphb')) {
      return { lat: 17.4947, lng: 78.3996, matchedAddress: 'Kukatpally, Hyderabad, Telangana', partialMatch: false, isRealGeocode: false };
    }
    if (lower.includes('secunderabad') || lower.includes('begumpet')) {
      return { lat: 17.4399, lng: 78.4983, matchedAddress: 'Secunderabad, Telangana', partialMatch: false, isRealGeocode: false };
    }

    // Hash-based deterministic coordinate within 15 km of Hyderabad center (17.43, 78.38)
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      hash = (hash << 5) - hash + address.charCodeAt(i);
      hash |= 0;
    }
    const offsetLat = ((Math.abs(hash) % 200) - 100) / 1000; // ~ -0.1 to +0.1 (~11 km)
    const offsetLng = ((Math.abs(hash >> 3) % 200) - 100) / 1000;

    return {
      lat: Number((17.44 + offsetLat).toFixed(6)),
      lng: Number((78.38 + offsetLng).toFixed(6)),
      matchedAddress: address,
      partialMatch: true,
      isRealGeocode: false,
    };
  }
}


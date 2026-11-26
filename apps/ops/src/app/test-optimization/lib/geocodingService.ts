import type { GeocodedPoint } from '../types.ts';
import { PRE_GEOCODED_LOCATIONS } from '../sampleData.ts';

const GOOGLE_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_ROUTES_API_KEY ||
  process.env.GOOGLE_MAPS_BROWSER_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ||
  '';

// In-memory geocode cache for this session with LRU capacity protection
const MAX_GEOCODE_CACHE_ENTRIES = 5000;
const sessionGeocodeCache = new Map<string, GeocodedPoint>();

function cacheGeocodedPoint(key: string, point: GeocodedPoint) {
  if (sessionGeocodeCache.size >= MAX_GEOCODE_CACHE_ENTRIES) {
    const oldestKey = sessionGeocodeCache.keys().next().value;
    if (oldestKey) sessionGeocodeCache.delete(oldestKey);
  }
  sessionGeocodeCache.set(key, point);
}

/**
 * Normalizes an address string for consistent cache key lookup.
 */
export function normalizeAddressKey(address: string): string {
  return address.toLowerCase().trim().replace(/[\s,.-]+/g, ' ');
}

/**
 * Geocodes an address with caching, pre-geocoded sample lookup, Google API, and deterministic fallback.
 */
export async function geocodeAddress(
  address: string,
  referenceLat: number = 17.4414,
  referenceLng: number = 78.3809,
): Promise<GeocodedPoint> {
  const normKey = normalizeAddressKey(address);

  // 1. Session Memory Cache
  if (sessionGeocodeCache.has(normKey)) {
    return sessionGeocodeCache.get(normKey)!;
  }

  // 2. Pre-Geocoded Sample Locations Dictionary Lookup
  for (const [key, val] of Object.entries(PRE_GEOCODED_LOCATIONS)) {
    const normSampleKey = normalizeAddressKey(key);
    if (
      normKey === normSampleKey ||
      normKey.includes(normSampleKey) ||
      (normKey.length >= 15 && normSampleKey.includes(normKey))
    ) {
      const point: GeocodedPoint = {
        lat: val.lat,
        lng: val.lng,
        formattedAddress: val.formatted || address,
        isSimulatedGeocode: false,
      };
      cacheGeocodedPoint(normKey, point);
      return point;
    }
  }

  // 3. Google Places API (New Text Search - Highly accurate for Indian addresses, landmarks & localities)
  if (GOOGLE_API_KEY) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const urlPlaces = 'https://places.googleapis.com/v1/places:searchText';
      const placesRes = await fetch(urlPlaces, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location',
        },
        body: JSON.stringify({
          textQuery: address,
          regionCode: 'IN',
          locationBias: {
            circle: {
              center: { latitude: referenceLat, longitude: referenceLng },
              radius: 40000.0,
            },
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (placesRes.ok) {
        const pData = await placesRes.json();
        if (pData.places && pData.places.length > 0) {
          const firstPlace = pData.places[0];
          if (firstPlace.location) {
            const point: GeocodedPoint = {
              lat: Number(firstPlace.location.latitude.toFixed(6)),
              lng: Number(firstPlace.location.longitude.toFixed(6)),
              formattedAddress: firstPlace.formattedAddress || address,
              isSimulatedGeocode: false,
            };
            cacheGeocodedPoint(normKey, point);
            return point;
          }
        }
      }
    } catch {
      // Fall through to legacy Geocoding API or offline hash
    }

    // 4. Fallback to Google Geocoding API (with region bias)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address,
      )}&region=in&key=${GOOGLE_API_KEY}`;

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          const point: GeocodedPoint = {
            lat: Number(loc.lat.toFixed(6)),
            lng: Number(loc.lng.toFixed(6)),
            formattedAddress: data.results[0].formatted_address || address,
            isSimulatedGeocode: false,
          };
          cacheGeocodedPoint(normKey, point);
          return point;
        }
      }
    } catch {
      // Graceful fallback to deterministic local coordinate generator when offline
    }
  }

  // 5. Deterministic Geodesic Hash relative to the depot/office
  let hash = 0;
  for (let i = 0; i < normKey.length; i++) {
    hash = (hash << 5) - hash + normKey.charCodeAt(i);
    hash |= 0;
  }

  const latOffset = ((Math.abs(hash) % 1000) / 10000) * (hash % 2 === 0 ? 1 : -1);
  const lngOffset = ((Math.abs(hash >> 3) % 1000) / 10000) * (hash % 3 === 0 ? 1 : -1);

  const fallbackPoint: GeocodedPoint = {
    lat: Number((referenceLat + latOffset).toFixed(6)),
    lng: Number((referenceLng + lngOffset).toFixed(6)),
    formattedAddress: address,
    isSimulatedGeocode: true,
  };

  cacheGeocodedPoint(normKey, fallbackPoint);
  return fallbackPoint;
}

/**
 * Batch geocodes multiple addresses concurrently with a bounded concurrency pool.
 */
export async function batchGeocodeAddresses(
  addresses: string[],
  referenceLat: number = 17.4414,
  referenceLng: number = 78.3809,
  concurrency = 5,
): Promise<Map<string, GeocodedPoint>> {
  const uniqueAddresses = Array.from(new Set(addresses));
  const results = new Map<string, GeocodedPoint>();

  for (let i = 0; i < uniqueAddresses.length; i += concurrency) {
    const chunk = uniqueAddresses.slice(i, i + concurrency);
    const chunkPromises = chunk.map((addr) =>
      geocodeAddress(addr, referenceLat, referenceLng).then((pt) => {
        results.set(addr, pt);
      }),
    );
    await Promise.all(chunkPromises);
  }

  return results;
}

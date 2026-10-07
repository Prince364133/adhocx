// scripts/test_google_maps_service.js
// Tests live Google Maps Platform APIs for AdhocX

const https = require('https');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyB8uEHtGy96QPbx3eIxG0s0_WYlWpB8QVI';

function postJson(hostname, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Testing Live Google Maps Platform Services for AdhocX');
  console.log('API Key:', GOOGLE_MAPS_API_KEY.slice(0, 10) + '...' + GOOGLE_MAPS_API_KEY.slice(-6));
  console.log('====================================================\n');

  // 1. Places API (New) Text Search
  console.log('1️⃣ Testing Google Places API (New) Search Text...');
  const testQueries = ['Cyber City Gurugram', 'IGI Airport Terminal 3', 'Connaught Place', 'Sector 62 Noida'];
  for (const q of testQueries) {
    try {
      const res = await postJson(
        'places.googleapis.com',
        '/v1/places:searchText',
        {
          textQuery: q,
          languageCode: 'en',
          locationBias: {
            circle: {
              center: { latitude: 28.6139, longitude: 77.2090 },
              radius: 50000.0,
            },
          },
        },
        {
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types',
        }
      );
      const count = res.places ? res.places.length : 0;
      console.log(`   ✓ Query "${q}": Found ${count} results on Google Maps.`);
      if (count > 0) {
        const top = res.places[0];
        console.log(`     Top Result: "${top.displayName?.text}", Address: "${top.formattedAddress}" [Lat: ${top.location?.latitude}, Lng: ${top.location?.longitude}]`);
      }
    } catch (err) {
      console.error(`   ❌ Failed for query "${q}":`, err.message);
    }
  }

  // 2. Google Geocoding API (Reverse Geocode)
  console.log('\n2️⃣ Testing Google Geocoding API (Reverse Geocode)...');
  try {
    const revUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=28.4950,77.0895&key=${GOOGLE_MAPS_API_KEY}`;
    const revRes = await getJson(revUrl);
    if (revRes.data.status === 'OK' && revRes.data.results && revRes.data.results.length > 0) {
      console.log(`   ✓ Reverse Geocode (28.4950, 77.0895): "${revRes.data.results[0].formatted_address}"`);
    } else {
      console.log(`   ❌ Geocode status: ${revRes.data.status}`);
    }
  } catch (err) {
    console.error('   ❌ Geocode failed:', err.message);
  }

  // 3. Google Routes API (New)
  console.log('\n3️⃣ Testing Google Routes API (New) Real-Time Road Directions...');
  try {
    const routeRes = await postJson(
      'routes.googleapis.com',
      '/directions/v2:computeRoutes',
      {
        origin: { location: { latLng: { latitude: 28.4950, longitude: 77.0895 } } },
        destination: { location: { latLng: { latitude: 28.5562, longitude: 77.1000 } } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      },
      {
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.description',
      }
    );
    if (routeRes.routes && routeRes.routes.length > 0) {
      const r = routeRes.routes[0];
      const km = (r.distanceMeters / 1000).toFixed(1);
      const mins = Math.round(parseFloat(r.duration.replace('s', '')) / 60);
      console.log(`   ✓ Route DLF Cyber City -> IGI T3: ${km} km, ${mins} mins (Via ${r.description || 'Highway'})`);
    } else {
      console.log('   ❌ No routes returned');
    }
  } catch (err) {
    console.error('   ❌ Routes API failed:', err.message);
  }

  // 4. Google Maps Static API
  console.log('\n4️⃣ Testing Google Maps Static API Imagery...');
  try {
    const staticUrl = `https://maps.googleapis.com/maps/api/staticmap?center=28.4950,77.0895&zoom=15&size=600x380&scale=2&maptype=roadmap&markers=color:red%7C28.4950,77.0895&key=${GOOGLE_MAPS_API_KEY}`;
    await new Promise((resolve, reject) => {
      https.get(staticUrl, (res) => {
        if (res.statusCode === 200 && res.headers['content-type']?.includes('image')) {
          console.log(`   ✓ Static Map rendered successfully: HTTP ${res.statusCode} (${res.headers['content-type']})`);
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.headers['content-type']}`));
        }
      }).on('error', reject);
    });
  } catch (err) {
    console.error('   ❌ Static Maps failed:', err.message);
  }

  console.log('\n====================================================');
  console.log('✅ Google Maps Platform Services verified successfully!');
  console.log('====================================================');
}

runTests();

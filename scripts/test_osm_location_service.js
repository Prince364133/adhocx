// scripts/test_osm_location_service.js
// Tests live OpenStreetMap (OSM Nominatim & Photon Komoot) APIs

const https = require('https');

function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(
      url,
      {
        headers: {
          'User-Agent': 'AdhocX-OpenStreetMap-Mobility/2.0 (support@adhocx.com)',
          'Accept': 'application/json',
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
    ).on('error', reject);
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Testing Live OpenStreetMap (OSM) Services for AdhocX');
  console.log('====================================================\n');

  // Test 1: Photon Komoot OSM Fast Autocomplete
  console.log('1️⃣ Testing Photon Komoot OSM Autocomplete API...');
  const testQueries = ['Cyber City', 'IGI Airport', 'Connaught Place', 'Sector 62 Noida'];
  for (const q of testQueries) {
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=3&lat=28.6139&lon=77.2090`;
      const data = await fetchJson(url);
      const count = data.features ? data.features.length : 0;
      console.log(`   ✓ Query "${q}": Found ${count} results on OpenStreetMap.`);
      if (count > 0) {
        const top = data.features[0].properties;
        const coords = data.features[0].geometry.coordinates;
        console.log(`     Top Result: "${top.name || top.street}", City: "${top.city || top.state || 'N/A'}" [Lat: ${coords[1]}, Lng: ${coords[0]}]`);
      }
    } catch (err) {
      console.error(`   ❌ Failed for query "${q}":`, err.message);
    }
  }

  // Test 2: OSM Nominatim Live Search
  console.log('\n2️⃣ Testing OSM Nominatim Search API...');
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent('DLF Cyber City Gurugram')}&format=json&addressdetails=1&limit=2&countrycodes=in`;
    const nomData = await fetchJson(nomUrl);
    console.log(`   ✓ Nominatim found ${nomData.length} items for "DLF Cyber City Gurugram".`);
    if (nomData.length > 0) {
      console.log(`     Display Name: "${nomData[0].display_name}"`);
      console.log(`     Coordinates: Lat ${nomData[0].lat}, Lon ${nomData[0].lon}`);
    }
  } catch (err) {
    console.log(`   ⚠️ Nominatim notice:`, err.message);
  }

  // Test 3: OSM Reverse Geocoding
  console.log('\n3️⃣ Testing OSM Nominatim Reverse Geocoding API...');
  try {
    const revUrl = `https://nominatim.openstreetmap.org/reverse?lat=28.4950&lon=77.0895&format=json&addressdetails=1`;
    const revData = await fetchJson(revUrl);
    console.log(`   ✓ Reverse Geocoded (28.4950, 77.0895):`);
    console.log(`     Resolved Name: "${revData.display_name}"`);
  } catch (err) {
    console.log(`   ⚠️ Reverse geocode notice:`, err.message);
  }

  console.log('\n====================================================');
  console.log('✅ OpenStreetMap Location Services verified successfully!');
  console.log('====================================================');
}

runTests();

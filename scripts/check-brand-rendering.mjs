import http from 'http';

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function main() {
  const pages = ['/', '/vendors', '/drivers', '/blogs', '/terms', '/privacy'];
  for (const p of pages) {
    const res = await get('http://localhost:4322' + p);
    console.log(`Page: ${p} (Status: ${res.status})`);
    
    // Check header
    const hasHeaderLogo = res.body.includes('class="logo-text"') && res.body.includes('class="logo-accent"');
    console.log(`  Header logo formatted: ${hasHeaderLogo}`);
    
    // Check footer
    const hasFooterLogo = res.body.includes('footer-brand-logo') && res.body.includes('class="logo-text"') && res.body.includes('class="logo-accent"');
    console.log(`  Footer logo formatted: ${hasFooterLogo}`);

    // Check script
    const hasBrandScript = res.body.includes('brand-inline') || res.body.includes('AdhocX');
    console.log(`  Has Brand Script / Content: ${hasBrandScript}`);
  }
}

main().catch(console.error);


import http from 'http';

function checkPage(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function run() {
  const home = await checkPage('http://127.0.0.1:4321/');
  console.log('Home status:', home.status, 'body length:', home.body.length);
  
  const vendors = await checkPage('http://127.0.0.1:4321/vendors');
  console.log('Vendors status:', vendors.status, 'body length:', vendors.body.length);

  // Check critical sections on Home
  console.log('--- Home Page Checks ---');
  console.log('Hero section:', home.body.includes('id="hero"'));
  console.log('Why AdhocX section:', home.body.includes('id="why-adhocx"'));
  console.log('Governance section:', home.body.includes('id="governance"'));
  console.log('Stakeholders section:', home.body.includes('id="stakeholders"'));
  console.log('Employee app section:', home.body.includes('id="employee-app"'));
  console.log('Footer:', home.body.includes('id="site-footer"'));
  console.log('B2B Platform in header?', home.body.includes('<span class="logo-tag">B2B Platform</span>'));
  console.log('App Store in home?', home.body.includes('App Store'));
  console.log('Play Store in home?', home.body.includes('Google Play'));
  console.log('Certificate badges in home?', home.body.includes('9001/27001') || home.body.includes('GDPR'));

  // Check critical sections on Vendors
  console.log('\n--- Vendors Page Checks ---');
  console.log('Contrast table wrapper:', vendors.body.includes('contrast-table-wrapper'));
  console.log('Contrast table:', vendors.body.includes('contrast-table'));
  console.log('Stakeholders row grid:', vendors.body.includes('stakeholders-row-grid'));
  console.log('Stakeholders mini cards count:', (vendors.body.match(/stakeholder-mini-card/g) || []).length);
}

run().catch(console.error);

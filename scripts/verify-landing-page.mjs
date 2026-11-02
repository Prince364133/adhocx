import http from 'http';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function verify() {
  console.log('--- Verifying Landing Page on http://localhost:4322 ---');
  const res = await fetchPage('http://localhost:4322');
  console.log(`HTTP Status: ${res.status}`);

  if (res.status !== 200) {
    console.error('FAILED: Status is not 200');
    process.exit(1);
  }

  const checks = [
    { name: 'Section 1: Hero Section (#hero)', test: res.body.includes('id="hero"') },
    { name: 'Section 2: Why AdhocX (#why-adhocx)', test: res.body.includes('id="why-adhocx"') },
    { name: 'Section 3: Governance & Compliance (#governance)', test: res.body.includes('id="governance"') },
    { name: 'Section 4: Built for Every Stakeholder (#stakeholders)', test: res.body.includes('id="stakeholders"') },
    { name: 'Section 5: Employee App Section (#employee-app)', test: res.body.includes('id="employee-app"') },
    { name: 'Enterprise Footer (#site-footer)', test: res.body.includes('id="site-footer"') },
    
    // Brand & Header
    { name: 'B2B Platform badge removed from header', test: !res.body.includes('<span class="logo-tag">B2B Platform</span>') },
    
    // Store Buttons (App Store removed, Play Store kept)
    { name: 'Apple App Store button removed', test: !res.body.includes('App Store') },
    { name: 'Google Play buttons present', test: (res.body.match(/Google Play/g) || []).length >= 1 },
    
    // Certificate Badges removed
    { name: 'ISO 9001/27001 Certificate Badge removed', test: !res.body.includes('9001/27001') },
    { name: 'GDPR Certificate Badge removed', test: !res.body.includes('GDPR') },
    { name: 'Commercial Badge preserved', test: res.body.includes('100% Yellow-Plate') },
    
    // 5 Stakeholder Tabs
    { name: 'Tab 1: HR & Mobility', test: res.body.includes('data-tab="panel-hr"') && res.body.includes('id="panel-hr"') },
    { name: 'Tab 2: Travel & Admin Desk', test: res.body.includes('data-tab="panel-admin"') && res.body.includes('id="panel-admin"') },
    { name: 'Tab 3: Finance & CFO', test: res.body.includes('data-tab="panel-finance"') && res.body.includes('id="panel-finance"') },
    { name: 'Tab 4: Vendor Partners', test: res.body.includes('data-tab="panel-vendors"') && res.body.includes('id="panel-vendors"') },
    { name: 'Tab 5: Mid-Market Ops', test: res.body.includes('data-tab="panel-ops"') && res.body.includes('id="panel-ops"') },

    // Brand Integrity (Zero Competitor Names)
    { name: 'Zero mention of competitor "fletooz"', test: !res.body.toLowerCase().includes('fletooz') },
    { name: 'Zero mention of competitor "taski"', test: !res.body.toLowerCase().includes('taski') },
  ];

  let allPassed = true;
  checks.forEach(c => {
    if (c.test) {
      console.log(`[PASS] ${c.name}`);
    } else {
      console.error(`[FAIL] ${c.name}`);
      allPassed = false;
    }
  });

  if (!allPassed) {
    process.exit(1);
  } else {
    console.log('\nAll landing page sections, elements, and brand integrity tests PASSED successfully!');
  }
}

verify().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});


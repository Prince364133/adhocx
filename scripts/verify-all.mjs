import fs from 'fs';

const checks = [];

function assert(description, condition, details = '') {
  checks.push({ description, pass: Boolean(condition), details });
}

// 1. Header checks
const headerAstro = fs.readFileSync('apps/marketing/src/components/Header.astro', 'utf8');
assert('Header: B2B PLATFORM badge removed', !headerAstro.includes('B2B PLATFORM'));
assert('Header: Driver Portal button removed', !headerAstro.includes('Driver Portal') && !headerAstro.includes('btn-header-driver'));
assert('Header: Book a demo CTA present', headerAstro.includes('Book a demo'));
assert('Header: Invisible hover bridge present', headerAstro.includes('mega-menu-panel::before') || fs.readFileSync('apps/marketing/src/styles/global.css', 'utf8').includes('.mega-menu-panel::before'));

// 2. Index page checks
const indexAstro = fs.readFileSync('apps/marketing/src/pages/index.astro', 'utf8');
assert('Homepage: Hero pill badge removed', !indexAstro.includes('Corporate ground transport software + supplier network'));
assert('Homepage: Light theme governance container', indexAstro.includes('governance-dark-container') && fs.readFileSync('apps/marketing/src/styles/global.css', 'utf8').includes('background: #FFFFFF') || fs.readFileSync('apps/marketing/src/styles/global.css', 'utf8').includes('#F8FAFC'));
assert('Homepage: No Apple App Store button', !indexAstro.includes('apple.com') && !indexAstro.includes('App Store'));
assert('Homepage: Google Play button present', indexAstro.includes('Google Play'));
assert('Homepage: Certificate badges removed', !indexAstro.includes('ISO 27001') && !indexAstro.includes('GDPR Certified'));
assert('Homepage: Zero Karnataka references', !indexAstro.toLowerCase().includes('karnataka'));
assert('Homepage: Zero Bengaluru references', !indexAstro.toLowerCase().includes('bengaluru'));

// 3. Vendors page checks
const vendorsAstro = fs.readFileSync('apps/marketing/src/pages/vendors.astro', 'utf8');
assert('Vendors: Blue hero tag boxes removed', !vendorsAstro.includes('Enterprise Transport Desk Solution') && !vendorsAstro.includes('hero-tag'));
assert('Vendors: Contrast table wrapper present', vendorsAstro.includes('contrast-table-wrapper'));
assert('Vendors: 4-column single row stakeholders grid', vendorsAstro.includes('stakeholders-row-grid'));
assert('Vendors: Zero Karnataka references', !vendorsAstro.toLowerCase().includes('karnataka'));
assert('Vendors: Zero Bengaluru references', !vendorsAstro.toLowerCase().includes('bengaluru'));

// 4. EnterpriseLeadForm checks
const leadForm = fs.readFileSync('apps/marketing/src/components/EnterpriseLeadForm.tsx', 'utf8');
assert('LeadForm: Blue setup badge removed', !leadForm.includes('Enterprise Fleet Setup'));
assert('LeadForm: Default city is Telangana', leadForm.includes("city: 'Telangana (Hyderabad Tech Corridors)'"));
assert('LeadForm: Zero Karnataka references', !leadForm.toLowerCase().includes('karnataka'));

// 5. Drivers page checks
const driversAstro = fs.readFileSync('apps/marketing/src/pages/drivers.astro', 'utf8');
assert('Drivers: Zero Karnataka references', !driversAstro.toLowerCase().includes('karnataka'));
assert('Drivers: Zero Bengaluru references', !driversAstro.toLowerCase().includes('bengaluru'));
assert('Drivers: ₹2,000 Bonus preserved', driversAstro.includes('₹2,000'));

// 6. Blogs & Terms
const blogsAstro = fs.readFileSync('apps/marketing/src/pages/blogs.astro', 'utf8');
const termsAstro = fs.readFileSync('apps/marketing/src/pages/terms.astro', 'utf8');
assert('Blogs: Zero Karnataka references', !blogsAstro.toLowerCase().includes('karnataka'));
assert('Terms: Zero Karnataka references', !termsAstro.toLowerCase().includes('karnataka'));

// 7. Footer
const footerAstro = fs.readFileSync('apps/marketing/src/components/Footer.astro', 'utf8');
assert('Footer: Zero Karnataka references', !footerAstro.toLowerCase().includes('karnataka'));
assert('Footer: No App Store button', !footerAstro.includes('App Store'));

console.log('=============================================');
console.log('      ADHOCX FULL AUDIT & VERIFICATION       ');
console.log('=============================================');
let passed = 0;
for (const c of checks) {
  if (c.pass) {
    console.log(`[PASS] ${c.description}`);
    passed++;
  } else {
    console.error(`[FAIL] ${c.description} - ${c.details}`);
  }
}
console.log('=============================================');
console.log(`Results: ${passed} / ${checks.length} tests passed.`);
console.log('=============================================');

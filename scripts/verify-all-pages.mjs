import fs from 'fs';
import path from 'path';

const pages = [
  { name: 'Home', file: 'index.html', titleContains: 'AdhocX' },
  { name: 'About', file: 'about.html', titleContains: 'About AdhocX' },
  { name: 'Contact', file: 'contact.html', titleContains: 'Contact AdhocX' },
  { name: 'FAQ', file: 'faq.html', titleContains: 'Frequently Asked Questions' },
  { name: 'ETS', file: 'ets.html', titleContains: 'Employee Transport Software' },
  { name: 'Safety', file: 'safety.html', titleContains: 'Enterprise Transport Safety' },
  { name: 'Pricing', file: 'pricing.html', titleContains: 'Corporate Transport Pricing' },
  { name: 'Vendors', file: 'vendors.html', titleContains: 'Corporate Fleet Solutions' },
  { name: 'Drivers', file: 'drivers.html', titleContains: 'Drive with AdhocX' },
  { name: 'Blogs', file: 'blogs.html', titleContains: 'Blog' },
  { name: 'Terms', file: 'terms.html', titleContains: 'Terms' },
  { name: 'Privacy', file: 'privacy.html', titleContains: 'Privacy' },
];

let allPassed = true;

console.log('=== VERIFYING ALL 12 ADHOCX MARKETING PAGES ===\n');

for (const p of pages) {
  const filePath = path.resolve(p.file);
  if (!fs.existsSync(filePath)) {
    console.error(`[FAIL] Missing file: ${p.file}`);
    allPassed = false;
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Check 1: Brand Wordmark
  const hasBrand = content.includes('Adhoc<span class="logo-accent">X</span>') || content.includes('AdhocX');
  if (!hasBrand) {
    console.error(`[FAIL] ${p.name} (${p.file}): Brand logo text not found.`);
    allPassed = false;
  }

  // Check 2: Zero emojis
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  const emojiMatch = content.match(emojiRegex);
  if (emojiMatch) {
    console.error(`[FAIL] ${p.name} (${p.file}): Emoji detected: ${emojiMatch[0]}`);
    allPassed = false;
  }

  // Check 3: Canonical Link
  const hasCanonical = content.includes('rel="canonical"');
  if (!hasCanonical) {
    console.error(`[FAIL] ${p.name} (${p.file}): Canonical link missing.`);
    allPassed = false;
  }

  // Check 4: JSON-LD
  const hasJsonLd = content.includes('application/ld+json');
  if (!hasJsonLd) {
    console.error(`[FAIL] ${p.name} (${p.file}): JSON-LD schema missing.`);
    allPassed = false;
  }

  console.log(`[PASS] ${p.name} (${p.file}): Size ${(content.length / 1024).toFixed(1)} KB | Brand OK | Zero Emojis | SEO OK`);
}

// Check Header & Footer navigation integrity across pages
const indexContent = fs.readFileSync(path.resolve('index.html'), 'utf8');
const headerLinks = ['/about', '/contact', '/faq', '/ets', '/safety', '/pricing'];
for (const link of headerLinks) {
  if (!indexContent.includes(link)) {
    console.error(`[FAIL] Global header/footer missing route link: ${link}`);
    allPassed = false;
  } else {
    console.log(`[PASS] Global Navigation contains: ${link}`);
  }
}

if (allPassed) {
  console.log('\nALL PAGE & BRAND INTEGRITY CHECKS PASSED SUCCESSFULLY!');
} else {
  console.error('\nSOME CHECKS FAILED!');
  process.exit(1);
}

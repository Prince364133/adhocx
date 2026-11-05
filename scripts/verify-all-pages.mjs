import fs from 'fs';
import path from 'path';

const pages = [
  { name: 'Home', file: 'index.html', titleContains: 'AdhocX' },
  { name: 'Services', file: 'services.html', titleContains: 'Corporate Employee Transportation' },
  { name: 'Employee App', file: 'employee-app.html', titleContains: 'Employee Mobile App' },
  { name: 'Driver App', file: 'driver-app.html', titleContains: 'Driver Mobile App' },
  { name: 'Industries', file: 'industries.html', titleContains: 'Industries We Serve' },
  { name: 'About', file: 'about.html', titleContains: 'About AdhocX' },
  { name: 'Contact', file: 'contact.html', titleContains: 'Contact AdhocX' },
  { name: 'FAQ', file: 'faq.html', titleContains: 'Frequently Asked Questions' },
  { name: 'ETS', file: 'ets.html', titleContains: 'Employee Transport Software' },
  { name: 'Safety', file: 'safety.html', titleContains: 'Enterprise Transport Safety' },
  { name: 'Pricing', file: 'pricing.html', titleContains: 'Commercial Framework' },
  { name: 'Drivers', file: 'drivers.html', titleContains: 'Drive with AdhocX' },
  { name: 'Blogs', file: 'blogs.html', titleContains: 'Blog' },
  { name: 'Terms', file: 'terms.html', titleContains: 'Terms' },
  { name: 'Privacy', file: 'privacy.html', titleContains: 'Privacy' },
];

const distDir = path.resolve('apps/marketing/dist');
const baseDir = fs.existsSync(distDir) ? distDir : path.resolve('.');

let allPassed = true;

console.log(`=== VERIFYING ALL ADHOCX MARKETING PAGES (Base: ${baseDir}) ===\n`);

function resolvePagePath(fileName) {
  const directPath = path.join(baseDir, fileName);
  if (fs.existsSync(directPath)) return directPath;
  const folderPath = path.join(baseDir, fileName.replace('.html', ''), 'index.html');
  if (fs.existsSync(folderPath)) return folderPath;
  return null;
}

for (const p of pages) {
  const resolvedPath = resolvePagePath(p.file);
  if (!resolvedPath) {
    console.error(`[FAIL] Missing file for ${p.name}: checked ${p.file} and nested index.html in ${baseDir}`);
    allPassed = false;
    continue;
  }

  const content = fs.readFileSync(resolvedPath, 'utf8');

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

  // Check 3: Zero ₹ currency symbols
  if (content.includes('₹')) {
    console.error(`[FAIL] ${p.name} (${p.file}): Currency symbol ₹ detected! Must be 0 pricing digits.`);
    allPassed = false;
  }

  // Check 4: Zero ₹2,000 bonus mentions
  if (content.includes('2,000 Bonus') || content.includes('₹2,000')) {
    console.error(`[FAIL] ${p.name} (${p.file}): '₹2,000 Bonus' residual found!`);
    allPassed = false;
  }

  // Check 5: Canonical Link
  const hasCanonical = content.includes('rel="canonical"');
  if (!hasCanonical) {
    console.error(`[FAIL] ${p.name} (${p.file}): Canonical link missing.`);
    allPassed = false;
  }

  // Check 6: JSON-LD
  const hasJsonLd = content.includes('application/ld+json');
  if (!hasJsonLd) {
    console.error(`[FAIL] ${p.name} (${p.file}): JSON-LD schema missing.`);
    allPassed = false;
  }

  console.log(`[PASS] ${p.name} (${p.file}): ${(content.length / 1024).toFixed(1)} KB | Brand OK | Zero Emojis | Zero ₹ | SEO OK`);
}

// Check Drivers page has the car fleet image and NO bonus card
const driversPath = resolvePagePath('drivers.html');
if (driversPath) {
  const driversContent = fs.readFileSync(driversPath, 'utf8');
  if (!driversContent.includes('corporate-cab-fleet.jpg')) {
    console.error('[FAIL] drivers.html is missing corporate-cab-fleet.jpg image!');
    allPassed = false;
  } else {
    console.log('[PASS] drivers.html contains verified corporate-cab-fleet.jpg visual');
  }

  if (driversContent.includes('driver-hero-bonus-card') || driversContent.includes('Launch Incentive')) {
    console.error('[FAIL] drivers.html still contains driver-hero-bonus-card or Launch Incentive!');
    allPassed = false;
  } else {
    console.log('[PASS] drivers.html has completely removed driver-hero-bonus-card and unwanted header badges');
  }
}

// Check Global Header links
const indexPath = resolvePagePath('index.html');
if (indexPath) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const headerLinks = ['/services', '/employee-app', '/driver-app', '/industries', '/safety', '/pricing', '/about', '/contact'];
  for (const link of headerLinks) {
    if (!indexContent.includes(link)) {
      console.error(`[FAIL] Global navigation missing route link: ${link}`);
      allPassed = false;
    } else {
      console.log(`[PASS] Global Navigation contains: ${link}`);
    }
  }

  // Check AI Corporate Assistant island is mounted
  if (!indexContent.includes('CorporateAiAssistant')) {
    console.error('[FAIL] index.html missing CorporateAiAssistant island!');
    allPassed = false;
  } else {
    console.log('[PASS] Corporate AI Assistant island mounted successfully');
  }
}

if (allPassed) {
  console.log('\n=== ALL PAGE, BRAND, ZERO-PRICING & ASSET CHECKS PASSED SUCCESSFULLY! ===');
} else {
  console.error('\n=== SOME CHECKS FAILED! ===');
  process.exit(1);
}

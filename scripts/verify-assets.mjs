import fs from 'fs';
import path from 'path';

const htmlFiles = [
  'index.html',
  'vendors.html',
  'drivers.html',
  'blogs.html',
  'terms.html',
  'privacy.html'
];

let errors = 0;

for (const htmlFile of htmlFiles) {
  const content = fs.readFileSync(htmlFile, 'utf8');
  
  // Find script tags
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
  let match;
  while ((match = scriptRegex.exec(content)) !== null) {
    const src = match[1];
    if (src.startsWith('http')) continue;
    const cleanPath = src.replace(/^\//, '');
    if (!fs.existsSync(cleanPath)) {
      console.error(`[FAIL] ${htmlFile}: Missing script ${cleanPath}`);
      errors++;
    }
  }

  // Find stylesheet links
  const cssRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g;
  while ((match = cssRegex.exec(content)) !== null) {
    const href = match[1];
    if (href.startsWith('http')) continue;
    const cleanPath = href.replace(/^\//, '');
    if (!fs.existsSync(cleanPath)) {
      console.error(`[FAIL] ${htmlFile}: Missing css ${cleanPath}`);
      errors++;
    }
  }
}

if (errors === 0) {
  console.log('✓ All asset references across all 6 HTML files exist and are verified!');
} else {
  console.error(`Found ${errors} missing asset errors.`);
}

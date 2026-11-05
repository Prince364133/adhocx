import fs from 'fs';
import path from 'path';

const distDir = path.resolve('apps/marketing/dist');
const baseDir = fs.existsSync(distDir) ? distDir : path.resolve('.');

const htmlFiles = [
  'index.html',
  'vendors.html',
  'drivers.html',
  'blogs.html',
  'terms.html',
  'privacy.html'
];

let errors = 0;

function resolvePagePath(fileName) {
  const directPath = path.join(baseDir, fileName);
  if (fs.existsSync(directPath)) return directPath;
  const folderPath = path.join(baseDir, fileName.replace('.html', ''), 'index.html');
  if (fs.existsSync(folderPath)) return folderPath;
  return null;
}

for (const htmlFile of htmlFiles) {
  const resolvedHtmlPath = resolvePagePath(htmlFile);
  if (!resolvedHtmlPath) {
    console.error(`[FAIL] ${htmlFile}: File not found in ${baseDir}`);
    errors++;
    continue;
  }

  const content = fs.readFileSync(resolvedHtmlPath, 'utf8');
  
  // Find script tags
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
  let match;
  while ((match = scriptRegex.exec(content)) !== null) {
    const src = match[1];
    if (src.startsWith('http')) continue;
    const cleanPath = src.replace(/^\//, '');
    const assetPath = path.join(baseDir, cleanPath);
    if (!fs.existsSync(assetPath) && !fs.existsSync(path.resolve(cleanPath))) {
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
    const assetPath = path.join(baseDir, cleanPath);
    if (!fs.existsSync(assetPath) && !fs.existsSync(path.resolve(cleanPath))) {
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

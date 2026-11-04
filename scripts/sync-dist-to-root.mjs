import fs from 'fs';
import path from 'path';

const distDir = path.resolve('apps/marketing/dist');
const rootDir = path.resolve('.');

if (!fs.existsSync(distDir)) {
  console.error('Dist directory does not exist. Run astro build first.');
  process.exit(1);
}

// 1. Sync _astro assets
const distAstro = path.join(distDir, '_astro');
const rootAstro = path.join(rootDir, '_astro');
if (fs.existsSync(distAstro)) {
  if (!fs.existsSync(rootAstro)) fs.mkdirSync(rootAstro, { recursive: true });
  const files = fs.readdirSync(distAstro);
  for (const file of files) {
    fs.copyFileSync(path.join(distAstro, file), path.join(rootAstro, file));
  }
  console.log(`Copied ${files.length} assets from _astro.`);
}

// 2. Sync index.html
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  fs.copyFileSync(path.join(distDir, 'index.html'), path.join(rootDir, 'index.html'));
  console.log('Synced root index.html');
}

// 3. Pages mapping
const pages = [
  'about',
  'services',
  'employee-app',
  'driver-app',
  'industries',
  'safety',
  'pricing',
  'contact',
  'faq',
  'ets',
  'drivers',
  'vendors',
  'blogs',
  'terms',
  'privacy'
];

for (const page of pages) {
  const pageDistDir = path.join(distDir, page);
  const pageIndexHtml = path.join(pageDistDir, 'index.html');
  if (fs.existsSync(pageIndexHtml)) {
    // Copy to root directory as folder/index.html
    const targetDir = path.join(rootDir, page);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(pageIndexHtml, path.join(targetDir, 'index.html'));

    // Copy to root directory as page.html for static servers without directory indexing
    fs.copyFileSync(pageIndexHtml, path.join(rootDir, `${page}.html`));
    console.log(`Synced ${page} (both /${page}/index.html and /${page}.html)`);
  }
}

console.log('Static distribution sync complete.');

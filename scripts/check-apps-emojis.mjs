import fs from 'fs';
import path from 'path';

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA70}-\u{1FAFF}]/u;

function checkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    if (['node_modules', '.git', '.astro', 'dist', '.next', '_astro', '.dart_tool', 'build'].includes(item.name)) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      checkDir(full);
    } else if (/\.(astro|tsx|jsx|ts|js|html|css|dart|json|yaml)$/.test(item.name)) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const m = line.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA70}-\u{1FAFF}]/ug);
        if (m) {
          console.log(`${full}:${idx+1} [${m.join(' ')}] -> ${line.trim()}`);
        }
      });
    }
  }
}

console.log('=== APPS/MARKETING ===');
checkDir('apps/marketing/src');

console.log('\n=== APPS/ADMIN ===');
checkDir('apps/admin/src');

console.log('\n=== APPS/MOBILE/LIB ===');
checkDir('apps/mobile/lib');

console.log('\n=== ROOT HTML FILES ===');
['index.html', 'vendors.html', 'drivers.html', 'blogs.html', 'terms.html', 'privacy.html'].forEach(f => {
  if (fs.existsSync(f)) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, idx) => {
      const m = line.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA70}-\u{1FAFF}]/ug);
      if (m) {
        console.log(`${f}:${idx+1} [${m.join(' ')}] -> ${line.trim()}`);
      }
    });
  }
});

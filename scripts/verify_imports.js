const fs = require('fs');
const path = require('path');

let errors = 0;
function checkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      checkDir(full);
    } else if (f.endsWith('.dart')) {
      const content = fs.readFileSync(full, 'utf8');
      const importRegex = /import\s+['"](\.[^'"]+)['"];/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const resolved = path.resolve(dir, importPath);
        if (!fs.existsSync(resolved)) {
          console.error('BROKEN IMPORT in', full, '->', importPath);
          errors++;
        }
      }
    }
  }
}

checkDir('apps/mobile/lib');
console.log('Broken import check completed. Errors:', errors);

const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.dart')) {
      results.push(file);
    }
  });
  return results;
}

const mobileDir = path.join(__dirname, '..', 'apps', 'mobile', 'lib');
const files = walk(mobileDir);

let fixed = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  content = content.replace(/boxShadow:\s*const\s*\[/g, 'boxShadow: [');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    fixed++;
    console.log(`Fixed boxShadow in: ${path.relative(mobileDir, file)}`);
  }
});

console.log(`Updated ${fixed} files.`);

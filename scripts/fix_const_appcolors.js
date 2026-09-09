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

let fixedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace `const AppColors.` with `AppColors.`
  content = content.replace(/const\s+AppColors\./g, 'AppColors.');

  // Replace invalid const BoxShadow or const BoxDecoration with withValues
  content = content.replace(/const\s+BoxShadow\s*\(\s*color:\s*Colors\.black\.withValues/g, 'BoxShadow(color: Colors.black.withValues');
  content = content.replace(/const\s+BoxShadow\s*\(\s*color:\s*AppColors\./g, 'BoxShadow(color: AppColors.');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    fixedFiles++;
    console.log(`Fixed const AppColors in: ${path.relative(mobileDir, file)}`);
  }
});

console.log(`Fixed ${fixedFiles} files!`);

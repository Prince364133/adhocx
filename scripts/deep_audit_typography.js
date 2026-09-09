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

console.log(`Auditing typography in ${files.length} Dart files...`);

let rawTextStyleCount = 0;
const rawTextStyleFiles = {};

files.forEach(f => {
  if (f.endsWith('app_typography.dart') || f.endsWith('app_theme.dart')) return;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, idx) => {
    if (line.includes('TextStyle(')) {
      issues.push({ lineNum: idx + 1, line: line.trim() });
      rawTextStyleCount++;
    }
  });

  if (issues.length > 0) {
    rawTextStyleFiles[f] = issues;
  }
});

console.log(`Found ${rawTextStyleCount} TextStyle usages across ${Object.keys(rawTextStyleFiles).length} files.`);
for (const [file, issues] of Object.entries(rawTextStyleFiles)) {
  console.log(`\n📄 ${path.relative(mobileDir, file)} (${issues.length}):`);
  issues.slice(0, 3).forEach(iss => console.log(`  Line ${iss.lineNum}: ${iss.line}`));
}

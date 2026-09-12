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

console.log(`Found ${files.length} dart files to audit.`);

const disallowedColorsRegex = /Colors\.(amber|yellow|blue|red|green|orange|purple|grey|indigo|teal|cyan|pink|lime|blueGrey|deepPurple|lightBlue|lightGreen|deepOrange|amberAccent|blueAccent|greenAccent|redAccent|purpleAccent|orangeAccent|yellowAccent)/g;
const directHexRegex = /Color\(0x[0-9a-fA-F]+\)/g;

let totalIssues = 0;
const issuesByFile = {};

files.forEach(f => {
  if (f.endsWith('app_colors.dart')) return;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  const fileIssues = [];

  lines.forEach((line, idx) => {
    let match;
    while ((match = disallowedColorsRegex.exec(line)) !== null) {
      fileIssues.push({ lineNum: idx + 1, type: 'Material Color', match: match[0], line: line.trim() });
      totalIssues++;
    }
    while ((match = directHexRegex.exec(line)) !== null) {
      fileIssues.push({ lineNum: idx + 1, type: 'Direct Hex Color', match: match[0], line: line.trim() });
      totalIssues++;
    }
  });

  if (fileIssues.length > 0) {
    issuesByFile[f] = fileIssues;
  }
});

console.log(`Total non-standard color issues: ${totalIssues} across ${Object.keys(issuesByFile).length} files.`);
for (const [file, issues] of Object.entries(issuesByFile)) {
  console.log(`\n📄 ${path.relative(mobileDir, file)} (${issues.length} issues):`);
  issues.slice(0, 5).forEach(iss => {
    console.log(`  [Line ${iss.lineNum}] ${iss.type}: ${iss.match} -> ${iss.line}`);
  });
  if (issues.length > 5) {
    console.log(`  ... and ${issues.length - 5} more`);
  }
}

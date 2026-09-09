const fs = require('fs');
const path = require('path');

const userDir = path.resolve(__dirname, '../apps/mobile/lib/user');

function getAllDartFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllDartFiles(fullPath));
    } else if (file.endsWith('.dart')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = getAllDartFiles(userDir);
let changedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  // Replace const Color(0xFF6C5CE7) / Color(0xFF6C5CE7)
  content = content.replace(/const Color\(0xFF6C5CE7\)/g, 'AppColors.primary');
  content = content.replace(/Color\(0xFF6C5CE7\)/g, 'AppColors.primary');

  // Replace Colors.orange with AppColors.warning where applicable
  content = content.replace(/Colors\.orange\.withValues/g, 'AppColors.warning.withValues');
  content = content.replace(/Colors\.orange\b/g, 'AppColors.warning');

  // Replace Colors.red with AppColors.error
  content = content.replace(/Colors\.red\.withValues/g, 'AppColors.error.withValues');
  content = content.replace(/Colors\.red\b/g, 'AppColors.error');

  // Fix any invalid const AppColors.primary
  content = content.replace(/const AppColors\.primary/g, 'AppColors.primary');
  content = content.replace(/const AppColors\.warning/g, 'AppColors.warning');
  content = content.replace(/const AppColors\.error/g, 'AppColors.error');

  // Ensure AppColors is imported if used
  if (content.includes('AppColors.') && !content.includes('app_colors.dart')) {
    // Determine relative path to app_colors.dart
    const relToShared = path.relative(path.dirname(file), path.resolve(__dirname, '../apps/mobile/lib/shared/theme/app_colors.dart')).replace(/\\/g, '/');
    content = `import '${relToShared}';\n` + content;
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    changedCount++;
    console.log(`Updated: ${path.relative(userDir, file)}`);
  }
}

console.log(`\nSuccessfully unified tokens across ${changedCount} user screen files.`);

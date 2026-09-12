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

console.log(`Auditing and standardizing ${files.length} Dart files...`);

let modifiedFiles = 0;

files.forEach(file => {
  if (file.endsWith('app_colors.dart')) return;

  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Direct Hex Color Replacements
  content = content.replace(/const\s+Color\(0xFFFF6200\)/g, 'AppColors.brandOrange');
  content = content.replace(/Color\(0xFFFF6200\)/g, 'AppColors.brandOrange');
  content = content.replace(/const\s+Color\(0xFF4285F4\)/g, 'AppColors.googleBlue');
  content = content.replace(/Color\(0xFF4285F4\)/g, 'AppColors.googleBlue');
  content = content.replace(/const\s+Color\(0xFF34A853\)/g, 'AppColors.googleGreen');
  content = content.replace(/Color\(0xFF34A853\)/g, 'AppColors.googleGreen');
  content = content.replace(/const\s+Color\(0xFFFBBC05\)/g, 'AppColors.googleYellow');
  content = content.replace(/Color\(0xFFFBBC05\)/g, 'AppColors.googleYellow');
  content = content.replace(/const\s+Color\(0xFFEA4335\)/g, 'AppColors.googleRed');
  content = content.replace(/Color\(0xFFEA4335\)/g, 'AppColors.googleRed');
  content = content.replace(/Color\(0xFFA29BFE\)/g, 'AppColors.primaryLight');
  content = content.replace(/const\s+Color\(0xFF1E2430\)/g, 'AppColors.surfaceElevatedDark');
  content = content.replace(/Color\(0xFF1E2430\)/g, 'AppColors.surfaceElevatedDark');
  content = content.replace(/const\s+Color\(0xFF0d1117\)/g, 'AppColors.bgDark');
  content = content.replace(/Color\(0xFF0d1117\)/g, 'AppColors.bgDark');
  content = content.replace(/Color\(0x08000000\)/g, 'Colors.black.withValues(alpha: 0.04)');
  content = content.replace(/Color\(0x06000000\)/g, 'Colors.black.withValues(alpha: 0.03)');

  // Material Palette Token Replacements
  content = content.replace(/Colors\.amber/g, 'AppColors.starAmber');
  content = content.replace(/Colors\.greenAccent/g, 'AppColors.accentGreen');
  content = content.replace(/Colors\.purple/g, 'AppColors.accentPurple');
  content = content.replace(/Colors\.blueGrey\[50\]/g, 'AppColors.slate100');
  content = content.replace(/Colors\.grey\[800\]/g, 'AppColors.slate800');
  content = content.replace(/Colors\.grey\[700\]/g, 'AppColors.slate700');
  content = content.replace(/Colors\.grey\[600\]/g, 'AppColors.slate600');
  content = content.replace(/Colors\.grey\[400\]/g, 'AppColors.slate400');
  content = content.replace(/Colors\.grey\[300\]/g, 'AppColors.slate300');
  content = content.replace(/Colors\.grey\[200\]/g, 'AppColors.slate200');
  content = content.replace(/Colors\.grey\.shade200/g, 'AppColors.slate200');
  content = content.replace(/Colors\.grey\.shade100/g, 'AppColors.slate100');
  content = content.replace(/Colors\.grey/g, 'AppColors.slate400');

  // Ensure AppColors is imported if AppColors is used and not imported
  if (content.includes('AppColors.') && !content.includes('app_colors.dart') && !content.includes("import 'package:adhocx/theme/app_theme.dart'")) {
    // Add import at the top
    content = "import 'package:adhocx/shared/theme/app_colors.dart';\n" + content;
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedFiles++;
    console.log(`Standardized: ${path.relative(mobileDir, file)}`);
  }
});

console.log(`\nSuccessfully standardized ${modifiedFiles} Dart files!`);

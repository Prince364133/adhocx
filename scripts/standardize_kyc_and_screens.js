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

let count = 0;

files.forEach(file => {
  if (file.endsWith('app_colors.dart')) return;
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Specific hardcoded hexes
  content = content.replace(/const\s+Color\(0xFF141414\)/g, 'AppColors.surfaceElevatedDark');
  content = content.replace(/Color\(0xFF141414\)/g, 'AppColors.surfaceElevatedDark');
  content = content.replace(/const\s+Color\(0xFF111111\)/g, 'AppColors.surfaceDark');
  content = content.replace(/Color\(0xFF111111\)/g, 'AppColors.surfaceDark');
  content = content.replace(/const\s+Color\(0xFF1a0a00\)/g, 'AppColors.bgDark');
  content = content.replace(/Color\(0xFF1a0a00\)/g, 'AppColors.bgDark');
  content = content.replace(/const\s+Color\(0xFF1a2332\)/g, 'AppColors.borderDark');
  content = content.replace(/Color\(0xFF1a2332\)/g, 'AppColors.borderDark');
  content = content.replace(/Color\(0xFFfff7ed\)/g, 'AppColors.warningContainer');
  content = content.replace(/Color\(0xFFffedd5\)/g, 'AppColors.warningContainer');
  content = content.replace(/Color\(0xFFc2410c\)/g, 'AppColors.warningText');
  content = content.replace(/Color\(0xFFea580c\)/g, 'AppColors.warning');
  content = content.replace(/Color\(0xFFf97316\)/g, 'AppColors.warning');
  content = content.replace(/Color\(0xFF8b5cf6\)/g, 'AppColors.accentPurple');
  content = content.replace(/Color\(0xFF8B5CF6\)/g, 'AppColors.accentPurple');
  content = content.replace(/Color\(0xFFEC4899\)/g, 'AppColors.primaryLight');
  content = content.replace(/Color\(0xFF6347F9\)/g, 'AppColors.primaryGradientStart');
  content = content.replace(/Color\(0xFF4328E0\)/g, 'AppColors.primaryGradientEnd');
  content = content.replace(/Color\(0xFFF87171\)/g, 'AppColors.error');
  content = content.replace(/Color\(0xFFFCA5A5\)/g, 'AppColors.errorContainer');
  content = content.replace(/Color\(0xFF064e3b\)/g, 'AppColors.successDarkContainer');
  content = content.replace(/Color\(0xFF6ee7b7\)/g, 'AppColors.accentGreen');
  content = content.replace(/Color\(0xFFa29bfe\)/g, 'AppColors.primaryLight');
  content = content.replace(/Color\(0x1a000000\)/g, 'Colors.black.withValues(alpha: 0.1)');
  content = content.replace(/const\s+Color\(0xFF000000\)/g, 'Colors.black');
  content = content.replace(/Color\(0xFF000000\)/g, 'Colors.black');
  content = content.replace(/const\s+Color\(0xFFFFFFFF\)/g, 'Colors.white');
  content = content.replace(/Color\(0xFFFFFFFF\)/g, 'Colors.white');

  // Generic Material green / red / blue replacements in widgets
  content = content.replace(/Colors\.green\.withValues\(alpha:\s*0\.15\)/g, 'AppColors.successContainer');
  content = content.replace(/Colors\.green\.withValues\(alpha:\s*0\.1\)/g, 'AppColors.successContainer');
  content = content.replace(/Colors\.redAccent/g, 'AppColors.error');
  content = content.replace(/Colors\.red\.withValues\(alpha:\s*0\.15\)/g, 'AppColors.errorContainer');
  content = content.replace(/Colors\.red/g, 'AppColors.error');
  content = content.replace(/Colors\.green/g, 'AppColors.success');
  content = content.replace(/Colors\.blue\.withValues\(alpha:\s*0\.15\)/g, 'AppColors.infoContainer');
  content = content.replace(/Colors\.blue/g, 'AppColors.info');

  // Ensure AppColors is imported if AppColors is used and not imported
  if (content.includes('AppColors.') && !content.includes('app_colors.dart') && !content.includes("import 'package:adhocx/theme/app_theme.dart'")) {
    content = "import 'package:adhocx/shared/theme/app_colors.dart';\n" + content;
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log(`Standardized: ${path.relative(mobileDir, file)}`);
  }
});

console.log(`Updated ${count} additional files!`);

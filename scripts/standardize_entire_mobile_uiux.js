const fs = require('fs');
const path = require('path');

const mobileLibDir = path.resolve(__dirname, '../apps/mobile/lib');

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

const colorReplacements = [
  // Primary & Accent Brand
  { pattern: /const Color\(0xFF6366[fF]1\)/g, replacement: 'AppColors.primary' },
  { pattern: /Color\(0xFF6366[fF]1\)/g, replacement: 'AppColors.primary' },
  { pattern: /const Color\(0xFF4[fF]46[eE]5\)/g, replacement: 'AppColors.primaryHover' },
  { pattern: /Color\(0xFF4[fF]46[eE]5\)/g, replacement: 'AppColors.primaryHover' },
  { pattern: /const Color\(0xFF6[cC]5[cC][eE]7\)/g, replacement: 'AppColors.primary' },
  { pattern: /Color\(0xFF6[cC]5[cC][eE]7\)/g, replacement: 'AppColors.primary' },
  { pattern: /const Color\(0xFF5[bB]42[fF]3\)/g, replacement: 'AppColors.primary' },
  { pattern: /Color\(0xFF5[bB]42[fF]3\)/g, replacement: 'AppColors.primary' },

  // Success
  { pattern: /const Color\(0xFF10[bB]981\)/g, replacement: 'AppColors.success' },
  { pattern: /Color\(0xFF10[bB]981\)/g, replacement: 'AppColors.success' },
  { pattern: /const Color\(0xFF22[cC]55[eE]\)/g, replacement: 'AppColors.success' },
  { pattern: /Color\(0xFF22[cC]55[eE]\)/g, replacement: 'AppColors.success' },
  { pattern: /const Color\(0xFF16[aA]34[aA]\)/g, replacement: 'AppColors.success' },
  { pattern: /Color\(0xFF16[aA]34[aA]\)/g, replacement: 'AppColors.success' },

  // Warning
  { pattern: /const Color\(0xFF[fF]59[eE]0[bB]\)/g, replacement: 'AppColors.warning' },
  { pattern: /Color\(0xFF[fF]59[eE]0[bB]\)/g, replacement: 'AppColors.warning' },
  { pattern: /const Color\(0xFF[eE][aA][bB]308\)/g, replacement: 'AppColors.warning' },
  { pattern: /Color\(0xFF[eE][aA][bB]308\)/g, replacement: 'AppColors.warning' },
  { pattern: /const Color\(0xFF[dD]97706\)/g, replacement: 'AppColors.warning' },
  { pattern: /Color\(0xFF[dD]97706\)/g, replacement: 'AppColors.warning' },

  // Error / Danger
  { pattern: /const Color\(0xFF[eE][fF]4444\)/g, replacement: 'AppColors.error' },
  { pattern: /Color\(0xFF[eE][fF]4444\)/g, replacement: 'AppColors.error' },
  { pattern: /const Color\(0xFF[fF]43[fF]5[eE]\)/g, replacement: 'AppColors.error' },
  { pattern: /Color\(0xFF[fF]43[fF]5[eE]\)/g, replacement: 'AppColors.error' },
  { pattern: /const Color\(0xFF[dD][cC]2626\)/g, replacement: 'AppColors.error' },
  { pattern: /Color\(0xFF[dD][cC]2626\)/g, replacement: 'AppColors.error' },

  // Info
  { pattern: /const Color\(0xFF0284[cC]7\)/g, replacement: 'AppColors.info' },
  { pattern: /Color\(0xFF0284[cC]7\)/g, replacement: 'AppColors.info' },
  { pattern: /const Color\(0xFF0[eE][aA]5[eE]9\)/g, replacement: 'AppColors.info' },
  { pattern: /Color\(0xFF0[eE][aA]5[eE]9\)/g, replacement: 'AppColors.info' },
  { pattern: /const Color\(0xFF3[bB]82[fF]6\)/g, replacement: 'AppColors.info' },
  { pattern: /Color\(0xFF3[bB]82[fF]6\)/g, replacement: 'AppColors.info' },

  // Background & Surfaces
  { pattern: /const Color\(0xFF020617\)/g, replacement: 'AppColors.bgDark' },
  { pattern: /Color\(0xFF020617\)/g, replacement: 'AppColors.bgDark' },
  { pattern: /const Color\(0xFF0[bB]1220\)/g, replacement: 'AppColors.bgDark' },
  { pattern: /Color\(0xFF0[bB]1220\)/g, replacement: 'AppColors.bgDark' },
  { pattern: /const Color\(0xFF0[bB]0[fF]19\)/g, replacement: 'AppColors.bgDark' },
  { pattern: /Color\(0xFF0[bB]0[fF]19\)/g, replacement: 'AppColors.bgDark' },
  { pattern: /const Color\(0xFF111827\)/g, replacement: 'AppColors.surfaceDark' },
  { pattern: /Color\(0xFF111827\)/g, replacement: 'AppColors.surfaceDark' },
  { pattern: /const Color\(0xFF1[eE]293[bB]\)/g, replacement: 'AppColors.surfaceElevatedDark' },
  { pattern: /Color\(0xFF1[eE]293[bB]\)/g, replacement: 'AppColors.surfaceElevatedDark' },
  { pattern: /const Color\(0xFF1[fF]2937\)/g, replacement: 'AppColors.borderDark' },
  { pattern: /Color\(0xFF1[fF]2937\)/g, replacement: 'AppColors.borderDark' },
  { pattern: /const Color\(0xFF334155\)/g, replacement: 'AppColors.borderDark' },
  { pattern: /Color\(0xFF334155\)/g, replacement: 'AppColors.borderDark' },
  { pattern: /const Color\(0xFF374151\)/g, replacement: 'AppColors.borderSubtleDark' },
  { pattern: /Color\(0xFF374151\)/g, replacement: 'AppColors.borderSubtleDark' },
  { pattern: /const Color\(0xFF[fF]8[fF][aA][fF][cC]\)/g, replacement: 'AppColors.bgLight' },
  { pattern: /Color\(0xFF[fF]8[fF][aA][fF][cC]\)/g, replacement: 'AppColors.bgLight' },
  { pattern: /const Color\(0xFF[fF]1[fF]5[fF]9\)/g, replacement: 'AppColors.surfaceElevatedLight' },
  { pattern: /Color\(0xFF[fF]1[fF]5[fF]9\)/g, replacement: 'AppColors.surfaceElevatedLight' },
  { pattern: /const Color\(0xFF[eE]2[eE]8[fF]0\)/g, replacement: 'AppColors.borderLight' },
  { pattern: /Color\(0xFF[eE]2[eE]8[fF]0\)/g, replacement: 'AppColors.borderLight' },

  // Text colors
  { pattern: /const Color\(0xFF[fF]9[fF][aA][fF][bB]\)/g, replacement: 'AppColors.textPrimaryDark' },
  { pattern: /Color\(0xFF[fF]9[fF][aA][fF][bB]\)/g, replacement: 'AppColors.textPrimaryDark' },
  { pattern: /const Color\(0xFF0[fF]172[aA]\)/g, replacement: 'AppColors.textPrimaryLight' },
  { pattern: /Color\(0xFF0[fF]172[aA]\)/g, replacement: 'AppColors.textPrimaryLight' },
  { pattern: /const Color\(0xFF94[aA]3[bB]8\)/g, replacement: 'AppColors.textMutedDark' },
  { pattern: /Color\(0xFF94[aA]3[bB]8\)/g, replacement: 'AppColors.textMutedDark' },
  { pattern: /const Color\(0xFF9[cC][aA]3[aA][fF]\)/g, replacement: 'AppColors.textSecondaryDark' },
  { pattern: /Color\(0xFF9[cC][aA]3[aA][fF]\)/g, replacement: 'AppColors.textSecondaryDark' },
  { pattern: /const Color\(0xFF64748[bB]\)/g, replacement: 'AppColors.textSecondaryLight' },
  { pattern: /Color\(0xFF64748[bB]\)/g, replacement: 'AppColors.textSecondaryLight' },
  { pattern: /const Color\(0xFF475569\)/g, replacement: 'AppColors.textSecondaryLight' },
  { pattern: /Color\(0xFF475569\)/g, replacement: 'AppColors.textSecondaryLight' },
];

const files = getAllDartFiles(mobileLibDir);
let changedCount = 0;

for (const file of files) {
  // Skip theme directory itself
  if (file.includes('shared\\theme') || file.includes('shared/theme') || file.includes('lib\\theme') || file.includes('lib/theme')) {
    continue;
  }

  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  // Apply all color replacements
  for (const { pattern, replacement } of colorReplacements) {
    content = content.replace(pattern, replacement);
  }

  // Cleanup any invalid "const AppColors." occurrences that Dart would reject
  content = content.replace(/const AppColors\./g, 'AppColors.');
  // Fix cases like: const TextStyle(color: AppColors.something) -> TextStyle(color: AppColors.something)
  // or const Icon(..., color: AppColors.something) -> Icon(..., color: AppColors.something)
  content = content.replace(/const (Icon|Text|TextStyle|BoxDecoration|Border|BorderSide|Divider|CircularProgressIndicator)\(([^)]*AppColors\.[^)]*)\)/g, '$1($2)');

  // Ensure AppColors is imported if used
  if (content.includes('AppColors.') && !content.includes('app_colors.dart')) {
    const relToShared = path.relative(path.dirname(file), path.resolve(mobileLibDir, 'shared/theme/app_colors.dart')).replace(/\\/g, '/');
    content = `import '${relToShared}';\n` + content;
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    changedCount++;
    console.log(`Standardized: ${path.relative(mobileLibDir, file)}`);
  }
}

console.log(`\n🎉 Successfully standardized ${changedCount} mobile files to centralized design system tokens.`);

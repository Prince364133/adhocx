const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. Files to update docs
console.log('--- 1. Updating Design Documentation ---');

// Update docs/04_DESIGN_SYSTEM.md
const designSystemPath = path.join(rootDir, 'docs/04_DESIGN_SYSTEM.md');
if (fs.existsSync(designSystemPath)) {
  let content = fs.readFileSync(designSystemPath, 'utf8');

  // Replace Brand Action Blue with Brand Action Color #5728B2
  content = content.replace(
    /\* \*\*Primary Brand Action Blue \(`\#1167EE`\)\*\*: Commands interactive authority, high reliability, primary CTAs, and enterprise fulfillment status\./g,
    '* **Primary Brand Color (`#5728B2`)**: Commands interactive authority, high reliability, primary CTAs, and enterprise fulfillment status.\n* **Brand Logo Accent Orange (`#FF5F09`)**: Logo "X" accent, key operational indicators, and high-energy highlights.'
  );

  content = content.replace(
    /## 6\.1 Primary Brand Action \(Blue Scale\)[\s\S]*?## 6\.2 Brand Warm Accent/g,
    `## 6.1 Primary Brand Action (Brand Scale — #5728B2)

| Token       | Hex       | Usage                                |
| ----------- | --------- | ------------------------------------ |
| Brand 900   | \`#1B0E38\` | deepest midnight purple / dark UI    |
| Brand 800   | \`#2D145E\` | dark UI cards / strong dark surfaces |
| Brand 700   | \`#431E8E\` | hover state for primary buttons      |
| Brand 500   | \`#5728B2\` | **Primary Brand Color / CTAs**       |
| Brand 400   | \`#733DD9\` | lighter interactive state / accent   |
| Brand 200   | \`#B794F4\` | soft interactive border / active tag |
| Brand 50    | \`#F3E8FF\` | subtle brand surface / info pill bg  |

Primary action color:

\`\`\`text
#5728B2
\`\`\`

Primary gradient:

\`\`\`text
linear-gradient(135deg, #5728B2 0%, #431E8E 100%)
\`\`\`

---

## 6.2 Brand Warm Accent`
  );

  content = content.replace(/Info: #1167EE/g, 'Info: #5728B2');

  fs.writeFileSync(designSystemPath, content, 'utf8');
  console.log('Updated docs/04_DESIGN_SYSTEM.md with brand color #5728B2');
}

// Update apps/marketing/DESIGN_AND_UI.md
const marketingDesignPath = path.join(rootDir, 'apps/marketing/DESIGN_AND_UI.md');
if (fs.existsSync(marketingDesignPath)) {
  let content = fs.readFileSync(marketingDesignPath, 'utf8');
  content = content.replace(/--color-primary-600: #2563EB;/g, '--color-primary-600: #5728B2;');
  content = content.replace(/--color-primary-500: #3B82F6;/g, '--color-primary-500: #733DD9;');
  content = content.replace(/--color-primary-400: #60A5FA;/g, '--color-primary-400: #B794F4;');
  content = content.replace(/Wordmark Logo \*\*AdhocX\*\* with primary blue typography/g, 'Wordmark Logo **AdhocX** with primary brand (#5728B2) typography');
  content = content.replace(/Corporate Portal` \(Primary Filled Button `#2563EB`\)/g, 'Corporate Portal` (Primary Filled Button `#5728B2`)');
  content = content.replace(/`#16A34A` to `#2563EB`/g, '`#16A34A` to `#5728B2`');
  fs.writeFileSync(marketingDesignPath, content, 'utf8');
  console.log('Updated apps/marketing/DESIGN_AND_UI.md with brand color #5728B2');
}

console.log('\n--- 2. Updating In-App Brand Headers & Logos ---');

// Update OpsTopBar.tsx
const opsTopBarPath = path.join(rootDir, 'apps/ops/src/components/layout/OpsTopBar.tsx');
if (fs.existsSync(opsTopBarPath)) {
  let content = fs.readFileSync(opsTopBarPath, 'utf8');
  // Replace the box with "A" and ADHOCX text
  const targetPattern = /<div style=\{\{ display: 'flex', alignItems: 'center', gap: '10px' \}\}>[\s\S]*?<span style=\{\{ fontWeight: 800, fontSize: '15px', letterSpacing: '0\.02em', color: '#F8FAFC' \}\}>[\s\S]*?ADHOCX <span style=\{\{ color: 'var\(--brand-amber-500, #EE9811\)' \}\}>OPS<\/span>[\s\S]*?<\/span>[\s\S]*?<\/div>/;
  const replacement = `<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/adhocx_icon.svg"
            alt="AdhocX"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              display: 'block',
            }}
          />
          <span style={{ fontWeight: 900, fontSize: '16px', letterSpacing: '-0.02em', color: '#F8FAFC' }}>
            Adhoc<span style={{ color: '#FF5F09', fontWeight: 900 }}>X</span> <span style={{ color: 'var(--brand-amber-500, #EE9811)', fontSize: '11px', fontWeight: 800, marginLeft: '4px', letterSpacing: '0.06em' }}>OPS</span>
          </span>
        </div>`;
  if (targetPattern.test(content)) {
    content = content.replace(targetPattern, replacement);
    fs.writeFileSync(opsTopBarPath, content, 'utf8');
    console.log('Updated apps/ops/src/components/layout/OpsTopBar.tsx header logo');
  } else {
    console.log('OpsTopBar pattern did not match directly, checking alternate');
  }
}

// Update AdhocxBrandLogo.tsx in Admin
const adminLogoPath = path.join(rootDir, 'apps/admin/src/components/AdhocxBrandLogo.tsx');
if (fs.existsSync(adminLogoPath)) {
  let content = fs.readFileSync(adminLogoPath, 'utf8');
  content = content.replace(/linear-gradient\(135deg, #6347F9 0%, #4328E0 100%\)/g, 'linear-gradient(135deg, #5728B2 0%, #431E8E 100%)');
  content = content.replace(/rgba\(99, 71, 249, 0\.25\)/g, 'rgba(87, 40, 178, 0.25)');
  content = content.replace(/#FF6200/g, '#FF5F09');
  fs.writeFileSync(adminLogoPath, content, 'utf8');
  console.log('Updated apps/admin/src/components/AdhocxBrandLogo.tsx brand color to #5728B2');
}

// Update employee_brand_logo.dart in employee_app
const empLogoPath = path.join(rootDir, 'apps/employee_app/lib/widgets/employee_brand_logo.dart');
if (fs.existsSync(empLogoPath)) {
  let content = fs.readFileSync(empLogoPath, 'utf8');
  content = content.replace(/AppColors\.secondaryOrange/g, 'AppColors.secondaryOrange');
  fs.writeFileSync(empLogoPath, content, 'utf8');
  console.log('Checked apps/employee_app/lib/widgets/employee_brand_logo.dart');
}

// Update adhocx_brand_logo.dart in mobile
const mobileLogoPath = path.join(rootDir, 'apps/mobile/lib/widgets/adhocx_brand_logo.dart');
if (fs.existsSync(mobileLogoPath)) {
  let content = fs.readFileSync(mobileLogoPath, 'utf8');
  content = content.replace(/AppColors\.brandOrange/g, 'const Color(0xFFFF5F09)');
  fs.writeFileSync(mobileLogoPath, content, 'utf8');
  console.log('Checked apps/mobile/lib/widgets/adhocx_brand_logo.dart');
}

console.log('\n--- 3. Bulk Search and Replace of Blue Color across all apps ---');

// We search all files in apps/, packages/, docs/
const skipDirs = new Set(['node_modules', '.next', 'build', '.turbo', '.git', '.dart_tool', 'dist', '.astro', '.vercel']);

let modifiedCount = 0;
let fileModifiedCount = 0;

function walkAndReplace(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    if (skipDirs.has(item)) continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkAndReplace(fullPath);
    } else {
      // Process text/code files
      const ext = path.extname(item).toLowerCase();
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.css', '.dart', '.xml', '.html', '.json', '.astro', '.md', '.svg'].includes(ext)) {
        try {
          let fileContent = fs.readFileSync(fullPath, 'utf8');
          let orig = fileContent;

          // Replace hex #1167EE / #1167ee with #5728B2 / #5728b2
          fileContent = fileContent.replace(/#1167EE/g, '#5728B2');
          fileContent = fileContent.replace(/#1167ee/g, '#5728b2');

          // Replace Flutter Color(0xFF1167EE) with Color(0xFF5728B2)
          fileContent = fileContent.replace(/0xFF1167EE/g, '0xFF5728B2');
          fileContent = fileContent.replace(/0xff1167ee/g, '0xff5728b2');

          // Replace argb FF1167EE with FF5728B2
          fileContent = fileContent.replace(/FF1167EE/g, 'FF5728B2');

          // Replace rgba(17, 103, 238, ...) with rgba(87, 40, 178, ...)
          fileContent = fileContent.replace(/rgba\(17,\s*103,\s*238,/g, 'rgba(87, 40, 178,');

          // In employee_app/lib/theme/app_colors.dart
          if (fullPath.includes('employee_app') && fullPath.endsWith('app_colors.dart')) {
            fileContent = fileContent.replace(/Color\(0xFF0948AC\)/g, 'Color(0xFF431E8E)');
            fileContent = fileContent.replace(/Color\(0xFF032969\)/g, 'Color(0xFF2D145E)');
            fileContent = fileContent.replace(/Color\(0xFFCEE0FD\)/g, 'Color(0xFFF3E8FF)');
            fileContent = fileContent.replace(/Color\(0xFFEFF6FF\)/g, 'Color(0xFFFAF5FF)');
          }

          // In mobile/lib/shared/theme/app_colors.dart, update primary to 0xFF5728B2
          if (fullPath.includes('mobile') && fullPath.endsWith('app_colors.dart')) {
            fileContent = fileContent.replace(/Color\(0xFF5B42F3\)/g, 'Color(0xFF5728B2)');
            fileContent = fileContent.replace(/Color\(0xFF4E35DE\)/g, 'Color(0xFF431E8E)');
            fileContent = fileContent.replace(/Color\(0xFF3727A6\)/g, 'Color(0xFF2D145E)');
            fileContent = fileContent.replace(/Color\(0xFF7C68F5\)/g, 'Color(0xFF733DD9)');
            fileContent = fileContent.replace(/Color\(0xFF6347F9\)/g, 'Color(0xFF5728B2)');
            fileContent = fileContent.replace(/Color\(0xFF4328E0\)/g, 'Color(0xFF431E8E)');
          }

          // In employee/lib/theme/app_colors.dart, update primary to 0xFF5728B2
          if (fullPath.includes('employee') && !fullPath.includes('employee_app') && fullPath.endsWith('app_colors.dart')) {
            fileContent = fileContent.replace(/Color\(0xFF5B42F3\)/g, 'Color(0xFF5728B2)');
            fileContent = fileContent.replace(/Color\(0xFF4E35DE\)/g, 'Color(0xFF431E8E)');
            fileContent = fileContent.replace(/Color\(0xFF3727A6\)/g, 'Color(0xFF2D145E)');
            fileContent = fileContent.replace(/Color\(0xFF7C68F5\)/g, 'Color(0xFF733DD9)');
            fileContent = fileContent.replace(/Color\(0xFF6347F9\)/g, 'Color(0xFF5728B2)');
            fileContent = fileContent.replace(/Color\(0xFF4328E0\)/g, 'Color(0xFF431E8E)');
          }

          // In admin globals.css, update brand-primary to #5728B2
          if (fullPath.includes('admin') && fullPath.endsWith('globals.css')) {
            fileContent = fileContent.replace(/--brand-primary: #5B42F3;/g, '--brand-primary: #5728B2;');
            fileContent = fileContent.replace(/--brand-primary-hover: #4E35DE;/g, '--brand-primary-hover: #431E8E;');
            fileContent = fileContent.replace(/rgba\(91, 66, 243,/g, 'rgba(87, 40, 178,');
            fileContent = fileContent.replace(/linear-gradient\(135deg, #6347F9 0%, #4328E0 100%\)/g, 'linear-gradient(135deg, #5728B2 0%, #431E8E 100%)');
            fileContent = fileContent.replace(/--border-focus: #5B42F3;/g, '--border-focus: #5728B2;');
          }

          // In corporate globals.css
          if (fullPath.includes('corporate') && fullPath.endsWith('globals.css')) {
            fileContent = fileContent.replace(/--brand-blue-700: #0948AC;/g, '--brand-blue-700: #431E8E;');
            fileContent = fileContent.replace(/--brand-blue-800: #032969;/g, '--brand-blue-800: #2D145E;');
            fileContent = fileContent.replace(/--brand-blue-900: #010D2D;/g, '--brand-blue-900: #1B0E38;');
            fileContent = fileContent.replace(/--brand-blue-200: #93C5FD;/g, '--brand-blue-200: #B794F4;');
            fileContent = fileContent.replace(/--brand-blue-100: #DBEAFE;/g, '--brand-blue-100: #F3E8FF;');
            fileContent = fileContent.replace(/--brand-blue-50: #EFF6FF;/g, '--brand-blue-50: #FAF5FF;');
          }

          // In ops globals.css
          if (fullPath.includes('ops') && fullPath.endsWith('globals.css')) {
            fileContent = fileContent.replace(/--brand-blue-700: #0948AC;/g, '--brand-blue-700: #431E8E;');
            fileContent = fileContent.replace(/--brand-blue-800: #032969;/g, '--brand-blue-800: #2D145E;');
            fileContent = fileContent.replace(/--brand-blue-900: #010D2D;/g, '--brand-blue-900: #1B0E38;');
            fileContent = fileContent.replace(/--brand-blue-400: #5290F9;/g, '--brand-blue-400: #733DD9;');
            fileContent = fileContent.replace(/--brand-blue-200: #91B9FB;/g, '--brand-blue-200: #B794F4;');
            fileContent = fileContent.replace(/--brand-blue-50: #CEE0FD;/g, '--brand-blue-50: #F3E8FF;');
          }

          // In marketing global.css
          if (fullPath.includes('marketing') && fullPath.endsWith('global.css')) {
            fileContent = fileContent.replace(/--color-primary-700: #0948AC;/g, '--color-primary-700: #431E8E;');
            fileContent = fileContent.replace(/--color-primary-800: #032969;/g, '--color-primary-800: #2D145E;');
            fileContent = fileContent.replace(/--color-primary-900: #010D2D;/g, '--color-primary-900: #1B0E38;');
            fileContent = fileContent.replace(/--color-primary-400: #5290F9;/g, '--color-primary-400: #733DD9;');
            fileContent = fileContent.replace(/--color-primary-300: #91B9FB;/g, '--color-primary-300: #9F7AEA;');
            fileContent = fileContent.replace(/--color-primary-200: #CEE0FD;/g, '--color-primary-200: #B794F4;');
            fileContent = fileContent.replace(/--color-primary-100: #CEE0FD;/g, '--color-primary-100: #E9D8FD;');
            fileContent = fileContent.replace(/--color-primary-50: #F0F5FF;/g, '--color-primary-50: #FAF5FF;');
            fileContent = fileContent.replace(/linear-gradient\(135deg, #1167EE 0%, #0948AC 100%\)/g, 'linear-gradient(135deg, #5728B2 0%, #431E8E 100%)');
            fileContent = fileContent.replace(/linear-gradient\(135deg, #0948AC 0%, #032969 100%\)/g, 'linear-gradient(135deg, #431E8E 0%, #2D145E 100%)');
          }

          if (fileContent !== orig) {
            fs.writeFileSync(fullPath, fileContent, 'utf8');
            fileModifiedCount++;
            console.log(`[Replaced Blue] -> ${path.relative(rootDir, fullPath)}`);
          }
        } catch (e) {
          console.error(`Error reading/writing ${fullPath}:`, e.message);
        }
      }
    }
  }
}

// Run bulk replacement on apps, packages, docs, styles, and root html files
['apps', 'packages', 'docs', 'styles'].forEach((dir) => {
  walkAndReplace(path.join(rootDir, dir));
});

// Also check root html files
const rootFiles = fs.readdirSync(rootDir);
for (const f of rootFiles) {
  if (f.endsWith('.html')) {
    const fullPath = path.join(rootDir, f);
    let c = fs.readFileSync(fullPath, 'utf8');
    let orig = c;
    c = c.replace(/#1167EE/g, '#5728B2');
    c = c.replace(/#1167ee/g, '#5728b2');
    c = c.replace(/rgba\(17,\s*103,\s*238,/g, 'rgba(87, 40, 178,');
    if (c !== orig) {
      fs.writeFileSync(fullPath, c, 'utf8');
      fileModifiedCount++;
      console.log(`[Replaced Blue] -> ${f}`);
    }
  }
}

console.log(`\nBulk search & replace completed! Modified ${fileModifiedCount} files.`);


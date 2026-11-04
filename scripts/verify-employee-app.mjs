import fs from 'fs';
import path from 'path';

const APP_DIR = path.resolve('apps/employee_app');
const LIB_DIR = path.join(APP_DIR, 'lib');

console.log('=== VERIFYING ADHOCX EMPLOYEE MOBILE APP (BATCH 01) ===\n');

// 1. Check required configuration files
const reqFiles = ['pubspec.yaml', 'analysis_options.yaml', 'README.md'];
for (const f of reqFiles) {
  const p = path.join(APP_DIR, f);
  if (!fs.existsSync(p)) {
    console.error(`[FAIL] Missing config file: ${f}`);
    process.exit(1);
  }
  console.log(`[PASS] Config: ${f}`);
}

// 2. Inventory of all 15 screens
const screens = [
  'splash_screen.dart',
  'welcome_screen.dart',
  'login_options_screen.dart',
  'mobile_number_screen.dart',
  'otp_verification_screen.dart',
  'company_sso_screen.dart',
  'employee_verification_screen.dart',
  'location_permission_screen.dart',
  'notification_permission_screen.dart',
  'onboarding_schedule_screen.dart',
  'onboarding_tracking_screen.dart',
  'onboarding_safety_screen.dart',
  'onboarding_complete_screen.dart',
  'invalid_otp_screen.dart',
  'transport_unavailable_screen.dart',
];

console.log('\n--- Checking 15 Batch 01 Screens ---');
const screensDir = path.join(LIB_DIR, 'screens');
for (let i = 0; i < screens.length; i++) {
  const name = screens[i];
  const full = path.join(screensDir, name);
  if (!fs.existsSync(full)) {
    console.error(`[FAIL] Missing screen #${i + 1}: ${name}`);
    process.exit(1);
  }
  const stat = fs.statSync(full);
  if (stat.size < 100) {
    console.error(`[FAIL] Screen #${i + 1} (${name}) is suspiciously small (${stat.size} bytes)`);
    process.exit(1);
  }
  console.log(`[PASS] Screen ${String(i + 1).padStart(2, '0')}: ${name} (${(stat.size / 1024).toFixed(1)} KB)`);
}

// 3. Scan all Dart files for syntax and import integrity
function getDartFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(getDartFiles(full));
    } else if (item.endsWith('.dart')) {
      results.push(full);
    }
  }
  return results;
}

console.log('\n--- Verifying All Dart Files (Syntax & Import Integrity) ---');
const dartFiles = getDartFiles(LIB_DIR);
console.log(`Found ${dartFiles.length} Dart files to inspect.`);

let hasError = false;

for (const file of dartFiles) {
  const rel = path.relative(LIB_DIR, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf-8');

  // Check matching delimiters (basic syntax sanity)
  let parens = 0;
  let braces = 0;
  let brackets = 0;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '(') parens++;
    else if (c === ')') parens--;
    else if (c === '{') braces++;
    else if (c === '}') braces--;
    else if (c === '[') brackets++;
    else if (c === ']') brackets--;
  }

  if (parens !== 0 || braces !== 0 || brackets !== 0) {
    console.error(`[FAIL] Delimiter mismatch in ${rel}: parens=${parens}, braces=${braces}, brackets=${brackets}`);
    hasError = true;
  }

  // Check relative imports resolve
  const importLines = content.split('\n').filter(l => l.trim().startsWith('import '));
  for (const line of importLines) {
    const match = line.match(/import\s+['"]([^'"]+)['"]/);
    if (match) {
      const impPath = match[1];
      if (impPath.startsWith('.') || impPath.startsWith('package:adhocx_employee/')) {
        let resolved;
        if (impPath.startsWith('.')) {
          resolved = path.resolve(path.dirname(file), impPath);
        } else {
          const sub = impPath.replace('package:adhocx_employee/', '');
          resolved = path.join(LIB_DIR, sub);
        }
        if (!fs.existsSync(resolved)) {
          console.error(`[FAIL] Broken import in ${rel}: ${impPath} (resolved to: ${resolved})`);
          hasError = true;
        }
      }
    }
  }
}

if (hasError) {
  process.exit(1);
}

console.log('[PASS] All Dart files passed delimiter and local import resolution checks.');

// 4. Check routes cover all 15 screens
const routesFile = fs.readFileSync(path.join(LIB_DIR, 'routes/app_routes.dart'), 'utf-8');
for (const s of screens) {
  const baseName = s.replace('.dart', '');
  // Screen class name in PascalCase
  const parts = baseName.split('_');
  const className = parts.map(p => p[0].toUpperCase() + p.slice(1)).join('');
  if (!routesFile.includes(className)) {
    console.error(`[FAIL] app_routes.dart does not register screen class: ${className}`);
    process.exit(1);
  }
}
console.log('[PASS] app_routes.dart registers all 15 screens.');

// 5. Check Brand Colors token presence
const colorsFile = fs.readFileSync(path.join(LIB_DIR, 'theme/app_colors.dart'), 'utf-8');
const expectedTokens = ['0xFF1167EE', '0xFFFF5F09', '0xFFEE9811', '0xFF010D2D'];
for (const t of expectedTokens) {
  if (!colorsFile.includes(t)) {
    console.error(`[FAIL] app_colors.dart missing expected token: ${t}`);
    process.exit(1);
  }
}
console.log('[PASS] app_colors.dart contains all core design tokens (#1167EE, #FF5F09, #EE9811, #010D2D).');

console.log('\n=== ALL BATCH 01 VERIFICATIONS COMPLETED SUCCESSFULLY! ===');

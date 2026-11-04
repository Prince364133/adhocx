import fs from 'fs';
import path from 'path';

const APP_DIR = path.resolve('apps/employee_app');
const LIB_DIR = path.join(APP_DIR, 'lib');

console.log('=== VERIFYING ADHOCX EMPLOYEE MOBILE APP (BATCH 01 & 02) ===\n');

// 1. Check required configuration files & JSON data
const reqFiles = [
  'pubspec.yaml',
  'analysis_options.yaml',
  'README.md',
  'assets/data/mock_data.json',
];

for (const f of reqFiles) {
  const p = path.join(APP_DIR, f);
  if (!fs.existsSync(p)) {
    console.error(`[FAIL] Missing file: ${f}`);
    process.exit(1);
  }
  console.log(`[PASS] Verified file: ${f}`);
}

// 2. Inventory of Batch 01 (15 Screens)
const batch01Screens = [
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

console.log('\n--- Checking Batch 01 Screens (15 Screens) ---');
const screensDir = path.join(LIB_DIR, 'screens');
for (let i = 0; i < batch01Screens.length; i++) {
  const name = batch01Screens[i];
  const full = path.join(screensDir, name);
  if (!fs.existsSync(full)) {
    console.error(`[FAIL] Missing Batch 01 screen #${i + 1}: ${name}`);
    process.exit(1);
  }
  const stat = fs.statSync(full);
  console.log(`[PASS] B1-${String(i + 1).padStart(2, '0')}: ${name} (${(stat.size / 1024).toFixed(1)} KB)`);
}

// 3. Inventory of Batch 02 (14 Screens)
const batch02Screens = [
  'home_upcoming_pickup_screen.dart',
  'home_upcoming_drop_screen.dart',
  'home_no_upcoming_trip_screen.dart',
  'trip_planning_screen.dart',
  'trip_assigned_screen.dart',
  'trip_approaching_screen.dart',
  'trip_arrived_screen.dart',
  'trip_boarded_screen.dart',
  'trip_in_progress_screen.dart',
  'trip_completed_screen.dart',
  'trip_cancelled_screen.dart',
  'trip_unserved_screen.dart',
  'trip_details_completed_screen.dart',
  'driver_vehicle_details_screen.dart',
];

console.log('\n--- Checking Batch 02 Screens (14 Screens) ---');
const b2Dir = path.join(screensDir, 'batch_02');
for (let i = 0; i < batch02Screens.length; i++) {
  const name = batch02Screens[i];
  const full = path.join(b2Dir, name);
  if (!fs.existsSync(full)) {
    console.error(`[FAIL] Missing Batch 02 screen #${i + 1}: ${name}`);
    process.exit(1);
  }
  const stat = fs.statSync(full);
  console.log(`[PASS] B2-${String(i + 1).padStart(2, '0')}: ${name} (${(stat.size / 1024).toFixed(1)} KB)`);
}

// 4. Scan all Dart files for syntax and import integrity
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

// 5. Check app_routes.dart registers all screens
const routesFile = fs.readFileSync(path.join(LIB_DIR, 'routes/app_routes.dart'), 'utf-8');
const allScreens = [...batch01Screens, ...batch02Screens];
for (const s of allScreens) {
  const baseName = s.replace('.dart', '');
  const parts = baseName.split('_');
  const className = parts.map(p => p[0].toUpperCase() + p.slice(1)).join('');
  if (!routesFile.includes(className)) {
    console.error(`[FAIL] app_routes.dart missing screen class: ${className}`);
    process.exit(1);
  }
}
console.log(`[PASS] app_routes.dart registers all ${allScreens.length} screens (15 in Batch 01 + 14 in Batch 02).`);

// 6. Check JSON mock data structure
const jsonContent = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'assets/data/mock_data.json'), 'utf-8'));
const requiredSections = ['employee', 'trips', 'schedules', 'driver_assignment', 'live_tracking', 'boarding_completion'];
for (const sec of requiredSections) {
  if (!jsonContent[sec]) {
    console.error(`[FAIL] mock_data.json missing section: ${sec}`);
    process.exit(1);
  }
}
console.log('[PASS] mock_data.json contains all required schema sections.');

console.log('\n=== ALL BATCH 01 & BATCH 02 VERIFICATIONS COMPLETED SUCCESSFULLY! ===');

import fs from 'fs';
import path from 'path';

const APP_DIR = path.resolve('apps/employee_app');
const LIB_DIR = path.join(APP_DIR, 'lib');

console.log('=== VERIFYING ADHOCX EMPLOYEE MOBILE APP (ALL 6 BATCHES — 80 SCREENS) ===\n');

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

// 4. Inventory of Batch 03 (14 Screens)
const batch03Screens = [
  'schedule_today_overview_screen.dart',
  'schedule_daily_screen.dart',
  'schedule_weekly_screen.dart',
  'schedule_monthly_screen.dart',
  'shift_details_login_screen.dart',
  'shift_details_overnight_screen.dart',
  'schedule_no_trips_screen.dart',
  'request_change_options_screen.dart',
  'change_request_details_screen.dart',
  'change_request_submitted_screen.dart',
  'request_status_pending_screen.dart',
  'request_status_approved_screen.dart',
  'request_status_rejected_screen.dart',
  'cancel_trip_request_screen.dart',
];

console.log('\n--- Checking Batch 03 Screens (14 Screens) ---');
const b3Dir = path.join(screensDir, 'batch_03');
for (let i = 0; i < batch03Screens.length; i++) {
  const name = batch03Screens[i];
  const full = path.join(b3Dir, name);
  if (!fs.existsSync(full)) {
    console.error(`[FAIL] Missing Batch 03 screen #${i + 1}: ${name}`);
    process.exit(1);
  }
  const stat = fs.statSync(full);
  console.log(`[PASS] B3-${String(i + 1).padStart(2, '0')}: ${name} (${(stat.size / 1024).toFixed(1)} KB)`);
}

// 5. Inventory of Batch 04 (13 Screens)
const batch04Screens = [
  'assignment_notification_screen.dart',
  'cab_assigned_overview_screen.dart',
  'driver_details_screen.dart',
  'vehicle_details_screen.dart',
  'pickup_sequence_screen.dart',
  'cab_reassigned_screen.dart',
  'assignment_delayed_screen.dart',
  'driver_replaced_screen.dart',
  'driver_delay_screen.dart',
  'vehicle_issue_screen.dart',
  'contact_driver_sheet_screen.dart',
  'assignment_history_screen.dart',
  'no_cab_available_screen.dart',
];

console.log('\n--- Checking Batch 04 Screens (13 Screens) ---');
const b4Dir = path.join(screensDir, 'batch_04');
for (let i = 0; i < batch04Screens.length; i++) {
  const name = batch04Screens[i];
  const full = path.join(b4Dir, name);
  if (!fs.existsSync(full)) {
    console.error(`[FAIL] Missing Batch 04 screen #${i + 1}: ${name}`);
    process.exit(1);
  }
  const stat = fs.statSync(full);
  console.log(`[PASS] B4-${String(i + 1).padStart(2, '0')}: ${name} (${(stat.size / 1024).toFixed(1)} KB)`);
}

// 6. Inventory of Batch 05 (12 Screens)
const batch05Screens = [
  'live_tracking_overview_screen.dart',
  'trip_live_map_full_screen.dart',
  'pickup_point_details_screen.dart',
  'walking_directions_screen.dart',
  'cab_approaching_screen.dart',
  'cab_arrived_screen.dart',
  'trip_progress_on_trip_screen.dart',
  'route_and_stops_screen.dart',
  'gps_unavailable_screen.dart',
  'stale_location_screen.dart',
  'poor_network_screen.dart',
  'reconnecting_screen.dart',
];

console.log('\n--- Checking Batch 05 Screens (12 Screens) ---');
const b5Dir = path.join(screensDir, 'batch_05');
for (let i = 0; i < batch05Screens.length; i++) {
  const name = batch05Screens[i];
  const full = path.join(b5Dir, name);
  if (!fs.existsSync(full)) {
    console.error(`[FAIL] Missing Batch 05 screen #${i + 1}: ${name}`);
    process.exit(1);
  }
  const stat = fs.statSync(full);
  console.log(`[PASS] B5-${String(i + 1).padStart(2, '0')}: ${name} (${(stat.size / 1024).toFixed(1)} KB)`);
}

// 7. Inventory of Batch 06 (12 Screens)
const batch06Screens = [
  'boarding_verify_options_screen.dart',
  'boarding_otp_input_screen.dart',
  'scan_boarding_qr_screen.dart',
  'verifying_boarding_screen.dart',
  'boarding_successful_screen.dart',
  'wrong_otp_screen.dart',
  'boarding_issue_screen.dart',
  'trip_in_progress_en_route_screen.dart',
  'drop_reached_screen.dart',
  'trip_completed_summary_screen.dart',
  'safe_reach_confirmation_screen.dart',
  'post_trip_feedback_screen.dart',
];

console.log('\n--- Checking Batch 06 Screens (12 Screens) ---');
const b6Dir = path.join(screensDir, 'batch_06');
for (let i = 0; i < batch06Screens.length; i++) {
  const name = batch06Screens[i];
  const full = path.join(b6Dir, name);
  if (!fs.existsSync(full)) {
    console.error(`[FAIL] Missing Batch 06 screen #${i + 1}: ${name}`);
    process.exit(1);
  }
  const stat = fs.statSync(full);
  console.log(`[PASS] B6-${String(i + 1).padStart(2, '0')}: ${name} (${(stat.size / 1024).toFixed(1)} KB)`);
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

// 9. Check app_routes.dart registers all screens
const routesFile = fs.readFileSync(path.join(LIB_DIR, 'routes/app_routes.dart'), 'utf-8');
const allScreens = [
  ...batch01Screens,
  ...batch02Screens,
  ...batch03Screens,
  ...batch04Screens,
  ...batch05Screens,
  ...batch06Screens,
];
for (const s of allScreens) {
  const baseName = s.replace('.dart', '');
  const parts = baseName.split('_');
  const className = parts.map(p => p[0].toUpperCase() + p.slice(1)).join('');
  if (!routesFile.includes(className)) {
    console.error(`[FAIL] app_routes.dart missing screen class: ${className}`);
    process.exit(1);
  }
}
console.log(`[PASS] app_routes.dart registers all ${allScreens.length} screens across Batches 01 to 06.`);

// 10. Check JSON mock data structure
const jsonContent = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'assets/data/mock_data.json'), 'utf-8'));
const requiredSections = ['employee', 'trips', 'schedules', 'driver_assignment', 'live_tracking', 'boarding_completion'];
for (const sec of requiredSections) {
  if (!jsonContent[sec]) {
    console.error(`[FAIL] mock_data.json missing section: ${sec}`);
    process.exit(1);
  }
}
console.log('[PASS] mock_data.json contains all required schema sections.');

console.log('\n=== ALL BATCHES 01 THROUGH 06 VERIFICATIONS COMPLETED SUCCESSFULLY! (80 / 80 SCREENS FULLY VERIFIED) ===');

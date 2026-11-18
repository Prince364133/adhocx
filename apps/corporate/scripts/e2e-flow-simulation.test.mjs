import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CORPORATE_ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(CORPORATE_ROOT, 'src');

function readSrc(relPath) {
  return fs.readFileSync(path.join(SRC_ROOT, relPath), 'utf8');
}

function walkSourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkSourceFiles(full, out);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function makeFakeJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

function decodeJwtPayload(token) {
  if (!token) return null;
  const part = token.split('.')[1];
  if (!part) return null;
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

// ---------------------------------------------------------------------------
// 1. Corporate OTP & Password Login Role / Tenant Validator Simulation
// ---------------------------------------------------------------------------
test('Corporate login validator allows CORPORATE_ADMIN & CORPORATE_MANAGER with tenantId and blocks ADMIN/DRIVER/unlinked accounts', () => {
  const sessionSrc = readSrc('lib/auth/session.ts');
  const loginSrc = readSrc('app/login/page.tsx');

  // Verify PORTAL_USER_ROLES in session.ts strictly allows CORPORATE_ADMIN & CORPORATE_MANAGER
  assert.match(
    sessionSrc,
    /export const PORTAL_USER_ROLES\s*=\s*\[\s*'CORPORATE_ADMIN'\s*,\s*'CORPORATE_MANAGER'\s*\]/,
    'PORTAL_USER_ROLES must strictly allow CORPORATE_ADMIN and CORPORATE_MANAGER',
  );
  assert.match(loginSrc, /const validateCorporateAccess\s*=/, 'login/page.tsx must define validateCorporateAccess');
  assert.match(loginSrc, /isPortalRole\(resolvedRole\)/, 'login/page.tsx must check isPortalRole');
  assert.match(loginSrc, /if\s*\(!resolvedTenantId\)/, 'login/page.tsx must require corporateTenantId');
  assert.match(loginSrc, /authApi\.requestOtp\(/, 'login/page.tsx must use OTP request API');
  assert.match(loginSrc, /authApi\.verifyOtp\(/, 'login/page.tsx must use OTP verify API');

  // Behavioral simulation matching session.ts + login/page.tsx logic
  const PORTAL_USER_ROLES = ['CORPORATE_ADMIN', 'CORPORATE_MANAGER'];
  const isPortalRole = (role) => !!role && PORTAL_USER_ROLES.includes(String(role).toUpperCase());
  const validateCorporateAccess = (accessToken, user) => {
    const claims = decodeJwtPayload(accessToken);
    const resolvedRole = String(user?.role || claims?.role || '').trim();
    const resolvedTenantId = String(user?.corporateTenantId || claims?.corporateTenantId || '').trim();
    if (!isPortalRole(resolvedRole)) return { ok: false, reason: 'ROLE_FORBIDDEN' };
    if (!resolvedTenantId) return { ok: false, reason: 'TENANT_MISSING' };
    return { ok: true, role: resolvedRole, tenantId: resolvedTenantId };
  };

  // Allowed accounts
  const corpAdminJwt = makeFakeJwt({ id: 'u1', role: 'CORPORATE_ADMIN', corporateTenantId: 'tenant-1' });
  assert.equal(validateCorporateAccess(corpAdminJwt, { role: 'CORPORATE_ADMIN', corporateTenantId: 'tenant-1' }).ok, true);

  const corpMgrJwt = makeFakeJwt({ id: 'u2', role: 'CORPORATE_MANAGER', corporateTenantId: 'tenant-1' });
  assert.equal(validateCorporateAccess(corpMgrJwt, { role: 'CORPORATE_MANAGER', corporateTenantId: 'tenant-1' }).ok, true);

  // Blocked: Platform ADMIN
  const adminJwt = makeFakeJwt({ id: 'u3', role: 'ADMIN', corporateTenantId: 'tenant-1' });
  const adminRes = validateCorporateAccess(adminJwt, { role: 'ADMIN', corporateTenantId: 'tenant-1' });
  assert.equal(adminRes.ok, false);
  assert.equal(adminRes.reason, 'ROLE_FORBIDDEN');

  // Blocked: DRIVER
  const driverJwt = makeFakeJwt({ id: 'u4', role: 'DRIVER' });
  const driverRes = validateCorporateAccess(driverJwt, { role: 'DRIVER' });
  assert.equal(driverRes.ok, false);
  assert.equal(driverRes.reason, 'ROLE_FORBIDDEN');

  // Blocked: EMPLOYEE
  const empJwt = makeFakeJwt({ id: 'u5', role: 'EMPLOYEE', corporateTenantId: 'tenant-1' });
  assert.equal(validateCorporateAccess(empJwt, { role: 'EMPLOYEE', corporateTenantId: 'tenant-1' }).ok, false);

  // Blocked: Unlinked CORPORATE_ADMIN without corporateTenantId
  const unlinkedJwt = makeFakeJwt({ id: 'u6', role: 'CORPORATE_ADMIN' });
  const unlinkedRes = validateCorporateAccess(unlinkedJwt, { role: 'CORPORATE_ADMIN', corporateTenantId: null });
  assert.equal(unlinkedRes.ok, false);
  assert.equal(unlinkedRes.reason, 'TENANT_MISSING');
});

// ---------------------------------------------------------------------------
// 2. PortalShell Navigation, Auth Gates, User Menu & Real RequirePermission
// ---------------------------------------------------------------------------
test('PortalShell includes /routes & /employee-support, gates forbidden/anonymous, and implements real RequirePermission', () => {
  const shellSrc = readSrc('components/layout/PortalShell.tsx');
  const permsSrc = readSrc('lib/auth/permissions.ts');

  assert.match(shellSrc, /href:\s*'\/routes'/, 'NAV_ITEMS must include /routes');
  assert.match(shellSrc, /href:\s*'\/employee-support'/, 'NAV_ITEMS must include /employee-support');
  assert.match(shellSrc, /status === 'loading' \|\| status === 'anonymous'/, 'PortalShellFrame must gate anonymous/loading');
  assert.match(shellSrc, /status === 'forbidden'/, 'PortalShellFrame must gate forbidden accounts');

  // Real RequirePermission checks can(permission)
  const reqPermBlock = shellSrc.slice(shellSrc.indexOf('export function RequirePermission'));
  assert.match(reqPermBlock, /useSession\(\)/, 'RequirePermission must read session');
  assert.match(reqPermBlock, /!can\(permission\)/, 'RequirePermission must enforce can(permission)');
  assert.doesNotMatch(reqPermBlock, /permission:\s*_p/, 'RequirePermission must not ignore permission param');

  // TopBar User Menu click-outside + Escape + phone fallback
  assert.match(shellSrc, /userMenuRef/, 'TopBar must attach ref to user menu for outside-click dismissal');
  assert.match(shellSrc, /if \(event\.key === 'Escape'\) setShowUserMenu\(false\)/, 'TopBar user menu must dismiss on Escape');
  assert.match(shellSrc, /user\?\.email \|\| user\?\.phone/, 'TopBar user menu must fall back to user?.phone');

  // Permissions include zones:read, zones:write, bookings:read
  assert.match(permsSrc, /'zones:read'/, 'permissions.ts must include zones:read');
  assert.match(permsSrc, /'zones:write'/, 'permissions.ts must include zones:write');
  assert.match(permsSrc, /'bookings:read'/, 'permissions.ts must include bookings:read');
});

// ---------------------------------------------------------------------------
// 3. Employee Support Workflow (No 409 on OPEN/ASSIGNED/REOPENED), Phone & KPIs
// ---------------------------------------------------------------------------
test('employee-support/page.tsx executes legal transitions without 409, reads phoneNumber, and aligns KPI counts', () => {
  const empSupportSrc = readSrc('app/employee-support/page.tsx');
  const ticketDetailsSrc = readSrc('app/support/tickets/details/page.tsx');
  const typesSrc = readSrc('lib/api/types.ts');

  // Phone number lookup
  assert.match(
    empSupportSrc,
    /ticket\.employee\?\.phoneNumber\s*\?\?\s*ticket\.employee\?\.phone/,
    'employee-support must read employee.phoneNumber with fallback to phone',
  );
  assert.match(
    ticketDetailsSrc,
    /ticket\.employee\.phoneNumber\s*\?\?\s*ticket\.employee\.phone/,
    'support/tickets/details must read employee.phoneNumber with fallback to phone',
  );
  assert.match(typesSrc, /phoneNumber\?:\s*string;/, 'SupportTicket.employee must type phoneNumber');

  // Mark In Progress shown on OPEN, ASSIGNED, REOPENED, WAITING_FOR_CORPORATE
  assert.match(
    empSupportSrc,
    /\['OPEN',\s*'ASSIGNED',\s*'REOPENED',\s*'WAITING_FOR_CORPORATE'\]\.includes\(selectedComplaint\.statusRaw\)/,
    'Mark In Progress must be available for OPEN, ASSIGNED, REOPENED, and WAITING_FOR_CORPORATE',
  );

  // Automatic IN_PROGRESS step before RESOLVED when status is OPEN, ASSIGNED, or REOPENED
  assert.match(
    empSupportSrc,
    /currentRawStatus === 'OPEN' \|\| currentRawStatus === 'ASSIGNED' \|\| currentRawStatus === 'REOPENED'/,
    'handleUpdateStatus must step through IN_PROGRESS for OPEN/ASSIGNED/REOPENED before RESOLVED',
  );

  // KPI cards derive directly from dateFilteredComplaints / statusGroup (no mismatched summaryTotals override)
  assert.doesNotMatch(
    empSupportSrc,
    /summaryTotals/,
    'KPI counts must align directly with mapStatusGroup buckets from dateFilteredComplaints',
  );

  // Full state-machine simulation against backend TICKET_ALLOWED_TRANSITIONS
  const TICKET_ALLOWED_TRANSITIONS = {
    OPEN: ['ASSIGNED', 'IN_PROGRESS'],
    ASSIGNED: ['IN_PROGRESS', 'OPEN'],
    IN_PROGRESS: ['WAITING_FOR_CORPORATE', 'RESOLVED'],
    WAITING_FOR_CORPORATE: ['IN_PROGRESS', 'RESOLVED'],
    RESOLVED: ['REOPENED', 'CLOSED'],
    REOPENED: ['IN_PROGRESS'],
    CLOSED: [],
  };

  function simulateClientTransition(currentRawStatus, targetStatus) {
    let state = currentRawStatus;
    const steps = [];
    const needsInProgressStep =
      targetStatus === 'RESOLVED' &&
      (state === 'OPEN' || state === 'ASSIGNED' || state === 'REOPENED');
    if (needsInProgressStep) {
      assert.ok(
        TICKET_ALLOWED_TRANSITIONS[state].includes('IN_PROGRESS'),
        `Illegal step ${state} -> IN_PROGRESS`,
      );
      state = 'IN_PROGRESS';
      steps.push('IN_PROGRESS');
    }
    assert.ok(
      TICKET_ALLOWED_TRANSITIONS[state].includes(targetStatus),
      `Illegal transition ${state} -> ${targetStatus} (from ${currentRawStatus})`,
    );
    state = targetStatus;
    steps.push(targetStatus);
    return { finalState: state, steps };
  }

  for (const start of ['OPEN', 'ASSIGNED', 'REOPENED', 'WAITING_FOR_CORPORATE']) {
    const res = simulateClientTransition(start, 'IN_PROGRESS');
    assert.equal(res.finalState, 'IN_PROGRESS');
  }
  for (const start of ['OPEN', 'ASSIGNED', 'REOPENED', 'IN_PROGRESS', 'WAITING_FOR_CORPORATE']) {
    const res = simulateClientTransition(start, 'RESOLVED');
    assert.equal(res.finalState, 'RESOLVED');
  }
});

// ---------------------------------------------------------------------------
// 4. EmployeeDirectory: Conditional homeAddress on PATCH, canWrite & DELETE
// ---------------------------------------------------------------------------
test('EmployeeDirectory omits unchanged homeAddress on PATCH, gates Edit with canWrite, and wires DELETE', () => {
  const empDirSrc = readSrc('app/employees/EmployeeDirectory.tsx');

  assert.match(
    empDirSrc,
    /trimmedAddress && trimmedAddress !== originalAddress/,
    'PATCH payload must only include homeAddress when modified from original default address',
  );
  assert.match(empDirSrc, /employeeApi\.delete\(tenantId,\s*deleteTarget\.id\)/, 'EmployeeDirectory must wire DELETE');
  assert.match(empDirSrc, /canWrite\s*&&\s*\(\s*<button[^>]*onClick=\{onEdit\}/, 'EmployeeDetails must gate Edit button with canWrite');
});

// ---------------------------------------------------------------------------
// 5. Company Profile: pinCode, Live Transport Zones, Office Edit, Dept Edit
// ---------------------------------------------------------------------------
test('company-profile/page.tsx reads pinCode and wires Transport Zones, Office Edit, and Department Edit', () => {
  const profileSrc = readSrc('app/company-profile/page.tsx');
  const apiSrc = readSrc('lib/api/corporate.ts');

  assert.match(profileSrc, /selectedOffice\.pinCode\s*\?\?\s*selectedOffice\.pincode/, 'Office details must read pinCode');
  assert.match(profileSrc, /tenantApi\.updateOffice\(/, 'company-profile must wire tenantApi.updateOffice');
  assert.match(profileSrc, /tenantApi\.updateDepartment\(/, 'company-profile must wire tenantApi.updateDepartment');
  assert.match(profileSrc, /tenantApi\.transportZones\(/, 'company-profile must wire tenantApi.transportZones');
  assert.match(profileSrc, /tenantApi\.createTransportZone\(/, 'company-profile must wire tenantApi.createTransportZone');
  assert.match(profileSrc, /tenantApi\.updateTransportZone\(/, 'company-profile must wire tenantApi.updateTransportZone');

  // Ensure stale notices are removed
  assert.doesNotMatch(
    profileSrc,
    /Transport zones are not provided by the current corporate API/i,
    'Stale transport zones notice must be removed',
  );
  assert.doesNotMatch(
    profileSrc,
    /Office contacts and edit\/deactivate operations are not provided/i,
    'Stale office edit notice must be removed',
  );
  assert.doesNotMatch(
    profileSrc,
    /Department head, office association, description and edit\/deactivate operations are not provided/i,
    'Stale department edit notice must be removed',
  );

  // Verify API client methods exist
  for (const method of ['updateOffice', 'updateDepartment', 'transportZones', 'createTransportZone', 'updateTransportZone']) {
    assert.match(apiSrc, new RegExp(`\\b${method}:`), `tenantApi must define ${method}`);
  }
});

// ---------------------------------------------------------------------------
// 6. Offices, Geofences, Billing, Routes, Map XSS Escape, Shell & FAQ Polish
// ---------------------------------------------------------------------------
test('Offices, Geofences, Billing, Routes, Map, Notifications, Dashboard Layout & FAQ fixes are wired', () => {
  const officesSrc = readSrc('app/offices/page.tsx');
  const geofencesSrc = readSrc('app/offices/geofences/page.tsx');
  const billingSrc = readSrc('app/billing/page.tsx');
  const invoicesSrc = readSrc('app/billing/invoices/page.tsx');
  const disputesSrc = readSrc('app/billing/disputes/page.tsx');
  const activeRoutesSrc = readSrc('app/routes/active/page.tsx');
  const mapSrc = readSrc('components/maps/GoogleRouteMap.tsx');
  const dashLayoutSrc = readSrc('app/dashboard/layout.tsx');
  const notifSrc = readSrc('app/notifications/page.tsx');
  const supportSrc = readSrc('app/support/page.tsx');
  const faqDropdownSrc = readSrc('components/layout/CorporateFaqDropdown.tsx');

  // Offices & Geofences
  assert.match(officesSrc, /office\._count\?\.employees\s*\?\?\s*office\.employeeCount/, 'offices/page.tsx must read _count.employees');
  assert.match(officesSrc, /off\.addressText/, 'offices/page.tsx must search off.addressText');
  assert.match(geofencesSrc, /searchParams\.get\('id'\)/, 'offices/geofences must read ?id=');

  // Billing
  assert.match(billingSrc, /onOfficeChange=\{setSelectedOffice\}/, 'billing/page.tsx must wire onOfficeChange');
  assert.match(billingSrc, /onRefresh=/, 'billing/page.tsx must wire onRefresh');
  assert.match(billingSrc, /err\.status === 403/, 'billing/page.tsx must gracefully tolerate 403 on disputes');
  assert.match(invoicesSrc, /Previous/, 'billing/invoices must render Prev pagination button');
  assert.match(invoicesSrc, /Next/, 'billing/invoices must render Next pagination button');
  assert.doesNotMatch(disputesSrc, /\balert\(/, 'billing/disputes must not use window.alert()');
  assert.match(disputesSrc, /can\('billing:write'\)/, 'billing/disputes must gate Raise Dispute with billing:write');

  // Routes & GoogleRouteMap
  assert.match(activeRoutesSrc, /stop\.addressText \|\| stop\.employeeName/, 'routes/active must render addressText/employeeName');
  assert.match(activeRoutesSrc, /stop\.status === 'BOARDED'/, 'routes/active must check BOARDED status');
  assert.doesNotMatch(activeRoutesSrc, /stop\.locationName/, 'routes/active must not reference nonexistent locationName');
  assert.match(mapSrc, /function escapeHtml\(/, 'GoogleRouteMap must define escapeHtml');
  assert.match(mapSrc, /escapeHtml\(stop\.employeeName/, 'GoogleRouteMap must escape employeeName in InfoWindow');
  assert.match(mapSrc, /escapeHtml\(office\.name\)/, 'GoogleRouteMap must escape office.name in InfoWindow');

  // Dashboard layout, Notifications, Support, FAQ
  assert.doesNotMatch(dashLayoutSrc, /SubNavTabs/, 'dashboard/layout.tsx must not render empty SubNavTabs');
  assert.match(notifSrc, /'\/routes'/, 'notifications/page.tsx must allow /routes destination');
  assert.match(supportSrc, /selected\.assignedToUser\?\.fullName/, 'support/page.tsx must display assignedToUser.fullName');
  assert.match(supportSrc, /'CAB_DELAY'/, 'support/page.tsx must include commute categories');
  assert.match(faqDropdownSrc, /"support-tickets"/, 'CorporateFaqDropdown must include support-tickets category');
});

// ---------------------------------------------------------------------------
// 7. Zero-Mock Scan across apps/corporate/src
// ---------------------------------------------------------------------------
test('Zero-mock scan across apps/corporate/src finds no hardcoded mock datasets', () => {
  const files = walkSourceFiles(SRC_ROOT);
  assert.ok(files.length > 20, `Expected corporate source files, found ${files.length}`);

  const forbiddenPatterns = [
    /\bMOCK_[A-Z0-9_]+\b/,
    /\bDEMO_[A-Z0-9_]+\b/,
    /\bUSE_MOCK\b/,
    /\bmockData\b/,
    /\bfakeData\b/,
    /\bsampleData\b/,
  ];

  const violations = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(content)) {
        violations.push(`${path.relative(CORPORATE_ROOT, file)} matched ${pattern}`);
      }
    }
  }

  assert.deepEqual(violations, [], `Found mock data violations:\n${violations.join('\n')}`);
});

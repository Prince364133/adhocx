import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isActiveSosStatus,
  isTerminalSosStatus,
  getSosTriggerLabel,
  getSosAlertDisplay,
  getSosNextAction,
  isOfficeHubStop,
  canReassignRoute,
  canCancelRoute,
  canEditRoute,
  canDeleteRoute,
  isValidIndianMobile,
  escapeHtml,
} from '../src/lib/opsHelpers.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OPS_ROOT = path.resolve(__dirname, '..');
const OPS_SRC = path.join(OPS_ROOT, 'src');

function readOpsFile(relPath) {
  return fs.readFileSync(path.join(OPS_SRC, relPath), 'utf8');
}

function listAllFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listAllFiles(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

test('1. SosAlertItem mapping handles real Prisma CorporateSosAlert rows without crashing', () => {
  // Real Prisma CorporateSosAlert row returned by GET /corporate/safety/alerts (no legacy triggerType/locationLat)
  const prismaAlert = {
    id: 'sos-001-abcdef',
    routeId: 'route-001',
    tenantId: 'tenant-123',
    triggeredByRole: 'EMPLOYEE',
    latitude: '17.443500',
    longitude: '78.377200',
    status: 'NEW',
    resolutionNotes: null,
    createdAt: '2026-11-18T08:00:00.000Z',
    acknowledgedAt: null,
    escalatedAt: null,
    resolvedAt: null,
    route: {
      id: 'route-001',
      tenantId: 'tenant-123',
      direction: 'LOGIN',
      shiftTime: '09:00',
      driver: { fullName: 'Ramesh Kumar', phone: '+919876543210' },
      vehicle: { registrationNumber: 'TS09AB1234', model: 'Dzire' },
      tenant: { id: 'tenant-123', name: 'Acme Corp', code: 'ACME' },
      office: { id: 'off-1', name: 'HITEC City Campus' },
    },
  };

  assert.doesNotThrow(() => getSosTriggerLabel(prismaAlert));
  const display = getSosAlertDisplay(prismaAlert);
  assert.equal(display.tenantId, 'tenant-123');
  assert.equal(display.tenantName, 'Acme Corp');
  assert.equal(display.driverName, 'Ramesh Kumar');
  assert.equal(display.driverPhone, '+919876543210');
  assert.equal(display.vehiclePlate, 'TS09AB1234');
  assert.equal(display.latitude, 17.4435);
  assert.equal(display.longitude, 78.3772);
  assert.equal(display.coordinatesLabel, '17.4435, 78.3772');
  assert.match(display.triggerLabel, /EMPLOYEE/i);

  // Active vs terminal status classification: ESCALATED MUST stay active (never resolved archive!)
  for (const activeStatus of ['NEW', 'ACTIVE', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED', 'RESPONDED']) {
    assert.equal(isActiveSosStatus(activeStatus), true, `Expected ${activeStatus} to be active`);
    assert.equal(isTerminalSosStatus(activeStatus), false, `Expected ${activeStatus} not to be terminal`);
  }
  for (const terminalStatus of ['RESOLVED', 'FALSE_ALARM']) {
    assert.equal(isActiveSosStatus(terminalStatus), false, `Expected ${terminalStatus} not to be active`);
    assert.equal(isTerminalSosStatus(terminalStatus), true, `Expected ${terminalStatus} to be terminal`);
  }

  // Next-action state machine: never escalate an already-ESCALATED alert
  assert.equal(getSosNextAction({ ...prismaAlert, status: 'NEW' }), 'ACKNOWLEDGE');
  assert.equal(getSosNextAction({ ...prismaAlert, status: 'ACTIVE' }), 'ACKNOWLEDGE');
  assert.equal(getSosNextAction({ ...prismaAlert, status: 'ACKNOWLEDGED' }), 'ESCALATE');
  assert.equal(getSosNextAction({ ...prismaAlert, status: 'INVESTIGATING' }), 'ESCALATE');
  assert.equal(getSosNextAction({ ...prismaAlert, status: 'ESCALATED' }), null);
  assert.equal(getSosNextAction({ ...prismaAlert, status: 'RESOLVED' }), null);

  // Static check: exceptions page must never call triggerType.replaceAll directly
  const exceptionsSrc = readOpsFile('app/dashboard/exceptions/page.tsx');
  assert.equal(exceptionsSrc.includes('triggerType.replaceAll'), false);
  const cockpitSrc = readOpsFile('app/safety/cockpit/page.tsx');
  assert.match(cockpitSrc, /isActiveSosStatus/);
  assert.match(cockpitSrc, /isTerminalSosStatus/);
  const topBarSrc = readOpsFile('components/layout/OpsTopBar.tsx');
  assert.match(topBarSrc, /isActiveSosStatus/);
});

test('2. Office stop detection works identically for LOGIN (DROPOFF) and LOGOUT (PICKUP) routes', () => {
  // LOGIN route: employee pickups first, office dropoff last
  const loginEmployeeStop = {
    id: 'stop-1',
    stopType: 'PICKUP',
    employeeId: 'emp-1',
    employeeName: 'Priya Sharma',
    employee: { id: 'emp-1', fullName: 'Priya Sharma', phoneNumber: '+919876543211' },
  };
  const loginOfficeStop = {
    id: 'stop-2',
    stopType: 'DROPOFF',
    employeeId: null,
    employeeName: null,
    employee: undefined,
  };

  // LOGOUT route: office pickup first, employee dropoffs after
  const logoutOfficeStop = {
    id: 'stop-3',
    stopType: 'PICKUP',
    employeeId: null,
    employeeName: null,
    employee: undefined,
  };
  const logoutEmployeeStop = {
    id: 'stop-4',
    stopType: 'DROPOFF',
    employeeId: null,
    employeeName: 'Arjun Mehta',
    employee: undefined,
  };

  assert.equal(isOfficeHubStop(loginEmployeeStop), false);
  assert.equal(isOfficeHubStop(loginOfficeStop), true);
  assert.equal(isOfficeHubStop(logoutOfficeStop), true);
  assert.equal(isOfficeHubStop(logoutEmployeeStop), false);

  const drawerSrc = readOpsFile('components/operations/StopItineraryDrawer.tsx');
  assert.match(drawerSrc, /isOfficeHubStop/);
  assert.equal(drawerSrc.includes("stop.stopType === 'DROPOFF'"), false);

  const detailSrc = readOpsFile('components/routes/OpsRouteDetailView.tsx');
  assert.match(detailSrc, /isOfficeHubStop/);
});

test('3. Route action button status-gating rules prevent 409 conflicts', () => {
  const statuses = ['PLANNED', 'DISPATCHING', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'];

  for (const status of statuses) {
    const unassigned = { status, driverId: undefined };
    const assigned = { status, driverId: 'drv-1' };

    // Reassign ONLY when status === 'ASSIGNED'
    assert.equal(canReassignRoute(assigned), status === 'ASSIGNED', `canReassignRoute(${status})`);

    // Cancel & Edit ONLY when PLANNED | DISPATCHING | ASSIGNED
    const isUnstarted = status === 'PLANNED' || status === 'DISPATCHING' || status === 'ASSIGNED';
    assert.equal(canCancelRoute(assigned), isUnstarted, `canCancelRoute(${status})`);
    assert.equal(canEditRoute(assigned), isUnstarted, `canEditRoute(${status})`);

    // Delete ONLY when (PLANNED | DISPATCHING) && !driverId
    const isDeletableUnassigned = status === 'PLANNED' || status === 'DISPATCHING';
    assert.equal(canDeleteRoute(unassigned), isDeletableUnassigned, `canDeleteRoute(unassigned ${status})`);
    assert.equal(canDeleteRoute(assigned), false, `canDeleteRoute(assigned ${status}) must always be false`);
  }

  // Confirm all 3 route views wire up the status-gating guards
  const routesPageSrc = readOpsFile('app/routes/page.tsx');
  assert.match(routesPageSrc, /canReassignRoute/);
  assert.match(routesPageSrc, /canCancelRoute/);
  assert.match(routesPageSrc, /canEditRoute/);
  assert.match(routesPageSrc, /canDeleteRoute/);

  const detailSrc = readOpsFile('components/routes/OpsRouteDetailView.tsx');
  assert.match(detailSrc, /canReassignRoute/);
  assert.match(detailSrc, /canCancelRoute/);
  assert.match(detailSrc, /canEditRoute/);
  assert.match(detailSrc, /canDeleteRoute/);

  const liveSrc = readOpsFile('app/dashboard/live/page.tsx');
  assert.match(liveSrc, /canReassignRoute/);
});

test('4. Sidebar navigation, dashboard tabs, planner builder, and Indian mobile validation are wired', () => {
  const sidebarSrc = readOpsFile('components/layout/OpsSidebar.tsx');
  assert.match(sidebarSrc, /href:\s*['"]\/dashboard['"]/);
  assert.match(sidebarSrc, /href:\s*['"]\/employees['"]/);
  assert.equal(sidebarSrc.includes('http://localhost:7002'), false);

  const dashboardLayoutSrc = readOpsFile('app/dashboard/layout.tsx');
  assert.match(dashboardLayoutSrc, /OpsDashboardTabs/);

  const plannerSrc = readOpsFile('app/planner/page.tsx');
  assert.match(plannerSrc, /selectedUploadTenantId/);
  assert.match(plannerSrc, /<select[\s\S]*selectedUploadTenantId/);
  assert.match(plannerSrc, /handleCreateManualRoute/);
  assert.match(plannerSrc, /isValidIndianMobile/);

  // Verify 10-digit Indian mobile validation rules
  assert.equal(isValidIndianMobile('9876543210'), true);
  assert.equal(isValidIndianMobile('+919876543210'), true);
  assert.equal(isValidIndianMobile('+91 98765-43210'), true);
  assert.equal(isValidIndianMobile('09876543210'), true);
  assert.equal(isValidIndianMobile('1234567890'), false);
  assert.equal(isValidIndianMobile('98765'), false);
  assert.equal(isValidIndianMobile('9876543210123'), false);
  assert.equal(isValidIndianMobile('abc9876543'), false);

  // Verify analytics excludes CANCELLED and does not hardcode shift times
  const analyticsSrc = readOpsFile('app/dashboard/analytics/page.tsx');
  assert.equal(analyticsSrc.includes("'05:00', '08:00', '09:00', '17:00', '18:00', '20:00'"), false);
  assert.match(analyticsSrc, /byStatus\.CANCELLED/);
});

test('5. Zero-mock scan across apps/ops/src finds no mock-ops-db, 98.4, or localhost:7002 fallbacks', () => {
  const forbiddenPatterns = [
    { name: 'mock-ops-db', regex: /mock-ops-db/i },
    { name: '98.4 hardcoded metric', regex: /\b98\.4\b/ },
    { name: 'http://localhost:7002', regex: /http:\/\/localhost:7002/i },
  ];

  const allFiles = listAllFiles(OPS_SRC);
  assert.ok(allFiles.length > 0, 'Expected source files under apps/ops/src');

  const violations = [];
  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const rel = path.relative(OPS_ROOT, filePath);
    for (const pattern of forbiddenPatterns) {
      if (pattern.regex.test(content)) {
        violations.push(`${rel}: matched ${pattern.name}`);
      }
    }
  }

  assert.deepEqual(violations, [], `Forbidden mock/hardcoded references found:\n${violations.join('\n')}`);
});

test('6. Employee gender uses OTHER enum (zero UNSPECIFIED), InfoWindows use escapeHtml, and analytics uses single fleet-wide call', () => {
  // (a) Employee gender enum alignment (Prisma CorporateGender = MALE | FEMALE | OTHER)
  const employeesSrc = readOpsFile('app/employees/page.tsx');
  assert.equal(employeesSrc.includes('UNSPECIFIED'), false, 'employees/page.tsx must not contain UNSPECIFIED');
  assert.match(employeesSrc, /gender:\s*'OTHER'/);
  assert.match(employeesSrc, /<option value="OTHER">/);

  const opsTypesSrc = readOpsFile('lib/api/opsTypes.ts');
  assert.equal(opsTypesSrc.includes('UNSPECIFIED'), false, 'opsTypes.ts must not contain UNSPECIFIED');

  // (b) Stored XSS protection via escapeHtml in Google Maps InfoWindows
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('xss')">&`),
    '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;&amp;',
  );
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');

  const googleRouteMapSrc = readOpsFile('components/maps/GoogleRouteMap.tsx');
  assert.match(googleRouteMapSrc, /escapeHtml\s*\(\s*stop\.employeeName/);
  assert.match(googleRouteMapSrc, /escapeHtml\s*\(\s*stop\.addressText/);
  assert.match(googleRouteMapSrc, /escapeHtml\s*\(\s*office\.name/);

  const plannerSrc = readOpsFile('app/planner/page.tsx');
  assert.match(plannerSrc, /escapeHtml\s*\(\s*locationShortcut\s*\)/);
  assert.match(plannerSrc, /escapeHtml\s*\(\s*stop\.name\s*\)/);
  assert.match(plannerSrc, /escapeHtml\s*\(\s*stop\.matchedAddress\s*\)/);

  // (c) Single fleet-wide analytics request when ALL is selected (no N-tenant fan-out)
  const analyticsSrc = readOpsFile('app/dashboard/analytics/page.tsx');
  assert.equal(analyticsSrc.includes('Promise.allSettled'), false, 'analytics must not fan out per-tenant requests');
  assert.match(analyticsSrc, /tenantId:\s*tenantId\s*===\s*'ALL'\s*\?\s*undefined\s*:\s*tenantId/);
  assert.match(analyticsSrc, /AbortController/);
  assert.match(analyticsSrc, /minimal:\s*true/);

  // (d) Visibility-aware SOS polling with activeOnly and stable map office-marker effect
  const topBarSrc = readOpsFile('components/layout/OpsTopBar.tsx');
  assert.match(topBarSrc, /activeOnly:\s*true/);
  assert.match(topBarSrc, /document\.hidden/);

  const exceptionsSrc = readOpsFile('app/dashboard/exceptions/page.tsx');
  assert.match(exceptionsSrc, /activeOnly:\s*true/);
  assert.match(exceptionsSrc, /document\.hidden/);

  const cockpitSrc = readOpsFile('app/safety/cockpit/page.tsx');
  assert.match(cockpitSrc, /document\.hidden/);

  const mapSrc = readOpsFile('app/map/page.tsx');
  assert.equal(
    /\[mapReady,\s*selectedTenantId,\s*selectedCompany,\s*companies,\s*routes,\s*ui\.gpsCount\]/.test(mapSrc),
    false,
    'map office-marker effect must not depend on ui.gpsCount',
  );
});

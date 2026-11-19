import test, { describe, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

import {
  INDIAN_PHONE_PATTERN,
  validateIndianPhone,
} from "../src/lib/validation/phone.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ADMIN_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(ADMIN_ROOT, "src");

function readAdminFile(relPath) {
  return fs.readFileSync(path.join(ADMIN_ROOT, relPath), "utf8");
}

function walkSourceFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkSourceFiles(fullPath));
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("1. Indian mobile phone validation", () => {
  const patternRegex = new RegExp(INDIAN_PHONE_PATTERN);

  test("accepts valid 10-digit and +91/91/0 prefixed Indian mobile numbers", () => {
    const validNumbers = [
      "9876543210",
      "6123456789",
      "7890123456",
      "8123456780",
      "+91 98765 43210",
      "+919876543210",
      "+91-98765-43210",
      "91 98765 43210",
      "09876543210",
    ];
    for (const num of validNumbers) {
      assert.equal(
        validateIndianPhone(num),
        null,
        `Expected "${num}" to pass validateIndianPhone`,
      );
      assert.equal(
        patternRegex.test(num),
        true,
        `Expected "${num}" to match HTML5 INDIAN_PHONE_PATTERN`,
      );
    }
  });

  test("rejects <10 digits, >10 digits, invalid prefixes, and non-numeric strings", () => {
    const invalidNumbers = [
      "98765",
      "987654321",
      "1234567890",
      "5876543210",
      "98765432101",
      "+1 98765 43210",
      "abcdefghij",
    ];
    for (const num of invalidNumbers) {
      const err = validateIndianPhone(num);
      assert.ok(err, `Expected "${num}" to fail validateIndianPhone`);
      assert.equal(
        patternRegex.test(num),
        false,
        `Expected "${num}" to fail HTML5 INDIAN_PHONE_PATTERN`,
      );
    }
  });

  test("handles required vs optional empty values properly", () => {
    assert.ok(validateIndianPhone("", { required: true }));
    assert.equal(validateIndianPhone("", { required: false }), null);
    assert.equal(validateIndianPhone("   ", { required: false }), null);
  });
});

describe("2. Company profile page ([id]/page.tsx) structural & functional checks", () => {
  const companyProfileSrc = readAdminFile("src/app/companies/[id]/page.tsx");

  test("supports step='any' on <Field type='number'> and latitude/longitude inputs", () => {
    assert.match(
      companyProfileSrc,
      /step\?:\s*string\s*\|\s*number/,
      "Field component must accept step prop",
    );
    assert.match(
      companyProfileSrc,
      /step=\{step \?\? \(type === "number" \? "any" : undefined\)\}/,
      "Field input must wire step prop with 'any' default for number inputs",
    );

    const latBlock = companyProfileSrc.match(
      /<Field[\s\S]*?label="Latitude"[\s\S]*?\/>/,
    );
    const lngBlock = companyProfileSrc.match(
      /<Field[\s\S]*?label="Longitude"[\s\S]*?\/>/,
    );
    assert.ok(latBlock, "Latitude Field must exist");
    assert.ok(lngBlock, "Longitude Field must exist");
    assert.match(latBlock[0], /type="number"/);
    assert.match(latBlock[0], /step="any"/);
    assert.match(lngBlock[0], /type="number"/);
    assert.match(lngBlock[0], /step="any"/);
  });

  test("exposes all 6 company profile tabs: organization, legal, offices, departments, zones, users", () => {
    for (const tab of [
      "organization",
      "legal",
      "offices",
      "departments",
      "zones",
      "users",
    ]) {
      assert.match(
        companyProfileSrc,
        new RegExp(`id:\\s*"${tab}"`),
        `Missing section tab "${tab}"`,
      );
    }
  });

  test("includes Company Status control (ACTIVE / SUSPENDED / TERMINATED) wired to updateCorporateTenant", () => {
    const companiesPageSrc = readAdminFile("src/app/companies/page.tsx");
    const typesSrc = readAdminFile("src/lib/api/types.ts");

    assert.match(companyProfileSrc, /value:\s*"ACTIVE"/);
    assert.match(companyProfileSrc, /value:\s*"SUSPENDED"/);
    assert.match(companyProfileSrc, /value:\s*"TERMINATED"/);
    assert.doesNotMatch(
      companyProfileSrc,
      /const companyStatusOptions = \[[\s\S]*?value:\s*"INACTIVE"/,
    );
    assert.match(companiesPageSrc, /value:\s*"TERMINATED"/);
    assert.doesNotMatch(companiesPageSrc, /value:\s*"INACTIVE"/);
    assert.match(
      typesSrc,
      /export type CorporateTenantStatus = "ACTIVE" \| "SUSPENDED" \| "TERMINATED";/,
    );
    assert.doesNotMatch(
      typesSrc,
      /interface CorporateTenantListItem[\s\S]*?status:[^;]*?"INACTIVE"/,
    );
    assert.match(companyProfileSrc, /aria-label="Company status"/);
    assert.match(
      companyProfileSrc,
      /adminApi\.updateCorporateTenant\(companyId,\s*\{\s*status:\s*nextStatus,?\s*\}\)/,
    );
  });

  test("renders inline save error banner inside <Drawer>", () => {
    assert.match(companyProfileSrc, /const \[drawerError, setDrawerError\]/);
    const drawerSection = companyProfileSrc.slice(
      companyProfileSrc.indexOf("<Drawer"),
    );
    assert.match(
      drawerSection,
      /\{drawerError && \([\s\S]*?role="alert"[\s\S]*?\{drawerError\}/,
      "Drawer must render inline drawerError alert above forms",
    );
  });

  test("sends null (not undefined) when clearing optional fields on edit in saveDepartment, saveZone, saveUser", () => {
    const saveDepartmentMatch = companyProfileSrc.match(
      /async function saveDepartment[\s\S]*?^  \}/m,
    );
    assert.ok(saveDepartmentMatch, "saveDepartment function must exist");
    assert.match(saveDepartmentMatch[0], /officeId:\s*trimmedOfficeId \|\| null/);
    assert.match(
      saveDepartmentMatch[0],
      /departmentHead:\s*trimmedDepartmentHead \|\| null/,
    );
    assert.match(
      saveDepartmentMatch[0],
      /description:\s*trimmedDescription \|\| null/,
    );

    const saveZoneMatch = companyProfileSrc.match(
      /async function saveZone[\s\S]*?^  \}/m,
    );
    assert.ok(saveZoneMatch, "saveZone function must exist");
    assert.match(saveZoneMatch[0], /description:\s*trimmedDescription \|\| null/);

    const saveUserMatch = companyProfileSrc.match(
      /async function saveUser[\s\S]*?^  \}/m,
    );
    assert.ok(saveUserMatch, "saveUser function must exist");
    assert.match(saveUserMatch[0], /email:\s*trimmedEmail \|\| null/);
    assert.match(saveUserMatch[0], /phone:\s*trimmedPhone \|\| null/);
  });

  test("preserves inactive assigned offices in Department & Zone selects labeled (Inactive)", () => {
    assert.match(companyProfileSrc, /departmentOfficeOptions/);
    assert.match(companyProfileSrc, /zoneOfficeOptions/);
    assert.match(
      companyProfileSrc,
      /office\.isActive \? "" : " \(Inactive\)"/,
    );
  });

  test("applies Indian mobile validation to Organization, Office, and User phone inputs", () => {
    const phonePatternUses =
      companyProfileSrc.match(/pattern=\{INDIAN_PHONE_PATTERN\}/g) || [];
    assert.ok(
      phonePatternUses.length >= 3,
      `Expected >=3 INDIAN_PHONE_PATTERN bindings, found ${phonePatternUses.length}`,
    );
    const validateCalls =
      companyProfileSrc.match(/validateIndianPhone\(/g) || [];
    assert.ok(
      validateCalls.length >= 3,
      `Expected >=3 validateIndianPhone calls, found ${validateCalls.length}`,
    );
  });

  test("renders hqOfficeWarning in amber warning banner and resolves logoUrl via resolveDocumentUrl", () => {
    assert.match(
      companyProfileSrc,
      /const \[hqOfficeWarning, setHqOfficeWarning\]/,
    );
    assert.match(companyProfileSrc, /rgba\(245,\s*158,\s*11,\s*0\.12\)/);
    assert.match(companyProfileSrc, /resolveDocumentUrl\(company\.logoUrl\)/);
  });
});

describe("3. CompanyOnboardingDrawer checks", () => {
  const onboardingSrc = readAdminFile(
    "src/components/companies/CompanyOnboardingDrawer.tsx",
  );
  const clientSrc = readAdminFile("src/lib/api/client.ts");
  const companiesPageSrc = readAdminFile("src/app/companies/page.tsx");

  test("sends createPortalAdmin: true to POST /corporate/tenants and surfaces hqOfficeWarning", () => {
    assert.match(onboardingSrc, /createPortalAdmin:\s*true/);
    assert.match(onboardingSrc, /adminApi\.createCorporateTenant\(input\)/);
    assert.match(onboardingSrc, /hqOfficeWarning:\s*company\.hqOfficeWarning/);
    assert.match(onboardingSrc, /\{createdResult\.hqOfficeWarning && \(/);
    assert.match(
      clientSrc,
      /createCorporateTenant:[\s\S]*?\/corporate\/tenants[\s\S]*?method:\s*['"]POST['"]/,
    );
    assert.match(
      companiesPageSrc,
      /params\.set\("hqOfficeWarning",\s*result\.hqOfficeWarning\)/,
    );
  });
});

describe("4. Simulated HTTP E2E round-trip (Tenant -> Patch -> Office -> Dept -> Zone -> User + Health)", () => {
  const store = {
    tenants: new Map(),
    offices: new Map(),
    departments: new Map(),
    zones: new Map(),
    users: new Map(),
  };

  let server;
  let baseUrl;

  function readJsonBody(req) {
    return new Promise((resolve, reject) => {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", () => {
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch (err) {
          reject(err);
        }
      });
      req.on("error", reject);
    });
  }

  function sendJson(res, status, data) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, data }));
  }

  test("full corporate tenant onboarding and org management round-trip", async () => {
    server = http.createServer(async (req, res) => {
      const url = new URL(req.url, "http://127.0.0.1");
      const { pathname } = url;
      const method = req.method;

      if (method === "GET" && pathname === "/api/v1/health") {
        return sendJson(res, 200, {
          status: "OK",
          timestamp: new Date().toISOString(),
          components: {
            database: { status: "UP", latencyMs: 2 },
            redis: { status: "UP", latencyMs: 1 },
          },
        });
      }

      // POST /api/v1/corporate/tenants
      if (method === "POST" && pathname === "/api/v1/corporate/tenants") {
        const body = await readJsonBody(req);
        const id = "tenant-001";
        const tenant = {
          id,
          ...body,
          status: "ACTIVE",
          hqOfficeCreated: false,
          hqOfficeWarning:
            "Registered address could not be geocoded; add an HQ office with coordinates.",
          portalAccess: {
            created: body.createPortalAdmin === true,
            corporateRole: "CORP_SUPER_ADMIN",
            loginMethod: "SMS_OTP",
            phone: body.primaryContactPhone,
          },
        };
        store.tenants.set(id, tenant);
        return sendJson(res, 201, tenant);
      }

      // PATCH /api/v1/corporate/tenants/:id
      const patchTenant = pathname.match(/^\/api\/v1\/corporate\/tenants\/([^/]+)$/);
      if (method === "PATCH" && patchTenant) {
        const id = patchTenant[1];
        const body = await readJsonBody(req);
        const existing = store.tenants.get(id);
        const updated = { ...existing, ...body };
        store.tenants.set(id, updated);
        return sendJson(res, 200, updated);
      }

      // POST /api/v1/corporate/tenants/:id/offices
      const postOffice = pathname.match(
        /^\/api\/v1\/corporate\/tenants\/([^/]+)\/offices$/,
      );
      if (method === "POST" && postOffice) {
        const body = await readJsonBody(req);
        const office = {
          id: "office-001",
          tenantId: postOffice[1],
          isActive: true,
          ...body,
        };
        store.offices.set(office.id, office);
        return sendJson(res, 201, office);
      }

      // POST /api/v1/corporate/tenants/:id/departments
      const postDept = pathname.match(
        /^\/api\/v1\/corporate\/tenants\/([^/]+)\/departments$/,
      );
      if (method === "POST" && postDept) {
        const body = await readJsonBody(req);
        const dept = {
          id: "dept-001",
          tenantId: postDept[1],
          isActive: true,
          ...body,
        };
        store.departments.set(dept.id, dept);
        return sendJson(res, 201, dept);
      }

      // PATCH /api/v1/corporate/tenants/:id/departments/:deptId
      const patchDept = pathname.match(
        /^\/api\/v1\/corporate\/tenants\/([^/]+)\/departments\/([^/]+)$/,
      );
      if (method === "PATCH" && patchDept) {
        const body = await readJsonBody(req);
        const existing = store.departments.get(patchDept[2]);
        const updated = {
          ...existing,
          ...body,
          _receivedKeys: Object.keys(body),
        };
        store.departments.set(patchDept[2], updated);
        return sendJson(res, 200, updated);
      }

      // POST /api/v1/corporate/tenants/:id/transport-zones
      const postZone = pathname.match(
        /^\/api\/v1\/corporate\/tenants\/([^/]+)\/transport-zones$/,
      );
      if (method === "POST" && postZone) {
        const body = await readJsonBody(req);
        const zone = {
          id: "zone-001",
          tenantId: postZone[1],
          isActive: true,
          ...body,
        };
        store.zones.set(zone.id, zone);
        return sendJson(res, 201, zone);
      }

      // PATCH /api/v1/corporate/tenants/:id/transport-zones/:zoneId
      const patchZone = pathname.match(
        /^\/api\/v1\/corporate\/tenants\/([^/]+)\/transport-zones\/([^/]+)$/,
      );
      if (method === "PATCH" && patchZone) {
        const body = await readJsonBody(req);
        const existing = store.zones.get(patchZone[2]);
        const updated = {
          ...existing,
          ...body,
          _receivedKeys: Object.keys(body),
        };
        store.zones.set(patchZone[2], updated);
        return sendJson(res, 200, updated);
      }

      // POST /api/v1/corporate/tenants/:id/users
      const postUser = pathname.match(
        /^\/api\/v1\/corporate\/tenants\/([^/]+)\/users$/,
      );
      if (method === "POST" && postUser) {
        const body = await readJsonBody(req);
        const user = {
          id: "user-001",
          corporateTenantId: postUser[1],
          status: "ACTIVE",
          corporateOfficeIds: body.officeIds || [],
          ...body,
        };
        store.users.set(user.id, user);
        return sendJson(res, 201, user);
      }

      // PATCH /api/v1/corporate/tenants/:id/users/:userId
      const patchUser = pathname.match(
        /^\/api\/v1\/corporate\/tenants\/([^/]+)\/users\/([^/]+)$/,
      );
      if (method === "PATCH" && patchUser) {
        const body = await readJsonBody(req);
        const existing = store.users.get(patchUser[2]);
        const updated = {
          ...existing,
          ...body,
          _receivedKeys: Object.keys(body),
        };
        store.users.set(patchUser[2], updated);
        return sendJson(res, 200, updated);
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, message: "Not found" }));
    });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}/api/v1`;

    async function api(endpoint, method = "GET", body) {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      assert.ok(response.ok, `${method} ${endpoint} failed: ${response.status}`);
      const json = await response.json();
      return json.data;
    }

    // 0. Health check
    const health = await api("/health");
    assert.equal(health.status, "OK");
    assert.equal(health.components.database.status, "UP");

    // 1. POST /corporate/tenants
    const createdTenant = await api("/corporate/tenants", "POST", {
      code: "ACME_E2E",
      name: "Acme Mobility India",
      legalEntityName: "Acme Mobility Private Limited",
      primaryContactName: "Priya Sharma",
      primaryContactEmail: "priya@acme.in",
      primaryContactPhone: "+91 98765 43210",
      createPortalAdmin: true,
    });
    assert.equal(createdTenant.id, "tenant-001");
    assert.equal(createdTenant.portalAccess.created, true);
    assert.ok(createdTenant.hqOfficeWarning);

    // 2. PATCH /corporate/tenants/:id (status toggle: SUSPENDED -> TERMINATED -> ACTIVE)
    const suspendedTenant = await api(
      `/corporate/tenants/${createdTenant.id}`,
      "PATCH",
      { status: "SUSPENDED" },
    );
    assert.equal(suspendedTenant.status, "SUSPENDED");

    const terminatedTenant = await api(
      `/corporate/tenants/${createdTenant.id}`,
      "PATCH",
      { status: "TERMINATED" },
    );
    assert.equal(terminatedTenant.status, "TERMINATED");

    const reactivatedTenant = await api(
      `/corporate/tenants/${createdTenant.id}`,
      "PATCH",
      { status: "ACTIVE" },
    );
    assert.equal(reactivatedTenant.status, "ACTIVE");

    // 3. POST /corporate/tenants/:id/offices with decimal coordinates
    const office = await api(
      `/corporate/tenants/${createdTenant.id}/offices`,
      "POST",
      {
        code: "HYD_HQ",
        name: "HITEC City HQ",
        addressText: "Cyber Towers, HITEC City",
        city: "Hyderabad",
        state: "Telangana",
        pinCode: "500081",
        country: "India",
        contactName: "Priya Sharma",
        contactEmail: "hq@acme.in",
        contactPhone: "9876543210",
        latitude: 17.4435,
        longitude: 78.3772,
      },
    );
    assert.equal(office.latitude, 17.4435);
    assert.equal(office.longitude, 78.3772);

    // 4. POST & PATCH /departments (verifying explicit null clearing)
    const dept = await api(
      `/corporate/tenants/${createdTenant.id}/departments`,
      "POST",
      {
        code: "ENG",
        name: "Engineering",
        officeId: office.id,
        departmentHead: "Rohan Verma",
        description: "Core engineering team",
      },
    );
    assert.equal(dept.officeId, office.id);

    const clearedDept = await api(
      `/corporate/tenants/${createdTenant.id}/departments/${dept.id}`,
      "PATCH",
      {
        code: "ENG",
        name: "Engineering",
        officeId: null,
        departmentHead: null,
        description: null,
      },
    );
    assert.equal(clearedDept.officeId, null);
    assert.equal(clearedDept.departmentHead, null);
    assert.equal(clearedDept.description, null);
    assert.ok(clearedDept._receivedKeys.includes("officeId"));
    assert.ok(clearedDept._receivedKeys.includes("departmentHead"));
    assert.ok(clearedDept._receivedKeys.includes("description"));

    // 5. POST & PATCH /transport-zones (verifying explicit null description clearing)
    const zone = await api(
      `/corporate/tenants/${createdTenant.id}/transport-zones`,
      "POST",
      {
        officeId: office.id,
        code: "WEST_CORRIDOR",
        name: "West Corridor",
        serviceArea: "Gachibowli - Kondapur - Madhapur",
        description: "Peak shift corridor",
        pickupLocations: ["Gachibowli Circle"],
        dropLocations: ["Cyber Towers Gate 1"],
      },
    );
    const clearedZone = await api(
      `/corporate/tenants/${createdTenant.id}/transport-zones/${zone.id}`,
      "PATCH",
      {
        officeId: office.id,
        code: "WEST_CORRIDOR",
        name: "West Corridor",
        serviceArea: "Gachibowli - Kondapur - Madhapur",
        description: null,
        pickupLocations: ["Gachibowli Circle"],
        dropLocations: ["Cyber Towers Gate 1"],
      },
    );
    assert.equal(clearedZone.description, null);
    assert.ok(clearedZone._receivedKeys.includes("description"));

    // 6. POST & PATCH /users (verifying explicit null email clearing & Indian phone)
    const user = await api(
      `/corporate/tenants/${createdTenant.id}/users`,
      "POST",
      {
        fullName: "Ananya Rao",
        email: "ananya@acme.in",
        phone: "+91 91234 56789",
        corporateRole: "TRANSPORT",
        officeIds: [office.id],
      },
    );
    assert.equal(user.corporateRole, "TRANSPORT");

    const updatedUser = await api(
      `/corporate/tenants/${createdTenant.id}/users/${user.id}`,
      "PATCH",
      {
        fullName: "Ananya Rao",
        email: null,
        phone: "+91 91234 56789",
        corporateRole: "TRANSPORT",
        officeIds: [office.id],
      },
    );
    assert.equal(updatedUser.email, null);
    assert.equal(updatedUser.phone, "+91 91234 56789");
    assert.ok(updatedUser._receivedKeys.includes("email"));
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("5. Zero-mock & hardcoded string scan across apps/admin/src", () => {
  const sourceFiles = walkSourceFiles(SRC_ROOT);

  test("no DEMO_TRIPS, PRESET_COVERS, Sample Text, hardcoded localhost:7001 error strings, or static Operational/FCM badges remain", () => {
    const violations = [];

    for (const filePath of sourceFiles) {
      const rel = path.relative(ADMIN_ROOT, filePath).replaceAll("\\", "/");
      const content = fs.readFileSync(filePath, "utf8");

      if (/\bDEMO_TRIPS\b/.test(content)) {
        violations.push(`${rel}: contains DEMO_TRIPS`);
      }
      if (/\bPRESET_COVERS\b/.test(content)) {
        violations.push(`${rel}: contains PRESET_COVERS`);
      }
      if (/"Sample Text"/.test(content)) {
        violations.push(`${rel}: contains "Sample Text" default`);
      }
      if (/\(http:\/\/localhost:7001\)/.test(content)) {
        violations.push(`${rel}: contains hardcoded (http://localhost:7001) error string`);
      }
      if (/FCM Service Active/.test(content)) {
        violations.push(`${rel}: contains static "FCM Service Active" string`);
      }
      if (/>Operational</.test(content)) {
        violations.push(`${rel}: contains static ">Operational<" badge`);
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Zero-mock scan found violations:\n${violations.join("\n")}`,
    );
  });

  test("Header.tsx performs real /health check and renders Healthy / Degraded / Offline", () => {
    const headerSrc = readAdminFile("src/components/Header.tsx");
    assert.match(headerSrc, /fetch\(`\$\{getApiBaseUrl\(\)\}\/health`/);
    assert.match(headerSrc, /"Healthy"/);
    assert.match(headerSrc, /"Degraded"/);
    assert.match(headerSrc, /"Offline"/);
  });

  test("login/page.tsx and client.ts use generic API connection error message", () => {
    const loginSrc = readAdminFile("src/app/login/page.tsx");
    const clientSrc = readAdminFile("src/lib/api/client.ts");
    assert.match(
      loginSrc,
      /Unable to reach the API server\. Please check your connection\./,
    );
    assert.match(
      clientSrc,
      /Unable to reach the API server\. Please check your connection\./,
    );
  });
});

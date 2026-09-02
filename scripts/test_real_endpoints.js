/**
 * AdhocX Real Endpoints Verification Suite
 * Executes live HTTP requests against NestJS API at http://localhost:7001/api/v1
 */

const BASE_URL = 'http://localhost:7001/api/v1';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Starting AdhocX Real Endpoints Verification Suite');
  console.log('Target API:', BASE_URL);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`⏳ Testing: ${name}... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log('❌ FAILED');
      console.error('   Error:', err.message);
      failed++;
    }
  }

  let driverToken = null;
  let driverRequestId = null;
  let vendorToken = null;
  let vendorRequestId = null;
  let adminToken = null;
  let adminRequestId = null;

  const testDriverPhone = '+919876543210';
  const testVendorPhone = '+919876543211';
  const testAdminPhone = '+919876543212';

  // 1. Root Status
  await test('GET / - API Root Status & Endpoint Map', async () => {
    const res = await fetch(`${BASE_URL}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const body = await res.json();
    const data = body.data || body;
    if (data.status !== 'ONLINE') {
      throw new Error(`Status not ONLINE: ${JSON.stringify(body)}`);
    }
  });

  // 2. Health & Liveness Check
  await test('GET /health - System Liveness & Component Health', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (!body.success && !body.data) {
      throw new Error(`Unexpected health payload: ${JSON.stringify(body)}`);
    }
  });

  // 3. Auth OTP Request for Driver
  await test('POST /auth/otp/request - Driver Request OTP', async () => {
    const res = await fetch(`${BASE_URL}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testDriverPhone,
        role: 'DRIVER',
        isRegister: true,
        fullName: 'Rahul Sharma',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const body = await res.json();
    const data = body.data || body;
    if (!data.requestId) throw new Error(`Missing requestId: ${JSON.stringify(body)}`);
    driverRequestId = data.requestId;
  });

  // 4. Auth OTP Verify for Driver
  await test('POST /auth/otp/verify - Driver OTP Verify & JWT Issuance', async () => {
    const res = await fetch(`${BASE_URL}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: driverRequestId,
        phone: testDriverPhone,
        otp: '123456',
        role: 'DRIVER',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const body = await res.json();
    const data = body.data || body;
    if (!data.accessToken) throw new Error('Missing accessToken');
    driverToken = data.accessToken;
  });

  // 5. Authenticated /auth/me
  await test('GET /auth/me - Authenticated Driver Profile Check', async () => {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const body = await res.json();
    const user = body.data || body;
    if (!user.phone) throw new Error(`Missing user phone in profile: ${JSON.stringify(user)}`);
  });

  // 6. Driver Availability Update
  await test('PATCH /drivers/availability - Update Availability to AVAILABLE', async () => {
    const res = await fetch(`${BASE_URL}/drivers/availability`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ status: 'AVAILABLE' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  });

  // 7. Driver Cloudflare R2 Document Upload
  await test('POST /drivers/documents/upload - Cloudflare R2 KYC Document Stream', async () => {
    const fakeDoc = Buffer.from('PDF_SAMPLE_DRIVING_LICENSE_DATA_2026').toString('base64');
    const res = await fetch(`${BASE_URL}/drivers/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        filename: 'driving_license_front.pdf',
        mimeType: 'application/pdf',
        contentBase64: fakeDoc,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const body = await res.json();
    const data = body.data || body;
    if (!data.url) throw new Error(`Missing document URL: ${JSON.stringify(body)}`);
  });

  // 8. Driver KYC Submission
  await test('POST /drivers/kyc - Driver Complete KYC Submission', async () => {
    const res = await fetch(`${BASE_URL}/drivers/kyc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        idNumber: '123456789012',
        dlNumber: 'DL-0420110012345',
        panNumber: 'ABCDE1234F',
        rcNumber: 'TS09EA1234',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  });

  // 9. Vendor Authentication
  await test('POST /auth/otp/verify - Vendor Login & Profile Setup', async () => {
    const reqRes = await fetch(`${BASE_URL}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testVendorPhone,
        role: 'VENDOR',
        isRegister: true,
      }),
    });
    const reqBody = await reqRes.json();
    vendorRequestId = (reqBody.data || reqBody).requestId;

    const verifyRes = await fetch(`${BASE_URL}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: vendorRequestId,
        phone: testVendorPhone,
        otp: '123456',
        role: 'VENDOR',
      }),
    });
    if (!verifyRes.ok) throw new Error(`HTTP ${verifyRes.status}: ${await verifyRes.text()}`);
    const body = await verifyRes.json();
    vendorToken = (body.data || body).accessToken;
  });

  // 10. Vendor Profile Creation
  await test('POST /vendors/profile - Create Vendor Organization Details', async () => {
    const res = await fetch(`${BASE_URL}/vendors/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vendorToken}`,
      },
      body: JSON.stringify({
        organizationName: 'Hyderabad Express Fleet Logistics',
        fullName: 'Rahul Sharma',
        gstNumber: '36AAAAA1234A1Z5',
        address: 'HITEC City, Hyderabad, Telangana',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  });

  // 11. Vendor Post Requirement
  await test('POST /requirements - Post Cab Transportation Requirement', async () => {
    const res = await fetch(`${BASE_URL}/requirements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vendorToken}`,
      },
      body: JSON.stringify({
        vehicleType: 'SEDAN',
        quantity: 1,
        pickupLocation: {
          address: 'Gachibowli DLF Cybercity, Hyderabad',
          latitude: 17.4435,
          longitude: 78.3772,
        },
        dropLocation: {
          address: 'Rajiv Gandhi International Airport, Hyderabad',
          latitude: 17.2403,
          longitude: 78.4294,
        },
        reportingTime: new Date(Date.now() + 3600000).toISOString(),
        ratePerVehicle: 1200.0,
      }),
    });
    if (!res.ok && res.status !== 201) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  });

  // 12. Driver List Offers
  await test('GET /offers - Driver View Proximity Dispatch Offers', async () => {
    const res = await fetch(`${BASE_URL}/offers`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  });

  // 13. Driver Wallet Summary
  await test('GET /driver/wallet - Driver Double-Entry Ledger Summary', async () => {
    const res = await fetch(`${BASE_URL}/driver/wallet`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  });

  // 14. Admin Authentication & Metrics
  await test('GET /admin/metrics - Admin Operational Performance Metrics', async () => {
    // Auth as Admin
    const reqRes = await fetch(`${BASE_URL}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testAdminPhone,
        role: 'ADMIN',
        isRegister: true,
      }),
    });
    const reqBody = await reqRes.json();
    adminRequestId = (reqBody.data || reqBody).requestId;

    const verifyRes = await fetch(`${BASE_URL}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: adminRequestId,
        phone: testAdminPhone,
        otp: '123456',
        role: 'ADMIN',
      }),
    });
    const body = await verifyRes.json();
    adminToken = (body.data || body).accessToken;

    const res = await fetch(`${BASE_URL}/admin/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  });

  console.log('\n====================================================');
  console.log(`🎉 Final Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

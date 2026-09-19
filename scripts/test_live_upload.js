const FormData = require('form-data');

const BASE_URL = 'http://127.0.0.1:7001/api/v1';

async function main() {
  console.log('=== Verifying AdhocX Central File Sanitizer & Upload Security ===\n');

  // 1. Authenticate driver
  const reqRes = await fetch(`${BASE_URL}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '+919876543210',
      role: 'DRIVER',
      isRegister: true,
      fullName: 'Rahul Sharma',
    }),
  });
  const reqData = await reqRes.json();
  const verifyRes = await fetch(`${BASE_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestId: reqData.data.requestId,
      phone: '+919876543210',
      otp: '123456',
      role: 'DRIVER',
    }),
  });
  const verifyData = await verifyRes.json();
  const token = verifyData.data.accessToken;
  console.log('✅ Driver authenticated successfully. Token obtained.');

  const validJpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb,
  ]);
  const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');

  // Test 1: Multipart upload with valid JPEG magic bytes
  {
    const form = new FormData();
    form.append('documentType', 'DRIVING_LICENSE');
    form.append('document', validJpeg, {
      filename: 'driving_license.jpg',
      contentType: 'image/jpeg',
    });
    const res = await fetch(`${BASE_URL}/drivers/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() },
      body: form.getBuffer(),
    });
    const data = await res.json();
    console.log(`Test 1 [Valid JPEG Multipart Upload]: Status ${res.status}`);
    if (res.status !== 201 || !data.data?.url) {
      throw new Error(`Test 1 failed: ${JSON.stringify(data)}`);
    }
    console.log(`  -> URL: ${data.data.url}`);
    console.log(`  -> Checksum: ${data.data.checksum}`);
  }

  // Test 2: Client default application/octet-stream with true JPEG magic bytes
  {
    const form = new FormData();
    form.append('documentType', 'RC_BOOK');
    form.append('document', validJpeg, {
      filename: 'rc_book.jpg',
      contentType: 'application/octet-stream',
    });
    const res = await fetch(`${BASE_URL}/drivers/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() },
      body: form.getBuffer(),
    });
    const data = await res.json();
    console.log(`Test 2 [Octet-Stream Header with JPEG Magic Bytes]: Status ${res.status}`);
    if (res.status !== 201 || !data.data?.url) {
      throw new Error(`Test 2 failed: ${JSON.stringify(data)}`);
    }
    console.log(`  -> URL: ${data.data.url}`);
  }

  // Test 3: Valid PDF upload
  {
    const form = new FormData();
    form.append('documentType', 'INSURANCE');
    form.append('document', validPdf, {
      filename: 'insurance.pdf',
      contentType: 'application/pdf',
    });
    const res = await fetch(`${BASE_URL}/drivers/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() },
      body: form.getBuffer(),
    });
    const data = await res.json();
    console.log(`Test 3 [Valid PDF Upload]: Status ${res.status}`);
    if (res.status !== 201 || !data.data?.url) {
      throw new Error(`Test 3 failed: ${JSON.stringify(data)}`);
    }
    console.log(`  -> URL: ${data.data.url}`);
  }

  // Test 4: Base64 JSON upload
  {
    const res = await fetch(`${BASE_URL}/drivers/documents/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentType: 'PAN_CARD',
        filename: 'pan_card.pdf',
        contentBase64: validPdf.toString('base64'),
      }),
    });
    const data = await res.json();
    console.log(`Test 4 [Base64 JSON Upload]: Status ${res.status}`);
    if (res.status !== 201 || !data.data?.url) {
      throw new Error(`Test 4 failed: ${JSON.stringify(data)}`);
    }
    console.log(`  -> URL: ${data.data.url}`);
  }

  // Test 5: Rejection of Windows executable masquerading as JPEG (MZ header)
  {
    const form = new FormData();
    form.append('documentType', 'AADHAR_FRONT');
    const fakeExe = Buffer.concat([
      Buffer.from([0x4d, 0x5a, 0x90, 0x00]),
      Buffer.alloc(20),
    ]);
    form.append('document', fakeExe, {
      filename: 'trojan_disguised.jpg',
      contentType: 'image/jpeg',
    });
    const res = await fetch(`${BASE_URL}/drivers/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() },
      body: form.getBuffer(),
    });
    console.log(`Test 5 [Blocked Disguised Executable Header]: Status ${res.status} (Expected 400)`);
    if (res.status !== 400) {
      throw new Error(`Test 5 failed: Expected 400, got ${res.status}`);
    }
  }

  // Test 6: Rejection of embedded script injection (constructed at runtime)
  {
    const form = new FormData();
    form.append('documentType', 'AADHAR_BACK');
    // Base64 encoded test script tag
    const scriptPayload = Buffer.from('PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==', 'base64');
    const maliciousDoc = Buffer.concat([validJpeg, scriptPayload]);
    form.append('document', maliciousDoc, {
      filename: 'script_test.jpg',
      contentType: 'image/jpeg',
    });
    const res = await fetch(`${BASE_URL}/drivers/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() },
      body: form.getBuffer(),
    });
    console.log(`Test 6 [Blocked Script Injection]: Status ${res.status} (Expected 400)`);
    if (res.status !== 400) {
      throw new Error(`Test 6 failed: Expected 400, got ${res.status}`);
    }
  }

  console.log('\n🎉 ALL 6 LIVE SANITIZATION & SECURITY TESTS PASSED PERFECTLY!');
}

main().catch((err) => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});

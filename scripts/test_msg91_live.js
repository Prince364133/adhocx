require('dotenv').config();

const authKey = process.env.MSG91_AUTH_KEY;
const templateId = process.env.MSG91_OTP_TEMPLATE_ID || '6aec3196704f112ad8019976';
const sender = process.env.MSG91_SENDER_ID || 'ADHOCX';

console.log('--- MSG91 Configuration ---');
console.log('Auth Key:', authKey ? `${authKey.substring(0, 8)}...` : 'NOT FOUND');
console.log('Template ID:', templateId);
console.log('Sender ID:', sender);
console.log('---------------------------');

async function testMsg91Live() {
  const testPhone = '919876543210';
  const testOtp = '123456';

  const payload = {
    template_id: templateId,
    short_url: '0',
    sender: sender,
    recipients: [
      {
        mobiles: testPhone,
        num: testOtp,
        otp: testOtp,
        code: testOtp,
      },
    ],
  };

  console.log('\nDispatching test payload to MSG91 Flow API...');
  console.log('URL: https://control.msg91.com/api/v5/flow/');
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const res = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        authkey: authKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const status = res.status;
    const data = await res.json().catch(() => null);

    console.log('\n--- MSG91 API Response ---');
    console.log('HTTP Status:', status);
    console.log('Response Body:', JSON.stringify(data, null, 2));
    console.log('---------------------------');

    if (res.ok && data?.type !== 'error') {
      console.log('\n✅ SUCCESS: MSG91 accepted the SMS OTP dispatch!');
    } else {
      console.log('\n⚠️ NOTICE: MSG91 responded with error/warning.');
      if (data?.message?.includes('IP')) {
        console.log('👉 Reason: IP address whitelist restriction is active in your MSG91 dashboard.');
      } else if (data?.message?.includes('template') || data?.message?.includes('Pending')) {
        console.log('👉 Reason: DLT Template is still undergoing review / pending approval in MSG91.');
      }
    }
  } catch (err) {
    console.error('❌ Network / Fetch Exception:', err.message);
  }
}

testMsg91Live();


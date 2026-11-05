require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');

const authKey = process.env.MSG91_AUTH_KEY || '566812Axr8m5zl8a6aec3551P1';
const templateId = process.env.MSG91_OTP_TEMPLATE_ID || '6aec3196704f112ad8019976';
const sender = process.env.MSG91_SENDER_ID || 'ADHOCX';

const targetPhoneRaw = '916205170591';
const digitsOnly = targetPhoneRaw.replace(/\D/g, '');
const mobileForMsg91 = digitsOnly.startsWith('91') && digitsOnly.length === 12
  ? digitsOnly
  : `91${digitsOnly}`;
const e164 = `+${mobileForMsg91}`;

// Generate cryptographically secure 6-digit OTP
const generatedOtp = crypto.randomInt(100000, 1000000).toString();
const requestId = `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
const expirySeconds = 300; // 5 minutes

async function sendLiveOtp() {
  console.log('====================================================');
  console.log(`📱 Sending Live OTP to: ${e164} (${mobileForMsg91})`);
  console.log(`🔑 Generated 6-digit OTP: ${generatedOtp}`);
  console.log(`🆔 Request ID: ${requestId}`);
  console.log('====================================================');

  // 1. Store in Redis
  try {
    const redis = new Redis();
    await redis.set(`otp:${requestId}:${e164}`, generatedOtp, 'EX', expirySeconds);
    await redis.set(`otp_direct:${e164}`, generatedOtp, 'EX', expirySeconds);
    await redis.set(`otp_direct:${digitsOnly}`, generatedOtp, 'EX', expirySeconds);
    await redis.set(`otp_direct:${mobileForMsg91}`, generatedOtp, 'EX', expirySeconds);
    await redis.disconnect();
    console.log('✅ Stored OTP challenge in Redis (valid for 5 mins)');
  } catch (err) {
    console.warn('⚠️ Redis store notice:', err.message);
  }

  // 2. Persist challenge locally for verification script
  const scratchDir = path.join(__dirname, '../scratch');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  fs.writeFileSync(
    path.join(scratchDir, 'active_test_otp.json'),
    JSON.stringify(
      {
        phone: e164,
        mobileForMsg91,
        otp: generatedOtp,
        requestId,
        expiresAt: new Date(Date.now() + expirySeconds * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  // 3. Dispatch via MSG91 Flow API
  const payload = {
    template_id: templateId,
    short_url: '0',
    sender: sender,
    recipients: [
      {
        mobiles: mobileForMsg91,
        num: generatedOtp,
        otp: generatedOtp,
        code: generatedOtp,
      },
    ],
  };

  console.log('\nDispatching via MSG91 Flow API...');
  const res = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: {
      authkey: authKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const resData = await res.json().catch(() => null);
  console.log('HTTP Status:', res.status);
  console.log('MSG91 Response:', JSON.stringify(resData, null, 2));

  if (res.ok && resData?.type !== 'error') {
    console.log(`\n🎉 SUCCESS: OTP has been sent via SMS to ${e164}!`);
    console.log(`Campaign MsgID: ${resData?.message}`);
  } else {
    console.error(`\n❌ FAILED to send via MSG91:`, resData);
  }
}

sendLiveOtp();


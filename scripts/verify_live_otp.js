const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');

const inputOtp = process.argv[2]?.trim();

if (!inputOtp) {
  console.error('Usage: node scripts/verify_live_otp.js <OTP>');
  process.exit(1);
}

async function verify() {
  const scratchPath = path.join(__dirname, '../scratch/active_test_otp.json');
  if (!fs.existsSync(scratchPath)) {
    console.error('No active test OTP session found.');
    process.exit(1);
  }

  const session = JSON.parse(fs.readFileSync(scratchPath, 'utf8'));
  console.log(`Verifying OTP for phone: ${session.phone}`);
  console.log(`User provided OTP: ${inputOtp}`);

  let redisOtp = null;
  try {
    const redis = new Redis();
    redisOtp = await redis.get(`otp_direct:${session.phone}`);
    await redis.disconnect();
  } catch (err) {
    console.warn('Redis read note:', err.message);
  }

  const expectedOtp = redisOtp || session.otp;
  const isMatch = expectedOtp === inputOtp;

  if (isMatch) {
    console.log('\n🎉 VERIFICATION SUCCESS: OTP is valid and matches the issued code!');
  } else {
    console.log(`\n❌ VERIFICATION FAILED: Expected ${expectedOtp}, but received ${inputOtp}`);
  }
}

verify();


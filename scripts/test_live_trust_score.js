/**
 * Live Verification Script for 100-Point Driver Trust & Performance Score Endpoint
 * Tests GET /drivers/trust-score against http://127.0.0.1:7001/api/v1
 */

const BASE_URL = 'http://127.0.0.1:7001/api/v1';

async function main() {
  console.log('=== Verifying 100-Point Driver Trust & Performance Score Endpoint ===\n');

  // 1. Authenticate Driver
  const reqRes = await fetch(`${BASE_URL}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '+919876543210',
      role: 'DRIVER',
      isRegister: true,
      fullName: 'Rahul Sharma (Senior Driver)',
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
  const token = verifyData.data.token || verifyData.data.accessToken;

  if (!token) {
    throw new Error('Failed to obtain driver JWT token');
  }
  console.log('✅ Driver Authenticated. Token acquired.');

  // 2. Fetch Trust Score Breakdown
  const scoreRes = await fetch(`${BASE_URL}/drivers/trust-score`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const status = scoreRes.status;
  const body = await scoreRes.json();

  console.log(`\nResponse Status: ${status}`);
  console.log('Response Payload:', JSON.stringify(body, null, 2));

  if (status !== 200) {
    throw new Error(`Expected status 200, got ${status}`);
  }

  const scoreData = body.data || body;

  // 3. Assertions
  if (typeof scoreData.currentScore !== 'number') {
    throw new Error('Missing or invalid currentScore number');
  }
  if (!['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'].includes(scoreData.tier)) {
    throw new Error(`Invalid tier: ${scoreData.tier}`);
  }
  if (!Array.isArray(scoreData.tierBenefits) || scoreData.tierBenefits.length === 0) {
    throw new Error('Missing tierBenefits array');
  }
  if (!scoreData.metrics || !scoreData.metrics.completionRate || !scoreData.metrics.customerRating) {
    throw new Error('Missing 5-pillar metrics breakdown');
  }
  if (!Array.isArray(scoreData.scoreHistory) || scoreData.scoreHistory.length === 0) {
    throw new Error('Missing scoreHistory ledger');
  }
  if (!Array.isArray(scoreData.improvementTips) || scoreData.improvementTips.length === 0) {
    throw new Error('Missing improvementTips');
  }

  console.log('\n🎉 ALL TRUST SCORE ENDPOINT ASSERTIONS PASSED PERFECTLY!');
  console.log(`Current Score: ${scoreData.currentScore} / ${scoreData.maxScore}`);
  console.log(`Tier: ${scoreData.tier} (${scoreData.tierBenefits.length} privileges active)`);
  console.log(`Rookie Protection Active: ${scoreData.isRookieProtected}`);
  console.log(`Metrics Pillars: ${Object.keys(scoreData.metrics).join(', ')}`);
  console.log(`Ledger Records: ${scoreData.scoreHistory.length} events`);
}

main().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});

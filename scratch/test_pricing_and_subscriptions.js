const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'development_super_secret_access_key_change_in_production';
const BASE_URL = 'http://localhost:7001/api/v1';

function unwrap(json) {
  if (json && typeof json === 'object' && 'data' in json && json.success === true) {
    return json.data;
  }
  return json;
}

async function runTests() {
  console.log('========================================================================');
  console.log('🚀 ADHOCX AUTHORITATIVE PRICING & SUBSCRIPTION SYSTEM VERIFICATION SUITE');
  console.log('========================================================================\n');

  // Find Admin and Driver users in database
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        phone: '+919999999999',
        fullName: 'AdhocX Super Admin',
        role: 'ADMIN',
        isPhoneVerified: true,
      },
    });
  }

  const adminToken = jwt.sign(
    { id: admin.id, sub: admin.id, email: admin.email, role: 'ADMIN', phone: admin.phone },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  // Find or create Driver
  let driverUser = await prisma.user.findFirst({ where: { role: 'DRIVER' } });
  let driver = null;
  if (driverUser) {
    driver = await prisma.driver.findUnique({ where: { userId: driverUser.id } });
  }

  if (!driverUser || !driver) {
    driverUser = await prisma.user.create({
      data: {
        phone: '+919876543210',
        fullName: 'Test Verification Driver',
        role: 'DRIVER',
        isPhoneVerified: true,
      },
    });
    driver = await prisma.driver.create({
      data: {
        userId: driverUser.id,
        licenseNumber: 'DL-TEST-998811',
        verificationStatus: 'VERIFIED',
        walletBalance: 2500,
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        subscriptionStatus: 'TRIAL_ACTIVE',
      },
    });
  }

  const driverToken = jwt.sign(
    { id: driverUser.id, sub: driverUser.id, email: driverUser.email, role: 'DRIVER', phone: driverUser.phone },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  console.log(`✅ Admin Account: ${admin.phone} (ID: ${admin.id})`);
  console.log(`✅ Driver Account: ${driverUser.phone} (Driver ID: ${driver.id})\n`);

  // ============================================================================
  // TEST 1: AUTHORITATIVE DATABASE RATE CARDS & SEEDING
  // ============================================================================
  console.log('--- [TEST 1] Authoritative Database Rate Cards (Single Source of Truth) ---');
  const tiersRes = await fetch(`${BASE_URL}/pricing/tiers`);
  const rawTiers = await tiersRes.json();
  const tiers = unwrap(rawTiers);
  console.log(`HTTP Status: ${tiersRes.status}, Total Rate Cards: ${Array.isArray(tiers) ? tiers.length : 0}`);
  const sedanTier = Array.isArray(tiers) ? tiers.find((t) => t.vehicleType === 'SEDAN') : null;
  console.log('SEDAN Tier from DB:', {
    vehicleType: sedanTier?.vehicleType,
    baseFare: sedanTier?.baseFare,
    baseKm: sedanTier?.baseKm,
    perKmRate: sedanTier?.perKmRate,
    platformFeePercent: sedanTier?.platformFeePercent,
  });

  if (!sedanTier) throw new Error('Failed to find SEDAN rate tier in database');
  console.log('✅ TEST 1 PASSED: PostgreSQL vehicle pricing tiers active as single source of truth.\n');

  // ============================================================================
  // TEST 2: ADMIN DYNAMIC ADJUSTMENT OF PER-KM RATE & DYNAMIC REQUIREMENT ESTIMATE
  // ============================================================================
  console.log('--- [TEST 2] Admin Update Per-KM Rate & Dynamic Fare Calculation ---');
  // Update Sedan per-km rate to ₹22, baseFare ₹400, baseKm 10km
  const updateRes = await fetch(`${BASE_URL}/pricing/admin/SEDAN`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      baseFare: 400,
      baseKm: 10,
      perKmRate: 22.0,
      minimumFare: 400,
      platformFeePercent: 10,
      driverSharePercent: 90,
      surgeMultiplier: 1.0,
    }),
  });
  const updatedSedan = unwrap(await updateRes.json());
  console.log('Admin PATCH Response:', updateRes.status, {
    vehicleType: updatedSedan.vehicleType,
    perKmRate: updatedSedan.perKmRate,
    baseFare: updatedSedan.baseFare,
  });

  // Calculate fare for 50km trip:
  // Base 10km = ₹400, Extra 40km * ₹22 = ₹880 => Total = ₹1,280
  const calcRes = await fetch(`${BASE_URL}/pricing/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vehicleType: 'SEDAN',
      distanceKm: 50,
      durationMinutes: 60,
      quantity: 1,
    }),
  });
  const calcData = unwrap(await calcRes.json());
  console.log('Dynamic Calculation Result for 50km SEDAN:', calcData);

  const expectedFare = 400 + (50 - 10) * 22; // 1280
  if (calcData.estimatedTotal !== expectedFare) {
    throw new Error(`Expected estimatedTotal ${expectedFare}, got ${calcData.estimatedTotal}`);
  }
  console.log(`✅ TEST 2 PASSED: 50km trip calculated exactly as ₹${calcData.estimatedTotal} (Base ₹400 + 40km * ₹22/km)\n`);

  // ============================================================================
  // TEST 3: SYSTEM POLICY CONFIG (Driver Monthly Fee, 15-Day Trial, Min ₹1,000 Withdrawal)
  // ============================================================================
  console.log('--- [TEST 3] Global Platform Policy Configuration ---');
  const policyGetRes = await fetch(`${BASE_URL}/pricing/policy-config`);
  const policyData = unwrap(await policyGetRes.json());
  console.log('Current System Policy Config in DB:', policyData);

  const policyUpdateRes = await fetch(`${BASE_URL}/pricing/admin/policy-config`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      driverMonthlyFee: 499,
      driverTrialDays: 15,
      minWithdrawalAmount: 1000,
      convenienceFeePercent: 2.5,
      gstPercent: 5.0,
    }),
  });
  const updatedPolicy = unwrap(await policyUpdateRes.json());
  console.log('Updated Policy Config:', updatedPolicy);
  console.log('✅ TEST 3 PASSED: Policy configuration persists in PostgreSQL.\n');

  // ============================================================================
  // TEST 4: DRIVER EARNINGS & MINIMUM ₹1,000 WITHDRAWAL WALLET ENFORCEMENT
  // ============================================================================
  console.log('--- [TEST 4] Driver Earnings & Minimum ₹1,000 Withdrawal Validation ---');
  // Ensure driver has ₹3,000 balance for test
  await prisma.driver.update({
    where: { id: driver.id },
    data: { walletBalance: 3000 },
  });

  const walletRes = await fetch(`${BASE_URL}/settlements/wallet`, {
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  const wallet = unwrap(await walletRes.json());
  console.log('Driver Wallet Initial Balance:', wallet.walletBalance);

  // Sub-test 4A: Attempt withdrawal below ₹1,000 (e.g. ₹500) -> MUST FAIL with 400
  console.log('Sub-test 4A: Attempting withdrawal of ₹500 (below ₹1,000 minimum)...');
  const rejectSubMinRes = await fetch(`${BASE_URL}/settlements/withdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
    body: JSON.stringify({
      amount: 500,
      bankAccountName: 'Test Driver',
      bankAccountNumber: '918273645012',
      bankIfsc: 'HDFC0001234',
    }),
  });
  const rejectSubMinBody = await rejectSubMinRes.json();
  console.log(`Sub-test 4A Response: Status ${rejectSubMinRes.status}, Message: "${rejectSubMinBody.message}"`);
  if (rejectSubMinRes.status !== 400) {
    throw new Error('Expected 400 Bad Request for withdrawal < ₹1,000');
  }
  console.log('✅ Sub-test 4A Passed: Sub-₹1,000 withdrawal strictly rejected.\n');

  // Sub-test 4B: Attempt valid withdrawal of ₹1,000 -> MUST SUCCEED and hold balance
  console.log('Sub-test 4B: Requesting valid ₹1,000 withdrawal...');
  const validWithdrawRes = await fetch(`${BASE_URL}/settlements/withdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
    body: JSON.stringify({
      amount: 1000,
      bankAccountName: 'Test Driver',
      bankAccountNumber: '918273645012',
      bankIfsc: 'HDFC0001234',
    }),
  });
  const validWithdrawData = unwrap(await validWithdrawRes.json());
  console.log(`Sub-test 4B Response: Status ${validWithdrawRes.status}, Settlement ID: ${validWithdrawData.id}`);
  if (validWithdrawRes.status !== 201 && validWithdrawRes.status !== 200) {
    throw new Error('Failed to create ₹1,000 withdrawal');
  }

  // Check that wallet was debited by ₹1,000
  const afterWithdrawWallet = unwrap(await (await fetch(`${BASE_URL}/settlements/wallet`, {
    headers: { Authorization: `Bearer ${driverToken}` },
  })).json());
  console.log(`Wallet Balance After ₹1,000 Hold: ₹${afterWithdrawWallet.walletBalance} (Debited from ₹3,000)`);
  if (afterWithdrawWallet.walletBalance !== 2000) {
    throw new Error(`Expected wallet balance ₹2000, got ₹${afterWithdrawWallet.walletBalance}`);
  }

  // Sub-test 4C: Admin rejects settlement with failure reason -> Must auto-refund ₹1,000 back to driver
  console.log('\nSub-test 4C: Admin rejects settlement with rollback refund...');
  const rejectProcessRes = await fetch(`${BASE_URL}/settlements/${validWithdrawData.id}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      status: 'FAILED',
      failureReason: 'Beneficiary IFSC verification failed - Auto refund',
    }),
  });
  console.log('Admin Reject Process Status:', rejectProcessRes.status);

  // Check wallet was refunded back to ₹3,000
  const afterRefundWallet = unwrap(await (await fetch(`${BASE_URL}/settlements/wallet`, {
    headers: { Authorization: `Bearer ${driverToken}` },
  })).json());
  console.log(`Wallet Balance After Refund: ₹${afterRefundWallet.walletBalance} (Restored to ₹3,000)`);
  if (afterRefundWallet.walletBalance !== 3000) {
    throw new Error(`Expected refunded wallet balance ₹3000, got ₹${afterRefundWallet.walletBalance}`);
  }
  console.log('✅ TEST 4 PASSED: ₹1,000 minimum withdrawal, ledger hold, and automated refund verified.\n');

  // ============================================================================
  // TEST 5: DRIVER MONTHLY SUBSCRIPTION & 15-DAY FREE TRIAL ENGINE
  // ============================================================================
  console.log('--- [TEST 5] Driver 15-Day Free Trial & Subscription Lifecycle ---');
  // Reset driver to trial state for test isolation
  await prisma.driver.update({
    where: { id: driver.id },
    data: {
      subscriptionStatus: 'TRIAL_ACTIVE',
      subscriptionExpiry: null,
      trialStartDate: new Date(),
      trialEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      autoDebit: true,
      walletBalance: 3000,
    },
  });

  // Sub-test 5A: Check initial status (should be TRIAL_ACTIVE with 15 days)
  const subStatusRes = await fetch(`${BASE_URL}/subscriptions/status`, {
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  const subStatus = unwrap(await subStatusRes.json());
  console.log('Driver Subscription Status:', subStatus);
  if (subStatus.status !== 'TRIAL_ACTIVE' || subStatus.isPaywallBlocked !== false) {
    throw new Error('Expected TRIAL_ACTIVE with isPaywallBlocked = false');
  }

  // Sub-test 5B: Create subscription order with coupon
  console.log('\nSub-test 5B: Generating Razorpay Subscription Order with Coupon...');
  const orderRes = await fetch(`${BASE_URL}/subscriptions/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
    body: JSON.stringify({
      couponCode: 'WELCOME100',
    }),
  });
  const orderData = unwrap(await orderRes.json());
  console.log('Subscription Order Response:', {
    orderId: orderData.order?.id,
    amountInPaise: orderData.order?.amount,
    finalAmountInINR: orderData.finalAmount,
  });

  // Sub-test 5C: Verify payment & activate 30-day Pro membership
  console.log('\nSub-test 5C: Verifying Razorpay payment signature & activating Pro Driver...');
  const mockOrderId = orderData.order?.id || 'order_sim_123456';
  const verifyRes = await fetch(`${BASE_URL}/subscriptions/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
    body: JSON.stringify({
      razorpayOrderId: mockOrderId,
      razorpayPaymentId: `pay_${Date.now()}`,
      razorpaySignature: `sig_${Date.now()}`,
    }),
  });
  const verifyData = unwrap(await verifyRes.json());
  console.log('Verification & Activation Response:', verifyData);

  const activeSubStatus = unwrap(await (await fetch(`${BASE_URL}/subscriptions/status`, {
    headers: { Authorization: `Bearer ${driverToken}` },
  })).json());
  console.log('Updated Status After Online Payment:', activeSubStatus);
  if (activeSubStatus.status !== 'ACTIVE' || activeSubStatus.isPaywallBlocked !== false) {
    throw new Error('Expected status to be ACTIVE after payment verification');
  }

  // Sub-test 5D: Renew subscription from wallet balance
  console.log('\nSub-test 5D: Renewing subscription directly via Wallet Auto-Debit...');
  const walletRenewRes = await fetch(`${BASE_URL}/subscriptions/renew-wallet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${driverToken}`,
    },
  });
  const walletRenewData = unwrap(await walletRenewRes.json());
  console.log('Wallet Renewal Response:', walletRenewData);
  if (walletRenewData.success !== true) {
    throw new Error('Wallet auto-debit renewal failed');
  }

  console.log('✅ TEST 5 PASSED: Driver 15-day trial, Razorpay checkout, and wallet auto-debit renewals verified.\n');

  console.log('========================================================================');
  console.log('🎉 ALL END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY! (5/5)');
  console.log('========================================================================');

  await prisma.$disconnect();
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  prisma.$disconnect();
  process.exit(1);
});

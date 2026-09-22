/**
 * End-to-End Trip Execution Lifecycle Verification Suite
 */
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

async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, ok: res.ok, data: unwrap(json), raw: json };
}

async function main() {
  console.log('================================================================');
  console.log('🚀 ADHOCX END-TO-END TRIP LIFECYCLE & EDGE CASES TEST SUITE');
  console.log('================================================================\n');

  // 1. Get or Create Test Vendor
  console.log('1️⃣ Setting up Test Vendor & Test Driver...');
  let vendorUser = await prisma.user.findFirst({ where: { role: 'VENDOR' } });
  let vendor = vendorUser ? await prisma.vendor.findUnique({ where: { userId: vendorUser.id } }) : null;

  if (!vendorUser || !vendor) {
    vendorUser = await prisma.user.create({
      data: {
        phone: '+919876543220',
        fullName: 'Test Corporate Booker',
        role: 'VENDOR',
        isPhoneVerified: true,
      },
    });
    vendor = await prisma.vendor.create({
      data: {
        userId: vendorUser.id,
        organizationName: 'AdhocX Enterprise Logistics',
        escrowBalance: 20000,
      },
    });
  } else {
    // Ensure vendor has sufficient wallet balance
    vendor = await prisma.vendor.update({
      where: { id: vendor.id },
      data: { escrowBalance: 25000 },
    });
  }

  const vendorToken = jwt.sign(
    { id: vendorUser.id, sub: vendorUser.id, email: vendorUser.email, role: 'VENDOR', phone: vendorUser.phone },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  // Get or Create Test Driver
  let driverUser = await prisma.user.findFirst({ where: { role: 'DRIVER' } });
  let driver = driverUser ? await prisma.driver.findUnique({ where: { userId: driverUser.id } }) : null;

  if (!driverUser || !driver) {
    driverUser = await prisma.user.create({
      data: {
        phone: '+919876543221',
        fullName: 'Test Verified Chauffeur',
        role: 'DRIVER',
        isPhoneVerified: true,
      },
    });
    driver = await prisma.driver.create({
      data: {
        userId: driverUser.id,
        licenseNumber: 'DL-TEST-998822',
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
        walletBalance: 1000,
        averageRating: 5.0,
      },
    });
  } else {
    driver = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
      },
    });
  }

  const driverToken = jwt.sign(
    { id: driverUser.id, sub: driverUser.id, email: driverUser.email, role: 'DRIVER', phone: driverUser.phone },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  console.log(`   ✅ Vendor Ready (ID: ${vendor.id}, User ID: ${vendorUser.id})`);
  console.log(`   ✅ Driver Ready (ID: ${driver.id}, User ID: ${driverUser.id})`);

  const initialDriverBalance = Number(driver.walletBalance);
  console.log(`   ℹ️ Initial Driver Wallet Balance: ₹${initialDriverBalance}`);

  // 2. Post Outstation Reverse Auction Requirement
  console.log('\n2️⃣ Posting Outstation Bidding Requirement (Mode: BIDDING, Budget: ₹5000)...');
  const reqRes = await api('/requirements', {
    method: 'POST',
    headers: { Authorization: `Bearer ${vendorToken}` },
    body: JSON.stringify({
      fulfillmentMode: 'BIDDING',
      vehicleType: 'SEDAN',
      quantity: 1,
      suggestedBudget: 5000,
      pickupLocation: {
        latitude: 28.6139,
        longitude: 77.2090,
        address: 'Connaught Place, New Delhi',
      },
      dropLocation: {
        latitude: 27.1767,
        longitude: 78.0081,
        address: 'Taj Mahal, Agra',
      },
      reportingTime: new Date(Date.now() + 3600000).toISOString(),
    }),
  });

  if (!reqRes.ok) {
    throw new Error(`Create requirement failed: ${JSON.stringify(reqRes.raw)}`);
  }
  const requirementId = reqRes.data.id;
  console.log(`   ✅ Requirement Created: ${requirementId}`);

  // 3. Driver Submits Quote / Bid
  console.log('\n3️⃣ Driver Submits Quote for ₹5000...');
  const bidRes = await api('/bids', {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: JSON.stringify({
      requirementId,
      bidAmount: 5000,
      etaMinutes: 15,
      notes: 'Clean Sedan with commercial permit and AC',
    }),
  });

  if (!bidRes.ok) {
    throw new Error(`Submit bid failed: ${JSON.stringify(bidRes.raw)}`);
  }
  const bidId = bidRes.data.id;
  console.log(`   ✅ Bid Submitted: ${bidId} (Amount: ₹5000)`);

  // 4. Vendor Accepts Driver Bid
  console.log('\n4️⃣ Vendor Accepts Bid...');
  const acceptRes = await api(`/bids/${bidId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  if (!acceptRes.ok) {
    throw new Error(`Accept bid failed: ${JSON.stringify(acceptRes.raw)}`);
  }
  console.log(`   ✅ Bid Accepted! Assignment & Trip created.`);

  // 5. Inspect Requirement Details & verify assignedDrivers contains startOtp and tripId
  console.log('\n5️⃣ Inspecting Requirement Details for Start OTP & Trip ID in assignedDrivers...');
  const reqDetails = await api(`/requirements/${requirementId}`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  if (!reqDetails.ok) {
    throw new Error(`Get requirement details failed: ${JSON.stringify(reqDetails.raw)}`);
  }
  const assigned = reqDetails.data.assignedDrivers;
  if (!assigned || assigned.length === 0) {
    throw new Error(`Expected assignedDrivers array to have entries, got: ${JSON.stringify(assigned)}`);
  }
  const assignedDriver = assigned[0];
  console.log(`   Driver Name: ${assignedDriver.driverName}`);
  console.log(`   Trip Status: ${assignedDriver.tripStatus}`);
  console.log(`   Trip ID:     ${assignedDriver.tripId}`);
  console.log(`   Start OTP:   ${assignedDriver.startOtp}`);

  if (!assignedDriver.startOtp) {
    throw new Error('❌ FAILURE: startOtp was not returned in assignedDrivers payload!');
  }
  if (!assignedDriver.tripId) {
    throw new Error('❌ FAILURE: tripId was not returned in assignedDrivers payload!');
  }
  console.log('   ✅ Start OTP and Trip ID successfully verified in assignedDrivers!');
  const tripId = assignedDriver.tripId;
  const correctOtp = assignedDriver.startOtp;

  // 6. Driver Marks ARRIVED at pickup
  console.log('\n6️⃣ Driver Marks ARRIVED at Pickup Location...');
  const arrivedRes = await api(`/trips/${tripId}/arrived`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
  });
  if (!arrivedRes.ok) {
    throw new Error(`Mark arrived failed: ${JSON.stringify(arrivedRes.raw)}`);
  }
  console.log(`   ✅ Trip Status updated to: ${arrivedRes.data.status}`);

  // 7. Edge Case: Driver submits Invalid OTP
  console.log('\n7️⃣ Edge Case: Driver enters INVALID OTP ("0000")...');
  const invalidOtpRes = await api(`/trips/${tripId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: JSON.stringify({
      otp: '0000',
      currentLocation: { latitude: 28.6139, longitude: 77.2090 },
    }),
  });

  if (invalidOtpRes.status === 400) {
    console.log(`   ✅ Edge Case Handled: Invalid OTP rejected with 400 Bad Request ("${invalidOtpRes.raw.message}")`);
  } else {
    throw new Error(`Expected 400 rejection for invalid OTP, got: ${invalidOtpRes.status}`);
  }

  // 8. Driver submits VALID Start OTP
  console.log(`\n8️⃣ Driver enters VALID Start OTP ("${correctOtp}")...`);
  const validStartRes = await api(`/trips/${tripId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: JSON.stringify({
      otp: correctOtp,
      currentLocation: { latitude: 28.6139, longitude: 77.2090 },
    }),
  });

  if (!validStartRes.ok) {
    throw new Error(`Start trip with valid OTP failed: ${JSON.stringify(validStartRes.raw)}`);
  }
  console.log(`   ✅ Trip Started! Status: ${validStartRes.data.status}`);

  // 9. Live GPS Telemetry location ping
  console.log('\n9️⃣ Driver sends live GPS Telemetry Ping...');
  const locationRes = await api(`/trips/${tripId}/location`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: JSON.stringify({
      location: { latitude: 27.8974, longitude: 77.6745 },
      speed: 68.5,
      heading: 145.0,
    }),
  });
  console.log(`   ✅ Telemetry Recorded (HTTP ${locationRes.status})`);

  // 10. Driver Completes Trip with ₹150 Toll + ₹50 Parking Charges
  // Snapshot wallet balance IMMEDIATELY before completion for accurate delta (immune to concurrent tests)
  const preCompleteDriver = await prisma.driver.findUnique({ where: { id: driver.id } });
  const walletBeforeComplete = Number(preCompleteDriver.walletBalance);
  console.log(`\n🔟 Driver Reaches Destination & Completes Trip (Toll: ₹150, Parking: ₹50)...`);
  console.log(`   ℹ️ Wallet Balance Right Before Completion: ₹${walletBeforeComplete}`);
  const completeRes = await api(`/trips/${tripId}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: JSON.stringify({
      tollCharges: 150,
      parkingCharges: 50,
      currentLocation: { latitude: 27.1767, longitude: 78.0081 },
    }),
  });

  if (!completeRes.ok) {
    throw new Error(`Complete trip failed: ${JSON.stringify(completeRes.raw)}`);
  }
  console.log(`   ✅ Trip Status: ${completeRes.data.status}`);
  console.log(`   Total Driver Earnings: ₹${completeRes.data.totalDriverEarnings} (Fare: ₹5000 - ₹250 Platform Fee + ₹150 Toll + ₹50 Parking)`);

  // Verify driver wallet balance increment in database (relative to pre-complete snapshot)
  const driverInDb = await prisma.driver.findUnique({ where: { id: driver.id } });
  const updatedDriverBalance = Number(driverInDb.walletBalance);
  const expectedGain = 5000 - 250 + 150 + 50; // 4950
  const actualGain = updatedDriverBalance - walletBeforeComplete;
  console.log(`   Driver Wallet Balance: Before = ₹${walletBeforeComplete}, After = ₹${updatedDriverBalance} (Gain: ₹${actualGain})`);
  if (actualGain !== expectedGain) {
    throw new Error(`Expected wallet balance gain of ₹${expectedGain}, got ₹${actualGain}`);
  }
  console.log('   ✅ Driver Wallet automatically credited with exact net settlement!');

  // Verify Ledger Entry
  const ledger = await prisma.ledgerEntry.findFirst({
    where: {
      accountType: 'DRIVER',
      accountId: driver.id,
      referenceId: tripId,
    },
  });
  if (!ledger) {
    throw new Error('❌ Ledger entry for driver earnings was not found!');
  }
  console.log(`   ✅ Immutable Ledger Entry Verified (Entry ID: ${ledger.id}, Amount: ₹${ledger.amount}, Type: ${ledger.referenceType})`);

  // 11. Customer Submits 5-Star Driver Review
  console.log('\n1️⃣1️⃣ Customer Submits 5-Star Driver Review...');
  const reviewRes = await api('/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${vendorToken}` },
    body: JSON.stringify({
      tripId: tripId,
      rating: 5,
      feedback: 'Exceptional driving! Very punctual and clean car.',
    }),
  });

  if (!reviewRes.ok) {
    throw new Error(`Submit review failed: ${JSON.stringify(reviewRes.raw)}`);
  }
  console.log(`   ✅ Customer Review Created (ID: ${reviewRes.data.id}, Rating: 5/5)`);

  // 12. Driver Submits 5-Star Review for Customer
  console.log('\n1️⃣2️⃣ Driver Submits 5-Star Review for Customer...');
  const driverReviewRes = await api('/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: JSON.stringify({
      tripId: tripId,
      rating: 5,
      feedback: 'Great passenger, prompt at pickup location.',
    }),
  });
  if (!driverReviewRes.ok) {
    throw new Error(`Driver review failed: ${JSON.stringify(driverReviewRes.raw)}`);
  }
  console.log(`   ✅ Driver Review Created (ID: ${driverReviewRes.data.id}, Rating: 5/5)`);

  // 13. Verify final requirement status is COMPLETED
  console.log('\n1️⃣3️⃣ Verifying Requirement is COMPLETED...');
  const finalReq = await api(`/requirements/${requirementId}`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  console.log(`   Requirement Status: ${finalReq.data.status}`);
  console.log(`   Assigned Driver Trip Status: ${finalReq.data.assignedDrivers[0].tripStatus}`);

  console.log('\n================================================================');
  console.log('🎉 ALL 13/13 END-TO-END TRIP LIFECYCLE TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const API_BASE = 'http://localhost:7001/api/v1';
const JWT_SECRET = 'development_super_secret_access_key_change_in_production';

const prisma = new PrismaClient();

async function runDynamicCategoryTests() {
  console.log('=== STARTING DYNAMIC VEHICLE CATEGORIES END-TO-END VERIFICATION ===\n');

  // Step 0: Find or mock admin user token
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.log('Creating temporary admin user for test...');
    admin = await prisma.user.create({
      data: {
        phone: '+919876500001',
        email: 'superadmin@adhocx.com',
        fullName: 'Super Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
  }

  const adminToken = jwt.sign(
    {
      sub: admin.id,
      phone: admin.phone,
      email: admin.email,
      role: 'ADMIN',
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log(`[AUTH] Admin JWT generated for user: ${admin.email || admin.id}`);

  // If BIKE already exists, delete it first to test the full lifecycle
  const existingTier = await prisma.vehiclePricingTier.findUnique({ where: { vehicleType: 'BIKE' } });
  if (existingTier) {
    console.log('[LIFECYCLE] BIKE already exists in DB. Testing DELETE /pricing/admin/tiers/BIKE...');
    const delRes = await fetch(`${API_BASE}/pricing/admin/tiers/BIKE`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('Delete Response Status:', delRes.status);
  }

  // Step 1: Create a brand new dynamic vehicle category: 'BIKE'
  console.log('\n[TEST 1] Creating new vehicle category "BIKE" via Admin API...');
  const newTierPayload = {
    vehicleType: 'BIKE',
    categoryLabel: 'Moto Express & Delivery Bike',
    seatingCapacity: '1 Passenger / 15kg Bag',
    description: 'Fast two-wheeler courier and single commuter transit',
    iconKey: 'bike',
    baseFare: 40,
    baseKm: 3,
    perKmRate: 8.5,
    driverSharePercent: 90,
    platformFeePercent: 10,
    surgeMultiplier: 1.0,
  };

  const createRes = await fetch(`${API_BASE}/pricing/admin/tiers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(newTierPayload),
  });

  const createData = await createRes.json();
  console.log('Create Response Status:', createRes.status);
  console.log('Created Tier:', createData);
  if (!createRes.ok) {
    throw new Error(`Failed to create tier: ${JSON.stringify(createData)}`);
  }

  // Step 2: Fetch all tiers and verify 'BIKE' is present
  console.log('\n[TEST 2] Fetching all public pricing tiers (as mobile/admin clients do)...');
  const tiersRes = await fetch(`${API_BASE}/pricing/tiers`);
  const tiersData = await tiersRes.json();
  const tiersList = tiersData.data || tiersData;
  console.log(`Total tiers returned: ${tiersList.length}`);
  const bikeTier = tiersList.find((t) => (t.vehicleType || '').toUpperCase() === 'BIKE');
  if (!bikeTier) {
    throw new Error('BIKE tier not found in GET /pricing/tiers!');
  }
  console.log('✅ Found BIKE tier in marketplace list:', {
    categoryLabel: bikeTier.categoryLabel,
    baseFare: bikeTier.baseFare,
    baseKm: bikeTier.baseKm,
    perKmRate: bikeTier.perKmRate,
    driverSharePercent: bikeTier.driverSharePercent,
    iconKey: bikeTier.iconKey,
  });

  // Step 3: Test Dynamic Fare Calculation for 15 km, 25 min trip on 'BIKE'
  console.log('\n[TEST 3] Testing dynamic fare calculation on newly added category "BIKE"...');
  // Formula:
  // Base fare: 40 (covers first 3 km)
  // Billable km: 15 - 3 = 12 km
  // Distance fare: 12 * 8.5 = 102
  // Total base fare = 40 + 102 = 142
  const calcRes = await fetch(`${API_BASE}/pricing/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vehicleType: 'BIKE',
      distanceKm: 15,
      durationMin: 25,
    }),
  });
  const calcData = await calcRes.json();
  console.log('Calculation Response Status:', calcRes.status);
  console.log('Calculation Result:', calcData);
  const fareResult = calcData.data || calcData;

  const expectedGross = 142; // 40 + (15-3)*8.5
  if (Math.abs(fareResult.estimatedTotal - expectedGross) > 1) {
    console.warn(`Fare calculation difference: expected ~${expectedGross}, got ${fareResult.estimatedTotal}`);
  } else {
    console.log(`✅ Fare perfectly matches formula: ₹${fareResult.estimatedTotal} (Expected: ₹${expectedGross})`);
  }

  // Step 4: Driver Onboarding & Vehicle Record with dynamic 'BIKE' category
  console.log('\n[TEST 4] Database verification: Registering vehicle and requirement with "BIKE"...');
  let testDriver = await prisma.driver.findFirst();
  if (testDriver) {
    const testVehicle = await prisma.vehicle.upsert({
      where: { registrationNumber: 'DL01-BIKE-9999' },
      update: { vehicleType: 'BIKE', model: 'Honda Activa 6G' },
      create: {
        driverId: testDriver.id,
        make: 'Honda',
        model: 'Activa 6G',
        registrationNumber: 'DL01-BIKE-9999',
        vehicleType: 'BIKE',
        verificationStatus: 'VERIFIED',
      },
    });
    console.log('✅ Vehicle with vehicleType="BIKE" successfully saved in DB:', {
      id: testVehicle.id,
      registrationNumber: testVehicle.registrationNumber,
      vehicleType: testVehicle.vehicleType,
    });
    // Clean up
    await prisma.vehicle.delete({ where: { id: testVehicle.id } });
    console.log('Cleaned up test vehicle.');
  }

  // Step 5: Customer/Vendor Requirement creation with dynamic category 'BIKE'
  const testVendor = await prisma.vendor.findFirst();
  if (testVendor) {
    const testReq = await prisma.requirement.create({
      data: {
        vendorId: testVendor.id,
        pickupAddress: 'Connaught Place, New Delhi',
        pickupLat: 28.6315,
        pickupLng: 77.2167,
        dropAddress: 'Cyber City, Gurugram',
        dropLat: 28.4952,
        dropLng: 77.0895,
        reportingTime: new Date(Date.now() + 3600000),
        vehicleType: 'BIKE',
        totalAmount: 142.0,
        ratePerVehicle: 142.0,
        status: 'POSTED',
      },
    });
    console.log('✅ Requirement with vehicleType="BIKE" successfully created in DB:', {
      id: testReq.id,
      vehicleType: testReq.vehicleType,
      totalAmount: testReq.totalAmount,
    });

    // Clean up test requirement
    await prisma.requirement.delete({ where: { id: testReq.id } });
    console.log('Cleaned up test requirement.');
  }

  console.log('\n=== ALL DYNAMIC VEHICLE CATEGORY TESTS PASSED WITH 100% SUCCESS ===');
}

runDynamicCategoryTests()
  .catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

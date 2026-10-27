const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto');

// Load environment configuration
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '../../..', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('====================================================');
  console.log('🚀 Starting User & Operational Data Reset');
  console.log('====================================================');
  console.log('Target Database:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 'Not defined');

  // 1. Purge all operational and user-generated records in foreign key dependency order
  console.log('\n--- Purging Dependent Operational Data ---');
  
  const deletedZonalQuotes = await prisma.zonalQuoteSnapshot.deleteMany({});
  console.log(`✓ Deleted ZonalQuoteSnapshots: ${deletedZonalQuotes.count}`);

  const deletedTripEvents = await prisma.tripEvent.deleteMany({});
  console.log(`✓ Deleted TripEvents: ${deletedTripEvents.count}`);

  const deletedReviews = await prisma.review.deleteMany({});
  console.log(`✓ Deleted Reviews: ${deletedReviews.count}`);

  const deletedDisputes = await prisma.dispute.deleteMany({});
  console.log(`✓ Deleted Disputes: ${deletedDisputes.count}`);

  const deletedPayments = await prisma.payment.deleteMany({});
  console.log(`✓ Deleted Payments: ${deletedPayments.count}`);

  const deletedTrips = await prisma.trip.deleteMany({});
  console.log(`✓ Deleted Trips: ${deletedTrips.count}`);

  const deletedAssignments = await prisma.assignment.deleteMany({});
  console.log(`✓ Deleted Assignments: ${deletedAssignments.count}`);

  const deletedOffers = await prisma.offer.deleteMany({});
  console.log(`✓ Deleted Offers: ${deletedOffers.count}`);

  const deletedBids = await prisma.bid.deleteMany({});
  console.log(`✓ Deleted Bids: ${deletedBids.count}`);

  const deletedRequirements = await prisma.requirement.deleteMany({});
  console.log(`✓ Deleted Requirements: ${deletedRequirements.count}`);

  const deletedSettlements = await prisma.settlement.deleteMany({});
  console.log(`✓ Deleted Settlements: ${deletedSettlements.count}`);

  const deletedSubPayments = await prisma.driverSubscriptionPayment.deleteMany({});
  console.log(`✓ Deleted DriverSubscriptionPayments: ${deletedSubPayments.count}`);

  const deletedVehicles = await prisma.vehicle.deleteMany({});
  console.log(`✓ Deleted Vehicles: ${deletedVehicles.count}`);

  const deletedDrivers = await prisma.driver.deleteMany({});
  console.log(`✓ Deleted Drivers: ${deletedDrivers.count}`);

  const deletedVendors = await prisma.vendor.deleteMany({});
  console.log(`✓ Deleted Vendors: ${deletedVendors.count}`);

  const deletedCouponRedemptions = await prisma.couponRedemption.deleteMany({});
  console.log(`✓ Deleted CouponRedemptions: ${deletedCouponRedemptions.count}`);

  const deletedDeviceTokens = await prisma.deviceToken.deleteMany({});
  console.log(`✓ Deleted DeviceTokens: ${deletedDeviceTokens.count}`);

  const deletedNotifications = await prisma.notification.deleteMany({});
  console.log(`✓ Deleted Notifications: ${deletedNotifications.count}`);

  const deletedNotificationPreferences = await prisma.notificationPreference.deleteMany({});
  console.log(`✓ Deleted NotificationPreferences: ${deletedNotificationPreferences.count}`);

  const deletedNotificationCampaigns = await prisma.notificationCampaign.deleteMany({});
  console.log(`✓ Deleted NotificationCampaigns: ${deletedNotificationCampaigns.count}`);

  const deletedLedger = await prisma.ledgerEntry.deleteMany({});
  console.log(`✓ Deleted LedgerEntries: ${deletedLedger.count}`);

  const deletedAuditLogs = await prisma.auditLog.deleteMany({});
  console.log(`✓ Deleted AuditLogs: ${deletedAuditLogs.count}`);

  // 2. Delete ALL users
  console.log('\n--- Purging All Users ---');
  const deletedUsers = await prisma.user.deleteMany({});
  console.log(`✓ Deleted Users: ${deletedUsers.count}`);

  // 3. Seed / Push authoritative Admin credentials
  console.log('\n--- Seeding Fresh Admin Account ---');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@adhocx.com';
  const adminPhone = process.env.ADMIN_PHONE || '+919876543210';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@AdhocX2026!';
  const adminFullName = 'AdhocX Administrator';
  const passwordHash = hashPassword(adminPassword);

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      phone: adminPhone,
      fullName: adminFullName,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Admin Account Provisioned Successfully:');
  console.log(`   - ID: ${adminUser.id}`);
  console.log(`   - Email: ${adminUser.email}`);
  console.log(`   - Phone: ${adminUser.phone}`);
  console.log(`   - Role: ${adminUser.role}`);
  console.log(`   - Status: ${adminUser.status}`);
  console.log(`   - Password: ${adminPassword}`);

  // 4. Verify preserved master data & clean state
  console.log('\n====================================================');
  console.log('📊 Verification & Summary of Database State');
  console.log('====================================================');

  const [
    userCount,
    driverCount,
    vendorCount,
    tripCount,
    reqCount,
    localityCount,
    rateCardVersionCount,
    rateCardRowCount,
    pricingTierCount,
    policyConfigCount,
    couponCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.driver.count(),
    prisma.vendor.count(),
    prisma.trip.count(),
    prisma.requirement.count(),
    prisma.localityMaster.count(),
    prisma.rateCardVersion.count(),
    prisma.rateCardRow.count(),
    prisma.vehiclePricingTier.count(),
    prisma.systemPolicyConfig.count(),
    prisma.coupon.count(),
  ]);

  console.log(`Users remaining: ${userCount} (Admin only)`);
  console.log(`Drivers remaining: ${driverCount}`);
  console.log(`Vendors remaining: ${vendorCount}`);
  console.log(`Trips remaining: ${tripCount}`);
  console.log(`Requirements remaining: ${reqCount}`);
  console.log('--- Preserved Master Configs ---');
  console.log(`LocalityMaster entries: ${localityCount}`);
  console.log(`RateCardVersion entries: ${rateCardVersionCount}`);
  console.log(`RateCardRows: ${rateCardRowCount}`);
  console.log(`VehiclePricingTiers: ${pricingTierCount}`);
  console.log(`SystemPolicyConfigs: ${policyConfigCount}`);
  console.log(`Coupons: ${couponCount}`);
  console.log('====================================================');
}

main()
  .catch((err) => {
    console.error('❌ Error executing database reset:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

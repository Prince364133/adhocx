const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Inspecting Database ---');
  
  // 1. Fetch existing users
  const allUsers = await prisma.user.findMany();
  console.log(`Total users currently in DB: ${allUsers.length}`);
  
  let adminUsers = allUsers.filter(u => u.role === 'ADMIN');
  console.log(`Admin users found: ${adminUsers.length}`);

  // If no admin user exists, let's create a default root admin so credentials remain available
  if (adminUsers.length === 0) {
    console.log('No ADMIN user found in database. Creating default operations admin user...');
    const newAdmin = await prisma.user.create({
      data: {
        phone: '+919999999999',
        email: 'ops@adhocx.com',
        fullName: 'Operations Lead',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    adminUsers.push(newAdmin);
    console.log(`Created root admin: id=${newAdmin.id}, phone=${newAdmin.phone}, email=${newAdmin.email}`);
  } else {
    adminUsers.forEach(admin => {
      console.log(`Preserving Admin: id=${admin.id}, phone=${admin.phone}, email=${admin.email}, fullName=${admin.fullName}`);
    });
  }

  const adminIds = adminUsers.map(u => u.id);

  console.log('\n--- Purging All Non-Admin Data ---');

  // Deletion in foreign-key dependency order
  const deletedTripEvents = await prisma.tripEvent.deleteMany({});
  console.log(`Deleted TripEvents: ${deletedTripEvents.count}`);

  const deletedReviews = await prisma.review.deleteMany({});
  console.log(`Deleted Reviews: ${deletedReviews.count}`);

  const deletedDisputes = await prisma.dispute.deleteMany({});
  console.log(`Deleted Disputes: ${deletedDisputes.count}`);

  const deletedPayments = await prisma.payment.deleteMany({});
  console.log(`Deleted Payments: ${deletedPayments.count}`);

  const deletedTrips = await prisma.trip.deleteMany({});
  console.log(`Deleted Trips: ${deletedTrips.count}`);

  const deletedAssignments = await prisma.assignment.deleteMany({});
  console.log(`Deleted Assignments: ${deletedAssignments.count}`);

  const deletedOffers = await prisma.offer.deleteMany({});
  console.log(`Deleted Offers: ${deletedOffers.count}`);

  const deletedBids = await prisma.bid.deleteMany({});
  console.log(`Deleted Bids: ${deletedBids.count}`);

  const deletedRequirements = await prisma.requirement.deleteMany({});
  console.log(`Deleted Requirements: ${deletedRequirements.count}`);

  const deletedSettlements = await prisma.settlement.deleteMany({});
  console.log(`Deleted Settlements: ${deletedSettlements.count}`);

  const deletedVehicles = await prisma.vehicle.deleteMany({});
  console.log(`Deleted Vehicles: ${deletedVehicles.count}`);

  const deletedDrivers = await prisma.driver.deleteMany({});
  console.log(`Deleted Drivers: ${deletedDrivers.count}`);

  const deletedVendors = await prisma.vendor.deleteMany({});
  console.log(`Deleted Vendors: ${deletedVendors.count}`);

  const deletedCouponRedemptions = await prisma.couponRedemption.deleteMany({});
  console.log(`Deleted CouponRedemptions: ${deletedCouponRedemptions.count}`);

  const deletedCoupons = await prisma.coupon.deleteMany({});
  console.log(`Deleted Coupons: ${deletedCoupons.count}`);

  const deletedBlogPosts = await prisma.blogPost.deleteMany({});
  console.log(`Deleted BlogPosts: ${deletedBlogPosts.count}`);

  const deletedLedger = await prisma.ledgerEntry.deleteMany({});
  console.log(`Deleted LedgerEntries: ${deletedLedger.count}`);

  const deletedAuditLogs = await prisma.auditLog.deleteMany({});
  console.log(`Deleted AuditLogs: ${deletedAuditLogs.count}`);

  // Delete all non-admin users
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      id: {
        notIn: adminIds,
      },
    },
  });
  console.log(`Deleted Non-Admin Users: ${deletedUsers.count}`);

  // Verification of remaining records
  const remainingUsers = await prisma.user.findMany();
  console.log('\n--- Final Database Status ---');
  console.log(`Remaining Users in DB: ${remainingUsers.length}`);
  remainingUsers.forEach(u => {
    console.log(`- ID: ${u.id} | Phone: ${u.phone} | Email: ${u.email} | Role: ${u.role} | Status: ${u.status}`);
  });

  const totalRequirements = await prisma.requirement.count();
  const totalTrips = await prisma.trip.count();
  const totalDrivers = await prisma.driver.count();
  const totalVendors = await prisma.vendor.count();

  console.log(`Requirements remaining: ${totalRequirements}`);
  console.log(`Trips remaining: ${totalTrips}`);
  console.log(`Drivers remaining: ${totalDrivers}`);
  console.log(`Vendors remaining: ${totalVendors}`);
}

main()
  .catch(e => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

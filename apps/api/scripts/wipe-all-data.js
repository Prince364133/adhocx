require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting complete database wipe for AdhocX...');

  // 1. Check existing counts
  const beforeCounts = {
    users: await prisma.user.count(),
    vendors: await prisma.vendor.count(),
    drivers: await prisma.driver.count(),
    vehicles: await prisma.vehicle.count(),
    requirements: await prisma.requirement.count(),
    offers: await prisma.offer.count(),
    bids: await prisma.bid.count(),
    assignments: await prisma.assignment.count(),
    trips: await prisma.trip.count(),
    tripEvents: await prisma.tripEvent.count(),
    reviews: await prisma.review.count(),
    disputes: await prisma.dispute.count(),
    payments: await prisma.payment.count(),
    ledgerEntries: await prisma.ledgerEntry.count(),
    settlements: await prisma.settlement.count(),
    auditLogs: await prisma.auditLog.count(),
    coupons: await prisma.coupon.count(),
    couponRedemptions: await prisma.couponRedemption.count(),
    blogPosts: await prisma.blogPost.count(),
  };

  console.log('\n📊 Pre-wipe record counts:');
  console.table(beforeCounts);

  // 2. Truncate all application tables with CASCADE
  console.log('\n🧹 Executing TRUNCATE TABLE across all tables with CASCADE...');
  const tables = [
    'trip_events',
    'reviews',
    'disputes',
    'payments',
    'settlements',
    'ledger_entries',
    'audit_logs',
    'coupon_redemptions',
    'coupons',
    'trips',
    'assignments',
    'bids',
    'offers',
    'requirements',
    'vehicles',
    'drivers',
    'vendors',
    'users',
    'blog_posts',
  ];

  const truncateQuery = `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`;
  await prisma.$executeRawUnsafe(truncateQuery);
  console.log('✅ PostgreSQL tables successfully truncated.');

  // 3. Clear Redis Cache
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      console.log('\n🧹 Connecting to Redis / Valkey to clear cached session and OTP data...');
      const redis = new Redis(redisUrl, {
        tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
        connectTimeout: 10000,
      });

      await redis.flushdb();
      console.log('✅ Redis database successfully flushed.');
      redis.disconnect();
    } catch (err) {
      console.warn('⚠️ Note on Redis cleanup:', err.message);
    }
  }

  // 4. Verify post-wipe counts
  const afterCounts = {
    users: await prisma.user.count(),
    vendors: await prisma.vendor.count(),
    drivers: await prisma.driver.count(),
    vehicles: await prisma.vehicle.count(),
    requirements: await prisma.requirement.count(),
    offers: await prisma.offer.count(),
    bids: await prisma.bid.count(),
    assignments: await prisma.assignment.count(),
    trips: await prisma.trip.count(),
    tripEvents: await prisma.tripEvent.count(),
    reviews: await prisma.review.count(),
    disputes: await prisma.dispute.count(),
    payments: await prisma.payment.count(),
    ledgerEntries: await prisma.ledgerEntry.count(),
    settlements: await prisma.settlement.count(),
    auditLogs: await prisma.auditLog.count(),
    coupons: await prisma.coupon.count(),
    couponRedemptions: await prisma.couponRedemption.count(),
    blogPosts: await prisma.blogPost.count(),
  };

  console.log('\n📊 Post-wipe record counts:');
  console.table(afterCounts);

  const totalRemaining = Object.values(afterCounts).reduce((a, b) => a + b, 0);
  if (totalRemaining === 0) {
    console.log('\n🎉 ALL USERS AND ALL DATA HAVE BEEN COMPLETELY REMOVED FROM THE DATABASE! 🚀');
  } else {
    console.warn(`\n⚠️ Warning: ${totalRemaining} records remain.`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Error during wipe:', err);
  await prisma.$disconnect();
  process.exit(1);
});

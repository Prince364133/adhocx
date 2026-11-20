import { PrismaClient } from '@prisma/client';
import { generateDriverReferralCode } from '../src/modules/drivers/referrals/referral-code.util';

const prisma = new PrismaClient();

async function backfillReferralCodes() {
  console.log('🔄 Backfilling unique 6-character referral codes for all drivers...');
  
  const allDrivers = await prisma.driver.findMany({
    select: { id: true, fullName: true, phone: true, referralCode: true },
  });

  const driversNeedingCode = allDrivers.filter((d) => {
    if (!d.referralCode) return true;
    const c = d.referralCode.trim().toUpperCase();
    if (c === 'ADHOCX') return true;
    if (c.length !== 6) return true;
    if (!/^[A-Z0-9]{6}$/.test(c)) return true;
    if (!/[A-Z]/.test(c)) return true;
    if (/^\d{6}$/.test(c)) return true;
    return false;
  });

  console.log(`Found ${driversNeedingCode.length} drivers needing unique 6-character referral codes.`);

  let updatedCount = 0;
  for (const driver of driversNeedingCode) {
    let assigned = false;
    for (let attempts = 0; attempts < 30; attempts++) {
      const code = generateDriverReferralCode();
      if (code === 'ADHOCX') continue;
      const existing = await prisma.driver.findUnique({
        where: { referralCode: code },
        select: { id: true },
      });
      if (!existing) {
        await prisma.driver.update({
          where: { id: driver.id },
          data: { referralCode: code },
        });
        console.log(`✓ Driver [${driver.fullName}] (${driver.phone || 'No Phone'}) assigned code: ${code}`);
        updatedCount++;
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      console.error(`❌ Could not generate collision-free code for driver ${driver.id}`);
    }
  }

  console.log(`\n🎉 Successfully backfilled ${updatedCount}/${driversNeedingCode.length} driver referral codes.`);
  await prisma.$disconnect();
}

backfillReferralCodes().catch((err) => {
  console.error('Backfill error:', err);
  process.exit(1);
});

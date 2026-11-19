import { PrismaClient } from '@prisma/client';
import { generateDriverReferralCode } from '../src/modules/drivers/referrals/referral-code.util';

const prisma = new PrismaClient();

async function backfillReferralCodes() {
  console.log('🔄 Backfilling referral codes for existing drivers without a code...');
  
  const driversWithoutCode = await prisma.driver.findMany({
    where: { referralCode: null },
    select: { id: true, fullName: true, phone: true },
  });

  console.log(`Found ${driversWithoutCode.length} drivers needing referral codes.`);

  let updatedCount = 0;
  for (const driver of driversWithoutCode) {
    let assigned = false;
    for (let attempts = 0; attempts < 10; attempts++) {
      const code = generateDriverReferralCode();
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

  console.log(`\n🎉 Successfully backfilled ${updatedCount}/${driversWithoutCode.length} driver referral codes.`);
  await prisma.$disconnect();
}

backfillReferralCodes().catch((err) => {
  console.error('Backfill error:', err);
  process.exit(1);
});

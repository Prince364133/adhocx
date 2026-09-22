const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "vehicle_pricing_tiers" ADD COLUMN IF NOT EXISTS "icon_key" VARCHAR(50) DEFAULT 'car';`);
  console.log('✅ vehicle_pricing_tiers.icon_key column added!');
}

main().catch(console.error).finally(() => prisma.$disconnect());

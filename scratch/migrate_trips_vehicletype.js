const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "trips" ALTER COLUMN "vehicle_type" TYPE VARCHAR(50) USING "vehicle_type"::text;`);
  console.log('✅ trips.vehicle_type converted to VARCHAR(50)');
}

main().catch(console.error).finally(() => prisma.$disconnect());

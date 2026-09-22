const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Migrating VehicleType columns to VARCHAR(50) ---');
  
  await prisma.$executeRawUnsafe(`ALTER TABLE "vehicle_pricing_tiers" ALTER COLUMN "vehicle_type" TYPE VARCHAR(50) USING "vehicle_type"::text;`);
  console.log('✅ vehicle_pricing_tiers.vehicle_type converted to VARCHAR(50)');
  
  await prisma.$executeRawUnsafe(`ALTER TABLE "drivers" ALTER COLUMN "vehicle_type" TYPE VARCHAR(50) USING "vehicle_type"::text;`);
  console.log('✅ drivers.vehicle_type converted to VARCHAR(50)');

  await prisma.$executeRawUnsafe(`ALTER TABLE "vehicles" ALTER COLUMN "vehicle_type" TYPE VARCHAR(50) USING "vehicle_type"::text;`);
  console.log('✅ vehicles.vehicle_type converted to VARCHAR(50)');

  await prisma.$executeRawUnsafe(`ALTER TABLE "requirements" ALTER COLUMN "vehicle_type" TYPE VARCHAR(50) USING "vehicle_type"::text;`);
  console.log('✅ requirements.vehicle_type converted to VARCHAR(50)');

  await prisma.$executeRawUnsafe(`ALTER TABLE "offers" ALTER COLUMN "vehicle_type" TYPE VARCHAR(50) USING "vehicle_type"::text;`);
  console.log('✅ offers.vehicle_type converted to VARCHAR(50)');

  console.log('--- All PostgreSQL columns successfully migrated to dynamic VARCHAR(50)! ---');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

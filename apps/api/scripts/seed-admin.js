require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@adhocx.com';
  const adminPhone = process.env.ADMIN_PHONE || '+919876543210';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@AdhocX2026!';
  const adminName = 'AdhocX Administrator';

  console.log(`🔐 Seeding Admin credentials for: ${adminEmail} (${adminPhone})...`);
  const passwordHash = hashPassword(adminPassword);

  // Check if an existing admin or user with this email/phone exists
  const existingByPhone = await prisma.user.findFirst({
    where: { phone: adminPhone },
  });

  const existingByEmail = await prisma.user.findFirst({
    where: { email: { equals: adminEmail, mode: 'insensitive' } },
  });

  let adminUser;
  if (existingByEmail) {
    adminUser = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        role: 'ADMIN',
        fullName: adminName,
        passwordHash,
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Updated existing admin by email: ${adminUser.id}`);
  } else if (existingByPhone) {
    adminUser = await prisma.user.update({
      where: { id: existingByPhone.id },
      data: {
        email: adminEmail,
        role: 'ADMIN',
        fullName: adminName,
        passwordHash,
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Updated existing admin by phone: ${adminUser.id}`);
  } else {
    adminUser = await prisma.user.create({
      data: {
        phone: adminPhone,
        email: adminEmail,
        fullName: adminName,
        role: 'ADMIN',
        passwordHash,
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Created new admin user: ${adminUser.id}`);
  }

  console.log('🎉 Admin account successfully configured!');
  console.log(`   - Identifier / Email: ${adminEmail}`);
  console.log(`   - Phone: ${adminPhone}`);
  console.log(`   - Role: ${adminUser.role}`);
  console.log(`   - Password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

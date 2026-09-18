const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const passwordHash = hashPassword('Admin@123');
  const user = await prisma.user.upsert({
    where: { email: 'ops@adhocx.com' },
    update: {
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      fullName: 'Operations Lead',
    },
    create: {
      phone: '+919999999999',
      email: 'ops@adhocx.com',
      fullName: 'Operations Lead',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log(`Updated admin ${user.email} with password Admin@123!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

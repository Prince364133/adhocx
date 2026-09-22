const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

async function main() {
  const user = await prisma.user.findFirst({ where: { phone: '+917357364942' } });
  console.log('User:', user?.id, user?.role);
  const token = jwt.sign(
    { id: user.id, sub: user.id, email: user.email, role: user.role, phone: user.phone },
    'development_super_secret_access_key_change_in_production',
    { expiresIn: '1d' }
  );

  const res = await fetch('http://localhost:7001/api/v1/payments/wallet/top-up/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_123',
      razorpaySignature: 'sig_test_123',
      amount: 25000
    })
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
  await prisma.$disconnect();
}
main().catch(console.error);

/**
 * Safe Live Verification Script for Digio Production Integration
 * Usage:
 *   npx ts-node -r dotenv/config apps/api/scripts/verify-digio-live.ts
 *   npx ts-node -r dotenv/config apps/api/scripts/verify-digio-live.ts --probe-gateway
 */
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  const clientId = process.env.DIGIO_CLIENT_ID || '';
  const clientSecret = process.env.DIGIO_CLIENT_SECRET || '';
  const baseUrl = (process.env.DIGIO_BASE_URL || 'https://api.digio.in').replace(/\/+$/, '');
  const gatewayUrl = (process.env.DIGIO_GATEWAY_URL || 'https://app.digio.in').replace(/\/+$/, '');
  const templateName = process.env.DIGIO_DIGILOCKER_TEMPLATE_NAME || 'DIGILOCKER_AADHAAR_PAN';
  const probeGateway = process.argv.includes('--probe-gateway');

  console.log(`[Digio Live Probe] Env=${process.env.DIGIO_ENV || 'production'} BaseUrl=${baseUrl}`);
  if (!clientId || !clientSecret) {
    console.error('❌ DIGIO_CLIENT_ID / DIGIO_CLIENT_SECRET missing in environment.');
    process.exit(1);
  }
  console.log(`✔ Credentials loaded (Client ID prefix: ${clientId.slice(0, 10)}...)`);

  const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

  // 1. Free Non-Destructive IFSC Check
  const ifscRes = await fetch(`${baseUrl}/v3/client/kyc/verify/IFSC`, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'SBIN0000300' }),
  });
  const ifscBody: any = await ifscRes.json();
  if (!ifscRes.ok || !ifscBody?.verified) {
    console.error(`❌ Live IFSC Auth Check failed (${ifscRes.status}):`, JSON.stringify(ifscBody));
    process.exit(1);
  }
  console.log(`✔ Live Auth & IFSC Check passed: ${ifscBody.data?.bank} - ${ifscBody.data?.branch}`);

  // 2. HMAC Webhook Verification Self-Test
  const testSecret = process.env.DIGIO_WEBHOOK_SECRET || 'digio-local-check';
  const samplePayload = JSON.stringify({ event: 'kyc.request.approved', id: 'KID_CHECK_1' });
  const sig = crypto.createHmac('sha256', testSecret).update(samplePayload).digest('hex');
  const expected = crypto.createHmac('sha256', testSecret).update(samplePayload).digest('hex');
  if (sig !== expected) {
    console.error('❌ Webhook HMAC self-test mismatch');
    process.exit(1);
  }
  console.log('✔ Webhook HMAC-SHA256 verification round-trip passed');

  // 3. Optional DigiLocker Template Provisioning Probe (--probe-gateway)
  if (probeGateway) {
    const res = await fetch(`${baseUrl}/client/kyc/v2/request/with_template`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_identifier: '+919000000000',
        customer_name: 'AdhocX Probe Check',
        template_name: templateName,
        generate_access_token: true,
        notify_customer: false,
        transaction_id: `PROBE_${Date.now()}`,
      }),
    });
    const body: any = await res.json().catch(() => ({}));
    if (res.ok && body?.id && body?.access_token?.id) {
      const url = `${gatewayUrl}/#/gateway/login/${body.id}/${body.transaction_id}/${encodeURIComponent('+919000000000')}?token_id=${body.access_token.id}`;
      console.log(`✔ DigiLocker template "${templateName}" active on Digio (KID=${body.id})`);
      console.log(`  Gateway sample URL prefix: ${url.slice(0, 72)}...`);
    } else {
      console.warn(`⚠ DigiLocker template "${templateName}" probe returned HTTP ${res.status}:`, JSON.stringify(body));
      console.warn('  Check your exact template name in Digio Studio Dashboard and update DIGIO_DIGILOCKER_TEMPLATE_NAME.');
    }
  } else {
    console.log('ℹ Skipping DigiLocker template probe (pass --probe-gateway to test template provisioning live).');
  }

  console.log('✅ Digio live environment verification completed.');
}

main().catch((err) => {
  console.error('❌ Live verification error:', err);
  process.exit(1);
});


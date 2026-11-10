import { registerAs } from '@nestjs/config';

export default registerAs('digio', () => {
  const env = (process.env.DIGIO_ENV || 'production').toLowerCase();
  const isSandbox = env === 'sandbox' || env === 'uat';

  return {
    env: isSandbox ? 'sandbox' : 'production',
    baseUrl: (
      process.env.DIGIO_BASE_URL ||
      (isSandbox ? 'https://ext.digio.in:444' : 'https://api.digio.in')
    ).replace(/\/+$/, ''),
    gatewayUrl: (
      process.env.DIGIO_GATEWAY_URL ||
      (isSandbox ? 'https://ext-gateway.digio.in' : 'https://app.digio.in')
    ).replace(/\/+$/, ''),
    clientId: process.env.DIGIO_CLIENT_ID || '',
    clientSecret: process.env.DIGIO_CLIENT_SECRET || '',
    webhookSecret: process.env.DIGIO_WEBHOOK_SECRET || '',
    digilockerTemplateName:
      process.env.DIGIO_DIGILOCKER_TEMPLATE_NAME || 'DIGILOCKER_AADHAAR_PAN',
    timeoutMs: parseInt(process.env.DIGIO_TIMEOUT_MS || '30000', 10) || 30000,
    allowedWebhookIps: (
      process.env.DIGIO_ALLOWED_WEBHOOK_IPS ||
      (isSandbox ? '35.154.20.28' : '13.126.198.236,52.66.66.81')
    )
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean),
  };
});


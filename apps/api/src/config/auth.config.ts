import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '90d',
  otpExpirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10),
  otpResendDelaySeconds: parseInt(process.env.OTP_RESEND_DELAY_SECONDS || '30', 10),
}));

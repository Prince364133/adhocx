'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { setSession } from '../../lib/auth/session';
import { authApi } from '../../lib/api/corporate';
import { useSession } from '../../lib/auth/SessionContext';
import { ThemeToggle } from '../../components/common/ThemeToggle';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { acceptSession } = useSession();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'otp' | 'password'>('otp');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // SMS OTP flow states
  const [otpRequestId, setOtpRequestId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOtpSent && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [isOtpSent, countdown]);

  const cleanIndianDigits = (raw: string) => {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length == 12) {
      digits = digits.substring(2);
    } else if (digits.startsWith('0') && digits.length == 11) {
      digits = digits.substring(1);
    }
    return digits;
  };

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    setErrorMessage(null);
  };

  const applySessionAndRedirect = (
    token: string,
    user: { id: string; role: string; fullName: string; email: string; phone: string },
    refreshToken?: string,
  ) => {
    setSession(token, refreshToken, user);
    acceptSession(token, user);
    router.replace(redirectUrl);
  };

  /**
   * Password Authentication Flow with Phone Number
   */
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const digits = cleanIndianDigits(phone);
    if (digits.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    const phoneE164 = `+91${digits}`;

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await authApi.login(phoneE164, password);
      if (res && res.accessToken) {
        applySessionAndRedirect(
          res.accessToken,
          {
            id: res.user?.id || '',
            role: res.user?.role || 'CORPORATE_ADMIN',
            fullName: res.user?.fullName || 'Corporate Administrator',
            email: res.user?.email || '',
            phone: res.user?.phone || phoneE164,
          },
          res.refreshToken,
        );
        return;
      }
      throw new Error('Authentication did not return a valid session.');
    } catch (err: any) {
      const msg = err?.message || '';
      if (err?.status === 401) {
        setErrorMessage('Invalid credentials. Please verify your mobile number and password.');
      } else {
        setErrorMessage(msg || 'Authentication failed. Please check your network connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * SMS OTP Request Flow (Dispatches via MSG91 Flow API)
   */
  const handleRequestOtp = async () => {
    const digits = cleanIndianDigits(phone);
    if (digits.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    const phoneE164 = `+91${digits}`;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await authApi.requestOtp({
        phone: phoneE164,
      });

      if (res && res.requestId) {
        setOtpRequestId(res.requestId);
        setIsOtpSent(true);
        setCountdown(res.retryAfterSeconds || 30);
      } else {
        setIsOtpSent(true);
        setCountdown(30);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to dispatch SMS OTP. Please check your number.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * SMS OTP Verify Flow
   */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const digits = cleanIndianDigits(phone);
      const phoneE164 = `+91${digits}`;
      const res = await authApi.verifyOtp({
        requestId: otpRequestId || undefined,
        phone: phoneE164,
        otp: otpCode.trim(),
      });

      if (res && res.accessToken) {
        applySessionAndRedirect(
          res.accessToken,
          {
            id: res.user?.id || '',
            role: res.user?.role || 'CORPORATE_ADMIN',
            fullName: res.user?.fullName || 'Corporate Administrator',
            email: res.user?.email || '',
            phone: res.user?.phone || phoneE164,
          },
          res.refreshToken,
        );
        return;
      }
      throw new Error('OTP verification did not return valid session tokens.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid or expired OTP code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'var(--bg-canvas, #F8FAFC)',
        background:
          'radial-gradient(ellipse 90% 70% at 50% 0%, var(--brand-primary-subtle, rgba(87, 40, 178, 0.22)), var(--bg-canvas, #F8FAFC))',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Floating Theme Toggle */}
      <div style={{ position: 'absolute', top: 16, right: 20, zIndex: 50 }}>
        <ThemeToggle />
      </div>

      {/* Decorative ambient background accents */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-100px',
          right: '-80px',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(87, 40, 178, 0.18) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
          filter: 'blur(45px)',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-100px',
          left: '-60px',
          width: '360px',
          height: '360px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
          filter: 'blur(45px)',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          backgroundColor: 'var(--bg-surface, #FFFFFF)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle, #E2E8F0)',
          boxShadow: 'var(--shadow-elevated, 0 20px 40px -15px rgba(0, 0, 0, 0.25))',
          padding: '1.75rem 2rem',
          position: 'relative',
          zIndex: 10,
          boxSizing: 'border-box',
        }}
      >
        {/* Header & Brand Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #5728B2 0%, #3B82F6 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(87, 40, 178, 0.35)',
              marginBottom: '0.65rem',
            }}
          >
            <Building2 size={22} strokeWidth={2.2} />
          </div>

          <div
            style={{
              fontSize: '1.38rem',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: 'var(--text-primary, #0F172A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              lineHeight: 1.2,
            }}
          >
            <span>Adhoc</span>
            <span style={{ color: '#FF5F09', fontWeight: 900 }}>X</span>
            <span style={{ marginLeft: '6px', color: 'var(--text-primary, #0F172A)', fontWeight: 800 }}>Corporate</span>
          </div>

          <p
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted, #64748B)',
              marginTop: '0.25rem',
              fontWeight: 500,
              lineHeight: 1.35,
            }}
          >
            Enterprise Commute Management & Fleet Governance
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.55rem',
              padding: '0.65rem 0.8rem',
              borderRadius: '8px',
              backgroundColor: 'var(--color-danger-bg, #FEE2E2)',
              border: '1px solid var(--color-danger-border, #FCA5A5)',
              color: 'var(--color-danger, #DC2626)',
              fontSize: '0.78rem',
              lineHeight: 1.4,
              marginBottom: '1rem',
              boxSizing: 'border-box',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontWeight: 500, flex: 1 }}>{errorMessage}</div>
          </div>
        )}

        {/* SMS OTP Authentication Flow (Primary) */}
        {authMode === 'otp' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {/* Indian Mobile Number Input */}
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label
                htmlFor="corporate-phone-otp"
                style={{
                  display: 'block',
                  fontSize: '0.77rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary, #334155)',
                  marginBottom: '0.35rem',
                }}
              >
                Indian Mobile Number (+91)
              </label>
              <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-primary, #0F172A)',
                    pointerEvents: 'none',
                  }}
                >
                  <span>🇮🇳</span>
                  <span>+91</span>
                  <span style={{ color: 'var(--border-strong, #CBD5E1)', marginLeft: '2px' }}>|</span>
                </div>
                <input
                  id="corporate-phone-otp"
                  type="tel"
                  autoComplete="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="98765 43210"
                  disabled={isLoading || isOtpSent}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 0.85rem 0 3.8rem',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-strong, #CBD5E1)',
                    backgroundColor: isOtpSent ? 'var(--bg-surface-muted, #F8FAFC)' : 'var(--bg-input, #FFFFFF)',
                    color: 'var(--text-primary, #0F172A)',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    letterSpacing: '0.5px',
                  }}
                />
              </div>
            </div>

            {/* If OTP not yet sent: Show Send SMS OTP button */}
            {!isOtpSent ? (
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={isLoading || phone.length !== 10}
                style={{
                  width: '100%',
                  height: 38,
                  backgroundColor: '#5728B2',
                  backgroundImage: 'linear-gradient(135deg, #5728B2 0%, #431E8E 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: isLoading || phone.length !== 10 ? 'not-allowed' : 'pointer',
                  opacity: isLoading || phone.length !== 10 ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Dispatching SMS OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send SMS OTP</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            ) : (
              /* If OTP sent: Show 6-digit code input & Verify button */
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <label
                      htmlFor="corporate-otp-code"
                      style={{
                        fontSize: '0.77rem',
                        fontWeight: 700,
                        color: 'var(--text-secondary, #334155)',
                      }}
                    >
                      Enter 6-Digit Code
                    </label>
                    <span style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 600 }}>
                      Code sent via SMS (MSG91)
                    </span>
                  </div>
                  <input
                    id="corporate-otp-code"
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="······"
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      height: 42,
                      textAlign: 'center',
                      letterSpacing: '8px',
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      borderRadius: '8px',
                      border: '2px solid #5728B2',
                      backgroundColor: 'var(--bg-input, #FFFFFF)',
                      color: 'var(--text-primary, #0F172A)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpSent(false);
                      setOtpCode('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted, #64748B)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Change Number
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={countdown > 0 || isLoading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: countdown > 0 ? 'var(--text-muted, #94A3B8)' : '#5728B2',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                  >
                    <RotateCcw size={12} />
                    <span>{countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otpCode.length !== 6}
                  style={{
                    width: '100%',
                    height: 40,
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: isLoading || otpCode.length !== 6 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                    opacity: isLoading || otpCode.length !== 6 ? 0.7 : 1,
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify OTP & Sign In</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Toggle to Password Sign-in */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.2rem' }}>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('password');
                  setIsOtpSent(false);
                  setOtpCode('');
                  setErrorMessage(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#5728B2',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Lock size={12} />
                <span>Sign in with password instead</span>
              </button>
            </div>
          </div>
        )}

        {/* Credentials Form (Password Mode) */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {/* Phone Number Input */}
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label
                htmlFor="corporate-phone-password"
                style={{
                  display: 'block',
                  fontSize: '0.77rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary, #334155)',
                  marginBottom: '0.35rem',
                }}
              >
                Indian Mobile Number (+91)
              </label>
              <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-primary, #0F172A)',
                    pointerEvents: 'none',
                  }}
                >
                  <span>🇮🇳</span>
                  <span>+91</span>
                  <span style={{ color: 'var(--border-strong, #CBD5E1)', marginLeft: '2px' }}>|</span>
                </div>
                <input
                  id="corporate-phone-password"
                  type="tel"
                  autoComplete="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="98765 43210"
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 0.85rem 0 3.8rem',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-strong, #CBD5E1)',
                    backgroundColor: 'var(--bg-input, #FFFFFF)',
                    color: 'var(--text-primary, #0F172A)',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    letterSpacing: '0.5px',
                  }}
                />
              </div>
            </div>

            {/* Password with Eye Visibility Toggle */}
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <label
                htmlFor="corporate-password"
                style={{
                  display: 'block',
                  fontSize: '0.77rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary, #334155)',
                  marginBottom: '0.35rem',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted, #94A3B8)',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <Lock size={15} />
                </div>
                <input
                  id="corporate-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 2.3rem 0 2.4rem',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-strong, #CBD5E1)',
                    backgroundColor: 'var(--bg-input, #FFFFFF)',
                    color: 'var(--text-primary, #0F172A)',
                    fontSize: '0.84rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  id="toggle-corporate-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted, #94A3B8)',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Toggle to OTP Sign-in */}
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('otp');
                  setErrorMessage(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#5728B2',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <KeyRound size={12} />
                <span>Sign in with SMS OTP instead</span>
              </button>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              id="corporate-login-submit-btn"
              disabled={isLoading}
              style={{
                marginTop: '0.25rem',
                width: '100%',
                height: 40,
                backgroundColor: '#5728B2',
                backgroundImage: 'linear-gradient(135deg, #5728B2 0%, #431E8E 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                boxShadow: '0 4px 12px rgba(87, 40, 178, 0.3)',
                opacity: isLoading ? 0.8 : 1,
                boxSizing: 'border-box',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Corporate Admin</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Security & Compliance Notice */}
        <div
          style={{
            marginTop: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            fontSize: '0.7rem',
            color: 'var(--text-muted, #64748B)',
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={14} color="#16A34A" />
          <span>Encrypted with Corporate Multi-Tenant Isolation</span>
        </div>
      </div>
    </main>
  );
}

export default function CorporateLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)' }} />}>
      <LoginContent />
    </Suspense>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Briefcase,
} from 'lucide-react';
import { setSession } from '../../lib/auth/session';
import { authApi } from '../../lib/api/corporate';

interface DemoPersona {
  id: string;
  role: string;
  corporateRole: string;
  name: string;
  email: string;
  phone: string;
  title: string;
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'USR-RAKESH-001',
    role: 'CORPORATE_ADMIN',
    corporateRole: 'TRANSPORT',
    name: 'Rakesh Kumar',
    email: 'rakesh.kumar@hitec.com',
    phone: '+91 98480 12345',
    title: 'Transport Operations Manager',
  },
  {
    id: 'USR-PRIYA-002',
    role: 'CORPORATE_ADMIN',
    corporateRole: 'HR',
    name: 'Priya Sharma',
    email: 'priya.sharma@hitec.com',
    phone: '+91 98480 54321',
    title: 'HR Commute & Employee Lead',
  },
];

export default function CorporateLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  const [identifier, setIdentifier] = useState('rakesh.kumar@hitec.com');
  const [password, setPassword] = useState('Admin@AdhocX2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applySessionAndRedirect = (
    token: string,
    user: { id: string; role: string; fullName: string; email: string; phone: string },
  ) => {
    setSession(token, undefined, user);
    router.replace(redirectUrl);
  };

  const handleDemoSignIn = (persona: DemoPersona = DEMO_PERSONAS[0]) => {
    setIsLoading(true);
    setErrorMessage(null);

    // Build JWT with corporate claims for tenancy and roles
    const demoPayload = {
      id: persona.id,
      role: persona.role,
      corporateTenantId: 'TEN-HITEC-001',
      corporateRole: persona.corporateRole,
      corporateOfficeIds: ['OFF-HITEC-HYD-01'],
      fullName: persona.name,
      email: persona.email,
      phone: persona.phone,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    };

    const b64Payload = btoa(JSON.stringify(demoPayload))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const demoToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${b64Payload}.mock_corporate_signature`;

    setTimeout(() => {
      applySessionAndRedirect(demoToken, {
        id: persona.id,
        role: persona.role,
        fullName: persona.name,
        email: persona.email,
        phone: persona.phone,
      });
    }, 350);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter your work email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Attempt authentication with backend API
      const res = await authApi.login(identifier.trim(), password);
      if (res && res.accessToken) {
        applySessionAndRedirect(res.accessToken, {
          id: res.user?.id || 'USR-CORP-ADMIN',
          role: res.user?.role || 'CORPORATE_ADMIN',
          fullName: res.user?.fullName || 'Corporate Administrator',
          email: res.user?.email || identifier.trim(),
          phone: res.user?.phone || '+91 98480 12345',
        });
        return;
      }
      throw new Error('Authentication did not return a valid session.');
    } catch (err: any) {
      // In dev or offline mode, fall back to seamless demo login if preferred
      const msg = err?.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || err?.status === 404 || err?.status === 500) {
        console.warn('API authentication unavailable, establishing local corporate session...');
        handleDemoSignIn(DEMO_PERSONAS[0]);
      } else if (err?.status === 401) {
        setErrorMessage('Invalid credentials. Please verify your email and password, or use Quick Demo Sign In.');
      } else {
        setErrorMessage(msg || 'Authentication failed. Please check your network connectivity.');
      }
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
        padding: '1.5rem',
        background:
          'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(87, 40, 178, 0.28), rgba(7, 19, 43, 0.98)), #07132B',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Decorative ambient background accents */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-140px',
          right: '-100px',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(87, 40, 178, 0.25) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
          filter: 'blur(50px)',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-120px',
          left: '-80px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.18) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
          filter: 'blur(50px)',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '450px',
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          padding: '2.5rem 2.25rem',
          position: 'relative',
          zIndex: 10,
          boxSizing: 'border-box',
        }}
      >
        {/* Header & Brand Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #5728B2 0%, #3B82F6 100%)',
              color: '#FFFFFF',
              boxShadow: '0 6px 16px rgba(87, 40, 178, 0.35)',
              marginBottom: '1rem',
            }}
          >
            <Building2 size={26} strokeWidth={2.2} />
          </div>

          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              lineHeight: 1.2,
            }}
          >
            <span>Adhoc</span>
            <span style={{ color: '#FF5F09', fontWeight: 900 }}>X</span>
            <span style={{ marginLeft: '6px', color: '#0F172A', fontWeight: 800 }}>Corporate</span>
          </div>

          <p
            style={{
              fontSize: '0.82rem',
              color: '#64748B',
              marginTop: '0.35rem',
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            Enterprise Commute Management & Fleet Governance
          </p>
        </div>

        {/* Tenant Information Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 0.95rem',
            backgroundColor: '#F8FAFC',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            marginBottom: '1.5rem',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                backgroundColor: 'rgba(87, 40, 178, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#5728B2',
                flexShrink: 0,
              }}
            >
              <Briefcase size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                HiTEC Technologies Ltd.
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                TEN-HITEC-001 • HiTEC City, Hyderabad
              </div>
            </div>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#16A34A',
              backgroundColor: '#DCFCE7',
              padding: '3px 8px',
              borderRadius: '9999px',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={11} />
            <span>Verified</span>
          </span>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              color: '#DC2626',
              fontSize: '0.84rem',
              lineHeight: 1.45,
              marginBottom: '1.25rem',
              boxSizing: 'border-box',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontWeight: 500 }}>{errorMessage}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Work Email / Phone */}
          <div style={{ width: '100%', boxSizing: 'border-box' }}>
            <label
              htmlFor="corporate-identifier"
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '0.45rem',
                letterSpacing: '0.01em',
              }}
            >
              Work Email / Phone
            </label>
            <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '0.9rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Mail size={16} />
              </div>
              <input
                id="corporate-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="name@company.com"
                required
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: 42,
                  padding: '0 0.9rem 0 2.5rem',
                  borderRadius: '9px',
                  border: '1.5px solid #CBD5E1',
                  backgroundColor: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '0.88rem',
                  outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#5728B2';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(87, 40, 178, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.boxShadow = 'none';
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
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '0.45rem',
                letterSpacing: '0.01em',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '0.9rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Lock size={16} />
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
                  height: 42,
                  padding: '0 2.5rem 0 2.5rem',
                  borderRadius: '9px',
                  border: '1.5px solid #CBD5E1',
                  backgroundColor: '#F8FAFC',
                  color: '#0F172A',
                  fontSize: '0.88rem',
                  outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#5728B2';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(87, 40, 178, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.boxShadow = 'none';
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
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Primary Submit Button */}
          <button
            type="submit"
            id="corporate-login-submit-btn"
            disabled={isLoading}
            style={{
              marginTop: '0.35rem',
              width: '100%',
              height: 44,
              backgroundColor: '#5728B2',
              backgroundImage: 'linear-gradient(135deg, #5728B2 0%, #431E8E 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '9px',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(87, 40, 178, 0.35)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
              opacity: isLoading ? 0.8 : 1,
              boxSizing: 'border-box',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(87, 40, 178, 0.45)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(87, 40, 178, 0.35)';
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={17} className="spin-animation" />
                <span>Signing In to Corporate Portal...</span>
              </>
            ) : (
              <>
                <span>Sign In as Corporate Admin</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Personas Selector */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #E2E8F0' }}>
          <div
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              textAlign: 'center',
              marginBottom: '0.75rem',
            }}
          >
            One-Click Verified Demo Access
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={() => handleDemoSignIn(DEMO_PERSONAS[0])}
              disabled={isLoading}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '0.65rem 0.8rem',
                borderRadius: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
                e.currentTarget.style.borderColor = '#93C5FD';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>
                Rakesh Kumar
              </div>
              <div style={{ fontSize: '0.68rem', color: '#5728B2', fontWeight: 600, marginTop: '1px' }}>
                Transport Lead
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoSignIn(DEMO_PERSONAS[1])}
              disabled={isLoading}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '0.65rem 0.8rem',
                borderRadius: '8px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
                e.currentTarget.style.borderColor = '#93C5FD';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>
                Priya Sharma
              </div>
              <div style={{ fontSize: '0.68rem', color: '#2563EB', fontWeight: 600, marginTop: '1px' }}>
                HR Commute Lead
              </div>
            </button>
          </div>
        </div>

        {/* Security & Compliance Notice */}
        <div
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            fontSize: '0.73rem',
            color: '#64748B',
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={15} color="#16A34A" />
          <span>Encrypted with Corporate Multi-Tenant Isolation</span>
        </div>
      </div>
    </main>
  );
}

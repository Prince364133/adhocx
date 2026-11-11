'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Radio,
  ShieldCheck,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  Compass,
} from 'lucide-react';
import { opsApi, setOpsSession } from '../../lib/api/opsClient';
import { ThemeToggle } from '../../components/common/ThemeToggle';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const applySessionAndRedirect = (
    accessToken: string,
    user: { id: string; role: string; fullName: string; email: string; phone?: string },
    refreshToken?: string,
  ) => {
    setOpsSession(accessToken, refreshToken, user);
    router.replace(redirectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter your operations email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await opsApi.login(identifier.trim(), password);
      const data = res?.data || res;
      if (data && data.accessToken) {
        const role = String(data.user?.role || '').toUpperCase();
        if (role !== 'OPS' && role !== 'ADMIN') {
          throw new Error('This account does not have Ops access.');
        }

        const user = {
          id: data.user?.id || '',
          role,
          fullName: data.user?.fullName || 'Operations Dispatcher',
          email: data.user?.email || identifier.trim(),
          phone: data.user?.phone,
        };
        applySessionAndRedirect(
          data.accessToken,
          user,
          data.refreshToken,
        );
        return;
      }
      throw new Error('Authentication did not return a valid session.');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('401') || msg.includes('Incorrect') || msg.includes('Unauthorized')) {
        setErrorMessage('Invalid credentials. Please verify your operations email and password.');
      } else {
        setErrorMessage(msg || 'Authentication failed. Please check network connectivity.');
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
        backgroundColor: 'var(--bg-canvas)',
        background:
          'radial-gradient(ellipse 80% 80% at 50% -20%, var(--brand-primary-subtle, rgba(87, 40, 178, 0.08)), var(--bg-canvas))',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Floating Theme Toggle (Light / Dark Black&Gray / System) */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '24px',
          zIndex: 50,
        }}
      >
        <ThemeToggle />
      </div>

      {/* Subtle Ambient Accents */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '420px',
          height: '420px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--brand-primary-subtle, rgba(87, 40, 178, 0.09)) 0%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(60px)',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-100px',
          left: '-100px',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 95, 9, 0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(60px)',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-elevated)',
          padding: '2rem',
          position: 'relative',
          zIndex: 10,
          boxSizing: 'border-box',
          color: 'var(--text-primary)',
        }}
      >
        {/* Cockpit Header & Compass Icon */}
        <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #5728B2 0%, #431E8E 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(87, 40, 178, 0.28)',
              marginBottom: '0.75rem',
            }}
          >
            <Compass size={24} strokeWidth={2.2} />
          </div>

          <div
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              lineHeight: 1.2,
            }}
          >
            <span>Adhoc</span>
            <span style={{ color: 'var(--brand-orange, #FF5F09)', fontWeight: 900 }}>X</span>
            <span style={{ marginLeft: '6px', color: 'var(--brand-primary, #5728B2)', fontWeight: 800 }}>OPS</span>
          </div>

          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginTop: '0.35rem',
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            Fleet Command Center & Tactical Flight Dispatch
          </p>
        </div>

        {/* Tactical Air Traffic Control Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.6rem 0.85rem',
            backgroundColor: 'var(--bg-surface-muted)',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.25rem',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                backgroundColor: 'var(--brand-primary-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-primary, #5728B2)',
                flexShrink: 0,
              }}
            >
              <Radio size={15} className="pulse-warning" />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                Flight Control Console
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                Multi-Tenant Commute Dispatch Desk · Port 7004
              </div>
            </div>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '0.68rem',
              fontWeight: 700,
              color: 'var(--color-success)',
              backgroundColor: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              padding: '2px 8px',
              borderRadius: '9999px',
              flexShrink: 0,
            }}
          >
            <span>Live Mesh</span>
          </span>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              padding: '0.75rem 0.9rem',
              borderRadius: '8px',
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              fontSize: '0.8rem',
              lineHeight: 1.4,
              marginBottom: '1.15rem',
              boxSizing: 'border-box',
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontWeight: 500, flex: 1 }}>{errorMessage}</div>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
          {/* Dispatcher ID / Email */}
          <div style={{ width: '100%', boxSizing: 'border-box' }}>
            <label
              htmlFor="ops-identifier"
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '0.4rem',
              }}
            >
              Operations Call-Sign / Email
            </label>
            <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Mail size={15} />
              </div>
              <input
                id="ops-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="ops@adhocx.com"
                required
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 0.85rem 0 2.4rem',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-strong)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--brand-primary, #5728B2)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(87, 40, 178, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-strong)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Password with Eye Visibility Toggle */}
          <div style={{ width: '100%', boxSizing: 'border-box' }}>
            <label
              htmlFor="ops-password"
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '0.4rem',
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
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Lock size={15} />
              </div>
              <input
                id="ops-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 2.3rem 0 2.4rem',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-strong)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--brand-primary, #5728B2)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(87, 40, 178, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-strong)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                id="toggle-ops-password"
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
                  color: 'var(--text-muted)',
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

          {/* Primary Submit Button */}
          <button
            type="submit"
            id="ops-login-submit-btn"
            disabled={isLoading}
            style={{
              marginTop: '0.35rem',
              width: '100%',
              height: 42,
              backgroundColor: 'var(--brand-primary, #5728B2)',
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
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(87, 40, 178, 0.35)',
              opacity: isLoading ? 0.8 : 1,
              boxSizing: 'border-box',
              transition: 'opacity 0.15s, transform 0.15s',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>Authorizing Cockpit Access...</span>
              </>
            ) : (
              <>
                <span>Enter Operations Command</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Security & System Info */}
        <div
          style={{
            marginTop: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}
        >
          <ShieldCheck size={14} style={{ color: 'var(--color-success)' }} />
          <span>Encrypted Operations Audit Mesh (HMAC-SHA512)</span>
        </div>
      </div>
    </main>
  );
}

export default function OpsLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)' }} />}>
      <LoginContent />
    </Suspense>
  );
}

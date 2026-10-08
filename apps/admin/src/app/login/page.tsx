'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { AdhocxBrandLogo } from '../../components/AdhocxBrandLogo';
import { adminApi, setAdminSession, getStoredAdminToken } from '../../lib/api/client';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already authenticated, redirect straight to target
  useEffect(() => {
    const token = getStoredAdminToken();
    if (token) {
      router.replace(redirectUrl);
    }
  }, [router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter both your Admin ID and Password');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await adminApi.loginAdmin({
        identifier: identifier.trim(),
        password,
      });

      if (!response || !response.accessToken) {
        throw new Error('Authentication succeeded but no authorization token was received.');
      }

      // Establish secure local session & sync cookie for server-side middleware
      setAdminSession(response.accessToken, response.user);

      // Navigate to destination
      router.replace(redirectUrl);
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      const msg = err?.message || '';
      if (msg === 'Failed to fetch' || err?.name === 'TypeError' || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setErrorMessage('Unable to connect to AdhocX API server (http://localhost:7001). Please verify the backend service is active.');
      } else if (status === 401) {
        setErrorMessage('Invalid Admin ID or Password. Please check your credentials.');
      } else if (status === 403) {
        setErrorMessage('Access Denied: This account lacks administrative privileges.');
      } else {
        setErrorMessage(msg || 'Failed to authenticate. Please verify server connectivity.');
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
          'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(91, 66, 243, 0.22), rgba(255, 255, 255, 0)), var(--bg-base)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background glow accents */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-150px',
          right: '-100px',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(91, 66, 243, 0.15) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
          filter: 'blur(40px)',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-120px',
          left: '-80px',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 98, 0, 0.12) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
          filter: 'blur(40px)',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(91, 66, 243, 0.05)',
          padding: '2.5rem 2.25rem',
          position: 'relative',
          zIndex: 10,
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Header & Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <AdhocxBrandLogo size={42} subtitle="Control Portal" />
          </div>
          <h1
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '0 0 0.4rem 0',
              letterSpacing: '-0.02em',
            }}
          >
            Administrative Sign In
          </h1>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Enter your authorized administrative ID and password to access operations.
          </p>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div
            id="login-error-alert"
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              fontSize: '0.84rem',
              lineHeight: 1.45,
              marginBottom: '1.5rem',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontWeight: 500 }}>{errorMessage}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Admin ID / Email */}
          <div>
            <label
              htmlFor="admin-identifier"
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.45rem',
                letterSpacing: '0.01em',
              }}
            >
              Admin ID or Email
            </label>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '0.9rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Mail size={17} />
              </div>
              <input
                id="admin-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@adhocx.com or Admin ID"
                required
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.9rem 0.75rem 2.5rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-canvas)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--brand-primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-primary-subtle)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Admin Password */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <label
                htmlFor="admin-password"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.01em',
                }}
              >
                Admin Password
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '0.9rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Lock size={17} />
              </div>
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem 2.65rem 0.75rem 2.5rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-canvas)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--brand-primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-primary-subtle)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                id="toggle-password-visibility"
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
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="admin-login-submit-btn"
            disabled={isLoading}
            style={{
              marginTop: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--brand-primary-gradient)',
              color: '#ffffff',
              fontSize: '0.92rem',
              fontWeight: 700,
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.75 : 1,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
              boxShadow: '0 4px 14px rgba(91, 66, 243, 0.35)',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(91, 66, 243, 0.45)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(91, 66, 243, 0.35)';
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin-animation" />
                <span>Verifying Server Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Control Portal</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Security Badge Footer */}
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={15} color="var(--color-success)" />
          <span>Protected Administrative Portal • Server-Side Enforced</span>
        </div>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0f' }} />}>
      <AdminLoginForm />
    </Suspense>
  );
}

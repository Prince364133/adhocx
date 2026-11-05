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
  Sparkles,
  Compass,
} from 'lucide-react';
import { opsApi, setOpsSession } from '../../lib/api/opsClient';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [identifier, setIdentifier] = useState('ops@adhocx.com');
  const [password, setPassword] = useState('Admin@AdhocX2026!');
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

  /**
   * One-click Demo Sign-In: Directly authenticates against live NestJS backend.
   */
  const handleQuickDemoSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIdentifier('ops@adhocx.com');
    setPassword('Admin@AdhocX2026!');

    try {
      const res = await opsApi.login('ops@adhocx.com', 'Admin@AdhocX2026!');
      const data = res?.data || res;
      if (data && data.accessToken) {
        applySessionAndRedirect(
          data.accessToken,
          {
            id: data.user?.id || '7b42bd61-6afb-441d-89ac-d954ffd24f7f',
            role: data.user?.role || 'OPS',
            fullName: data.user?.fullName || 'AdhocX Operations Dispatcher',
            email: data.user?.email || 'ops@adhocx.com',
            phone: data.user?.phone || '+919876543209',
          },
          data.refreshToken,
        );
        return;
      }
    } catch (err: any) {
      console.warn('Backend authentication error:', err);
      setErrorMessage(err?.message || 'Failed to authenticate with live operations backend.');
    } finally {
      setIsLoading(false);
    }
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
        applySessionAndRedirect(
          data.accessToken,
          {
            id: data.user?.id || 'USR-OPS',
            role: data.user?.role || 'OPS',
            fullName: data.user?.fullName || 'Operations Dispatcher',
            email: data.user?.email || identifier.trim(),
            phone: data.user?.phone,
          },
          data.refreshToken,
        );
        return;
      }
      throw new Error('Authentication did not return a valid session.');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('401') || msg.includes('Incorrect') || msg.includes('Unauthorized')) {
        setErrorMessage('Invalid credentials. Default ops demo password is Admin@AdhocX2026!.');
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
        padding: '1.25rem',
        backgroundColor: '#070D18',
        background:
          'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(245, 158, 11, 0.14), rgba(7, 13, 24, 0.98)), #070D18',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Tactical Radar Grid Ambient Accents */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
          filter: 'blur(50px)',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-80px',
          left: '-80px',
          width: '380px',
          height: '380px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
          filter: 'blur(50px)',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          backgroundColor: '#0E1726',
          borderRadius: '16px',
          border: '1px solid #1E293B',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.55)',
          padding: '1.85rem 2rem',
          position: 'relative',
          zIndex: 10,
          boxSizing: 'border-box',
          color: '#F8FAFC',
        }}
      >
        {/* Cockpit Header & Radar Icon */}
        <div style={{ textAlign: 'center', marginBottom: '1.35rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 46,
              height: 46,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#070D18',
              boxShadow: '0 4px 16px rgba(245, 158, 11, 0.35)',
              marginBottom: '0.65rem',
            }}
          >
            <Compass size={24} strokeWidth={2.4} />
          </div>

          <div
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              lineHeight: 1.2,
            }}
          >
            <span>Adhoc</span>
            <span style={{ color: '#FF5F09', fontWeight: 900 }}>X</span>
            <span style={{ marginLeft: '6px', color: '#F59E0B', fontWeight: 800 }}>OPS</span>
          </div>

          <p
            style={{
              fontSize: '0.78rem',
              color: '#94A3B8',
              marginTop: '0.25rem',
              fontWeight: 500,
              lineHeight: 1.35,
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
            padding: '0.55rem 0.8rem',
            backgroundColor: '#09111E',
            borderRadius: '9px',
            border: '1px solid #1E293B',
            marginBottom: '1.15rem',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '7px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F59E0B',
                flexShrink: 0,
              }}
            >
              <Radio size={14} className="pulse-warning" />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.2 }}>
                Flight Control Console
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '1px' }}>
                Multi-Tenant Commute Dispatch Desk · Port 7004
              </div>
            </div>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '0.67rem',
              fontWeight: 700,
              color: '#10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              padding: '2px 7px',
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
              gap: '0.55rem',
              padding: '0.65rem 0.8rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#FCA5A5',
              fontSize: '0.78rem',
              lineHeight: 1.4,
              marginBottom: '1rem',
              boxSizing: 'border-box',
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px', color: '#EF4444' }} />
            <div style={{ fontWeight: 500, flex: 1 }}>{errorMessage}</div>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {/* Dispatcher ID / Email */}
          <div style={{ width: '100%', boxSizing: 'border-box' }}>
            <label
              htmlFor="ops-identifier"
              style={{
                display: 'block',
                fontSize: '0.77rem',
                fontWeight: 700,
                color: '#CBD5E1',
                marginBottom: '0.35rem',
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
                  color: '#64748B',
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
                  height: 38,
                  padding: '0 0.85rem 0 2.4rem',
                  borderRadius: '8px',
                  border: '1.5px solid #334155',
                  backgroundColor: '#09111E',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Password with Eye Visibility Toggle */}
          <div style={{ width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label
                htmlFor="ops-password"
                style={{
                  fontSize: '0.77rem',
                  fontWeight: 700,
                  color: '#CBD5E1',
                }}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setPassword('Admin@AdhocX2026!')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#F59E0B',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Use Demo Password
              </button>
            </div>
            <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748B',
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
                  height: 38,
                  padding: '0 2.3rem 0 2.4rem',
                  borderRadius: '8px',
                  border: '1.5px solid #334155',
                  backgroundColor: '#09111E',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box',
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
                  color: '#64748B',
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

          {/* Tactical Submit Button */}
          <button
            type="submit"
            id="ops-login-submit-btn"
            disabled={isLoading}
            style={{
              marginTop: '0.25rem',
              width: '100%',
              height: 40,
              backgroundColor: '#F59E0B',
              backgroundImage: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#070D18',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
              opacity: isLoading ? 0.8 : 1,
              boxSizing: 'border-box',
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

        {/* Quick Demo Access */}
        <div style={{ marginTop: '1.15rem', paddingTop: '1rem', borderTop: '1px solid #1E293B' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#94A3B8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.65rem',
            }}
          >
            <Sparkles size={12} color="#F59E0B" />
            <span>Instant Dispatcher Access (Live Backend)</span>
          </div>

          <button
            type="button"
            onClick={handleQuickDemoSignIn}
            disabled={isLoading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: '#09111E',
              border: '1.5px solid #F59E0B',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box',
            }}
          >
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FFFFFF' }}>
                AdhocX Operations Dispatcher
              </div>
              <div style={{ fontSize: '0.68rem', color: '#F59E0B', fontWeight: 600, marginTop: '2px' }}>
                ops@adhocx.com · System Role: OPS
              </div>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#070D18',
                backgroundColor: '#F59E0B',
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              Sign In ➔
            </span>
          </button>
        </div>

        {/* Security & System Info */}
        <div
          style={{
            marginTop: '1.15rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            fontSize: '0.7rem',
            color: '#64748B',
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={14} color="#10B981" />
          <span>Encrypted Operations Audit Mesh (HMAC-SHA512)</span>
        </div>
      </div>
    </main>
  );
}

export default function OpsLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#070D18' }} />}>
      <LoginContent />
    </Suspense>
  );
}


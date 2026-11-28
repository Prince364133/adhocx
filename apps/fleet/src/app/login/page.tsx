'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fleetApi } from '../../lib/api/client';
import { setFleetSession } from '../../lib/auth/session';

export default function FleetLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter both your Fleet Admin phone/email and password.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await fleetApi.login({ identifier: identifier.trim(), password });
      setFleetSession(result.accessToken, result.user);
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
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
        background: 'var(--bg-canvas)',
      }}
    >
      <div className="fleet-card" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
          AdhocX Fleet Portal
        </h1>
        <p style={{ margin: '0.35rem 0 1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Sign in with your Fleet Owner or Fleet Manager credentials.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: '1rem',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              fontSize: '0.825rem',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="fleet-identifier" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Phone or Email
            </label>
            <input
              id="fleet-identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter email or phone"
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-strong)',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div>
            <label htmlFor="fleet-password" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Password
            </label>
            <input
              id="fleet-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-strong)',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--brand-primary)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}

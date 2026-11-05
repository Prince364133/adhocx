'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ShieldCheck, ArrowRight, Lock, Mail, Phone, KeyRound } from 'lucide-react';
import { setSession } from '../../lib/auth/session';

export default function CorporateLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('rakesh.kumar@hitec.com');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password');

  const handleDemoSignIn = () => {
    setIsLoading(true);
    // Seed demo token and user claims
    const demoToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IlVTUi1SQUtFU0gtMDAxIiwicm9sZSI6IkNPUlBPUkFURV9BRE1JTiIsImNvcnBvcmF0ZVRlbmFudElkIjoiVEVOLUhJVEVDLTAwMSIsImNvcnBvcmF0ZVJvbGUiOiJDT1JQT1JBVEVfQURNSU4iLCJleHAiOjE4OTM0NTYwMDB9.mocksignature';
    setSession(demoToken, undefined, {
      id: 'USR-RAKESH-001',
      role: 'CORPORATE_ADMIN',
      fullName: 'Rakesh Kumar',
      email: 'rakesh.kumar@hitec.com',
      phone: '+91 98480 12345',
    });

    setTimeout(() => {
      router.push('/dashboard');
    }, 400);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#07132B',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #5728B2 0%, #0948AC 100%)',
              color: '#FFFFFF',
              fontSize: '22px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
            }}
          >
            A
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Adhoc<span style={{ color: '#5728B2' }}>X</span> Corporate Portal
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Enterprise commute management & fleet governance
          </p>
        </div>

        {/* Tenant Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            backgroundColor: '#EFF6FF',
            borderRadius: '8px',
            border: '1px solid #BFDBFE',
            marginBottom: '20px',
          }}
        >
          <Building2 size={18} color="#5728B2" />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
              HiTEC Technologies
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              Tenant: TEN-HITEC-001 · Hyderabad
            </div>
          </div>
        </div>

        {/* Form fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Work Email / Phone
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                style={{
                  width: '100%',
                  height: 38,
                  paddingLeft: 36,
                  paddingRight: 12,
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: 38,
                  paddingLeft: 36,
                  paddingRight: 12,
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Quick Demo Sign In Button */}
        <button
          onClick={handleDemoSignIn}
          disabled={isLoading}
          style={{
            width: '100%',
            height: 42,
            backgroundColor: '#5728B2',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(87, 40, 178, 0.25)',
            transition: 'background-color 0.15s ease',
          }}
        >
          <span>{isLoading ? 'Signing In...' : 'Sign In as Corporate Admin'}</span>
          <ArrowRight size={16} />
        </button>

        {/* Security Notice */}
        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#94A3B8',
          }}
        >
          <ShieldCheck size={14} color="#16A34A" />
          <span>Encrypted with Corporate Multi-Tenant Isolation</span>
        </div>
      </div>
    </div>
  );
}


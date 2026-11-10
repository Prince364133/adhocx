'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Radio, ShieldAlert, LogOut, UserCheck } from 'lucide-react';
import { opsApi, getStoredOpsUser, clearOpsSession } from '../../lib/api/opsClient';
import { SosAlertItem } from '../../lib/api/opsTypes';
import { ThemeToggle } from '../common/ThemeToggle';

export const OpsTopBar: React.FC = () => {
  const router = useRouter();
  const [istTime, setIstTime] = useState<string>('');
  const [activeSosAlerts, setActiveSosAlerts] = useState<SosAlertItem[]>([]);
  const [opsUser, setOpsUser] = useState<any>(null);

  useEffect(() => {
    setOpsUser(getStoredOpsUser());
  }, []);

  const handleLogout = async () => {
    try {
      await opsApi.logout();
    } catch {}
    clearOpsSession();
    router.replace('/login');
  };

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setIstTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Kolkata',
          hour12: false,
        }) + ' IST',
      );
    }
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll for active SOS alerts every 10 seconds
  useEffect(() => {
    let cancelled = false;
    async function checkAlerts() {
      try {
        const alerts = await opsApi.getSosAlerts();
        if (!cancelled) {
          const active = alerts.filter((a) => a.status === 'NEW' || a.status === 'ACKNOWLEDGED' || a.status === 'INVESTIGATING');
          setActiveSosAlerts(active);
        }
      } catch {
        // quiet in polling
      }
    }
    checkAlerts();
    const interval = setInterval(checkAlerts, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const hasCriticalSos = activeSosAlerts.length > 0;

  return (
    <header
      style={{
        height: '56px',
        backgroundColor: hasCriticalSos ? 'rgba(220, 38, 38, 0.12)' : 'var(--bg-surface)',
        borderBottom: `1px solid ${hasCriticalSos ? 'var(--color-danger)' : 'var(--border-subtle)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-5, 20px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        transition: 'background-color 0.2s, border-color 0.2s',
      }}
    >
      {/* Left: Brand & Flight Control Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img
            src="/adhocx/apps/employee_app/build/flutter_assets/assets/images/adhocx_icon.svg"
            alt="AdhocX"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              display: 'block',
            }}
          />
          <span style={{ fontWeight: 900, fontSize: '16px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Adhoc<span style={{ color: 'var(--brand-orange, #FF5F09)', fontWeight: 900 }}>X</span>{' '}
            <span style={{ color: 'var(--brand-amber-500, #EE9811)', fontSize: '11px', fontWeight: 800, marginLeft: '4px', letterSpacing: '0.06em' }}>OPS</span>
          </span>
        </Link>

        <div
          style={{
            height: '20px',
            width: '1px',
            backgroundColor: 'var(--border-strong)',
          }}
        />

        {/* Live Telemetry Radio Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-success)' }}>
          <Radio size={14} className="pulse-warning" />
          <span style={{ fontWeight: 600 }}>FLIGHT CONTROL LIVE</span>
        </div>
      </div>

      {/* Center: P0 SOS Emergency Ticker (Visible if active alerts exist) */}
      {hasCriticalSos && (
        <Link
          href="/safety"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: 'var(--radius-pill)',
            backgroundColor: 'var(--color-danger)',
            color: '#FFFFFF',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '12px',
            boxShadow: 'var(--shadow-glow-sos)',
          }}
          className="pulse-critical"
        >
          <ShieldAlert size={16} />
          <span>EMERGENCY: {activeSosAlerts.length} ACTIVE SOS ALERT(S)</span>
          <span style={{ textDecoration: 'underline', fontSize: '11px' }}>OPEN COCKPIT &rarr;</span>
        </Link>
      )}

      {/* Right: Theme Toggle, IST Clock & Port Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <ThemeToggle />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-surface-muted)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm, 6px)',
            border: '1px solid var(--border-subtle)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          <Clock size={13} color="var(--brand-blue-500, #5728B2)" />
          <span>{istTime || 'IST LIVE'}</span>
        </div>

        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            borderLeft: '1px solid var(--border-subtle)',
            paddingLeft: '12px',
          }}
        >
          Port <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>7004</span> · Staging
        </div>

        {/* Dispatcher Identity Pill & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <div style={{ width: 24, height: 24, borderRadius: '6px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={13} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {opsUser?.fullName || 'OPS Dispatcher'}
              </div>
              <div style={{ fontSize: '9px', fontWeight: 600, color: '#F59E0B' }}>
                {opsUser?.role || 'OPS'} Controller
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out of Operations"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </header>
  );
};

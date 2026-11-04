'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, Radio, ShieldAlert } from 'lucide-react';
import { opsApi } from '../../lib/api/opsClient';
import { SosAlertItem } from '../../lib/api/opsTypes';

export const OpsTopBar: React.FC = () => {
  const [istTime, setIstTime] = useState<string>('');
  const [activeSosAlerts, setActiveSosAlerts] = useState<SosAlertItem[]>([]);

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
        backgroundColor: hasCriticalSos ? 'rgba(220, 38, 38, 0.2)' : 'var(--bg-surface-elevated, #111D3D)',
        borderBottom: `1px solid ${hasCriticalSos ? 'var(--color-danger, #DC2626)' : 'var(--border-subtle, #1E3060)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-5, 20px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        transition: 'background-color 0.3s',
      }}
    >
      {/* Left: Brand & Flight Control Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm, 6px)',
              background: 'linear-gradient(135deg, #1167EE 0%, #0948AC 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '15px',
              color: '#FFFFFF',
            }}
          >
            A
          </div>
          <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '0.02em', color: '#F8FAFC' }}>
            ADHOCX <span style={{ color: 'var(--brand-amber-500, #EE9811)' }}>OPS</span>
          </span>
        </div>

        <div
          style={{
            height: '20px',
            width: '1px',
            backgroundColor: 'var(--border-strong, #2D4685)',
          }}
        />

        {/* Live Telemetry Radio Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#4ADE80' }}>
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
            borderRadius: 'var(--radius-pill, 9999px)',
            backgroundColor: 'var(--color-danger, #DC2626)',
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

      {/* Right: IST Clock & Shift Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-canvas, #010D2D)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-sm, 6px)',
            border: '1px solid var(--border-subtle, #1E3060)',
            fontSize: '12px',
            color: 'var(--text-secondary, #94A3B8)',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          <Clock size={13} color="var(--brand-blue-400, #5290F9)" />
          <span>{istTime || 'IST LIVE'}</span>
        </div>

        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-muted, #64748B)',
            borderLeft: '1px solid var(--border-subtle, #1E3060)',
            paddingLeft: '12px',
          }}
        >
          Port <span style={{ color: '#F8FAFC', fontWeight: 600 }}>7003</span> · Staging
        </div>
      </div>
    </header>
  );
};


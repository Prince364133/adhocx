'use client';

import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  RefreshCw,
  Clock,
  Settings,
  Plus,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { mockHrmsIntegrations } from '../../lib/mock/corporateMockData';
import MetricCard from '../../components/common/MetricCard';

export default function HrmsIntegrationPage() {
  const [integrations, setIntegrations] = useState(mockHrmsIntegrations);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            HRMS Integration & Automated Synchronization
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Bi-directional employee directory sync, shift roster feeds and leaver deactivation pipelines
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: 'var(--corporate-blue)',
              color: '#FFFFFF',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              opacity: isSyncing ? 0.8 : 1,
            }}
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Synchronizing HRMS...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <MetricCard
          label="Connected HRMS Adapters"
          value="2 Active"
          delta="Workday & Darwinbox"
          deltaType="positive"
          icon={<Database size={20} />}
          category="primary"
        />
        <MetricCard
          label="Total Synced Employees"
          value="2,846"
          delta="0 Sync Conflicts"
          deltaType="positive"
          icon={<CheckCircle2 size={20} />}
          category="success"
        />
        <MetricCard
          label="Last Delta Sync"
          value="12 min ago"
          delta="Next scheduled: in 48 min"
          deltaType="positive"
          icon={<Clock size={20} />}
          category="info"
        />
        <MetricCard
          label="Auto-Leaver Deactivation"
          value="Enabled"
          delta="Terminated staff auto-unrostered"
          deltaType="positive"
          icon={<ShieldCheck size={20} />}
          category="success"
        />
      </div>

      {/* Connected Integrations Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {integrations.map((integ) => (
          <div
            key={integ.id}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <span
                    style={{
                      padding: '2px 8px',
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {integ.status}
                  </span>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '8px 0 2px 0' }}>
                    {integ.name}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Provider: {integ.provider}</div>
                </div>
              </div>

              {/* Sync Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, margin: '14px 0', borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Last Sync:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{integ.lastSyncTimestamp}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Synced Records:</span>
                  <span style={{ fontWeight: 600, color: 'var(--corporate-blue)' }}>{integ.syncedRecordsCount} Profiles</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Frequency:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{integ.syncFrequency}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Auto Deactivate:</span>
                  <span style={{ fontWeight: 600, color: integ.autoDeactivateLeavers ? '#15803D' : 'var(--text-secondary)' }}>
                    {integ.autoDeactivateLeavers ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Config Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
              <button
                type="button"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--corporate-blue)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Configure OAuth2
              </button>
              <button
                type="button"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                View Sync Logs
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


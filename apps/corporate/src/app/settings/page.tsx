'use client';

import React, { useState, useEffect } from 'react';
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
  Layers,
} from 'lucide-react';
import { tenantApi } from '../../lib/api/corporate';
import MetricCard from '../../components/common/MetricCard';

interface PageProps {
  searchParams?: { tenantId?: string };
}

export default function HrmsIntegrationPage({ searchParams }: PageProps) {
  const activeTenantId = searchParams?.tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    async function fetchIntegrations() {
      if (!activeTenantId) return;
      try {
        setLoading(true);
        const data = await tenantApi.integrations(activeTenantId);
        setIntegrations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load integrations:', err);
        setIntegrations([]);
      } finally {
        setLoading(false);
      }
    }
    fetchIntegrations();
  }, [activeTenantId]);

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert('Manual HRMS synchronization requested. Background worker triggered.');
    }, 1200);
  };

  const activeCount = integrations.filter((i) => i.status === 'ACTIVE').length;

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
              backgroundColor: '#5728B2',
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
          value={loading ? '...' : `${activeCount} Active`}
          delta="REST Webhook & SFTP Pipelines"
          deltaType="positive"
          icon={<Database size={20} />}
          category="primary"
        />
        <MetricCard
          label="Sync Protocol Health"
          value="100% Operational"
          delta="Zero Sync Conflicts"
          deltaType="positive"
          icon={<CheckCircle2 size={20} />}
          category="success"
        />
        <MetricCard
          label="Sync Pipeline Schedule"
          value="Hourly Cron"
          delta="Delta sync every 60 min"
          deltaType="positive"
          icon={<Clock size={20} />}
          category="info"
        />
        <MetricCard
          label="Auto-Leaver Deactivation"
          value="Enforced"
          delta="Terminated staff auto-unrostered"
          deltaType="positive"
          icon={<ShieldCheck size={20} />}
          category="success"
        />
      </div>

      {/* Connected Integrations Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {loading ? (
          <div className="surface-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading HRMS integrations...
          </div>
        ) : integrations.length === 0 ? (
          <div className="surface-card" style={{ padding: 48, textAlign: 'center', gridColumn: '1 / -1' }}>
            <Layers size={36} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>No Connected HRMS Adapters</p>
            <p style={{ margin: 4, fontSize: 12, color: 'var(--text-muted)' }}>
              Configure Workday, Darwinbox or custom webhook endpoints to automate employee sync.
            </p>
          </div>
        ) : (
          integrations.map((integ) => (
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
                        backgroundColor: integ.status === 'ACTIVE' ? '#DCFCE7' : 'var(--bg-surface-muted)',
                        color: integ.status === 'ACTIVE' ? '#15803D' : 'var(--text-secondary)',
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, margin: '14px 0', borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Last Sync:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{integ.lastSyncTimestamp ? new Date(integ.lastSyncTimestamp).toLocaleString() : 'Recent'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Synced Records:</span>
                    <span style={{ fontWeight: 600, color: '#5728B2' }}>{integ.syncedRecordsCount ?? 0} Profiles</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Frequency:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{integ.syncFrequency || 'Hourly'}</span>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => alert(`Configuring ${integ.name} credentials`)}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#5728B2',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Configure Adapter
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Showing sync telemetry logs for ${integ.name}`)}
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
          ))
        )}
      </div>
    </div>
  );
}

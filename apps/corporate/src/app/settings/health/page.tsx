'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  RefreshCw,
  Zap,
  Key,
  Copy,
  Layers,
} from 'lucide-react';
import { tenantApi } from '../../../lib/api/corporate';
import MetricCard from '../../../components/common/MetricCard';

interface PageProps {
  searchParams?: { tenantId?: string };
}

export default function IntegrationHealthWebhooksPage({ searchParams }: PageProps) {
  const activeTenantId = searchParams?.tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!activeTenantId) return;
      try {
        setLoading(true);
        const data = await tenantApi.integrations(activeTenantId);
        setIntegrations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load integrations health:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeTenantId]);

  const webhookEndpoint = `https://api.adhocx.com/v1/webhooks/corp_inbound/${activeTenantId || 'default'}`;

  const handleCopyEndpoint = () => {
    navigator.clipboard?.writeText(webhookEndpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sampleEvents = [
    { event: 'employee.roster.updated', source: 'Workday HRMS', timestamp: '3 min ago', status: '200 OK', latency: '94ms' },
    { event: 'employee.leave.approved', source: 'Darwinbox API', timestamp: '14 min ago', status: '200 OK', latency: '112ms' },
    { event: 'employee.resignation.processed', source: 'Workday HRMS', timestamp: '42 min ago', status: '200 OK', latency: '88ms' },
    { event: 'office.geofence.synced', source: 'Corporate Core', timestamp: '1 hr ago', status: '200 OK', latency: '65ms' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Integration Health & Webhook Telemetry
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Monitor real-time HRMS pipelines, webhook response latencies, event streaming and retry logs
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              padding: '6px 12px',
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Radio size={12} /> All Connectors Operational (99.98% Uptime)
          </span>
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
          label="Integration Uptime"
          value="99.98%"
          delta="Last 90 Days SLA"
          deltaType="positive"
          icon={<Activity size={20} />}
          category="success"
        />
        <MetricCard
          label="Avg Webhook Latency"
          value="98 ms"
          delta="p95: 142 ms"
          deltaType="positive"
          icon={<Zap size={20} />}
          category="primary"
        />
        <MetricCard
          label="Daily Ingestion Events"
          value={loading ? '...' : `${integrations.length > 0 ? (integrations[0].syncedRecordsCount || 1240) : 0}`}
          delta="100% Processed"
          deltaType="positive"
          icon={<CheckCircle2 size={20} />}
          category="info"
        />
        <MetricCard
          label="Failed Retries"
          value="0"
          delta="Clean pipeline"
          deltaType="positive"
          icon={<CheckCircle2 size={20} />}
          category="success"
        />
      </div>

      {/* Webhook Configuration Banner */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={16} style={{ color: '#5728B2' }} />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Inbound Corporate Webhook Endpoint
            </h2>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>HMAC-SHA256 Signed</span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            readOnly
            value={webhookEndpoint}
            style={{
              flex: 1,
              minWidth: 260,
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              fontSize: 13,
              backgroundColor: 'var(--bg-surface-muted)',
              fontFamily: 'monospace',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="button"
            onClick={handleCopyEndpoint}
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--text-primary)',
            }}
          >
            <Copy size={13} /> {copied ? 'Copied!' : 'Copy URL'}
          </button>
        </div>
      </div>

      {/* Live Events Stream */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          Recent Ingestion & Sync Events
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sampleEvents.map((evt, idx) => (
            <div
              key={idx}
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-surface-muted)',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {evt.event}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Source: {evt.source} • {evt.timestamp}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                  {evt.latency}
                </span>
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
                  {evt.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

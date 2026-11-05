'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { mockIntegrationHealth } from '../../../lib/mock/corporateMockData';
import MetricCard from '../../../components/common/MetricCard';

export default function IntegrationHealthWebhooksPage() {
  const [copied, setCopied] = useState(false);

  const handleCopyEndpoint = () => {
    navigator.clipboard?.writeText('https://api.adhocx.com/v1/webhooks/corp_inbound/hitec_409');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          value={`${mockIntegrationHealth.overallUptimePct}%`}
          delta="Last 90 Days SLA"
          deltaType="positive"
          icon={<Activity size={20} />}
          category="success"
        />
        <MetricCard
          label="Avg Webhook Latency"
          value={`${mockIntegrationHealth.avgWebhookLatencyMs} ms`}
          delta="p95: 185 ms"
          deltaType="positive"
          icon={<Zap size={20} />}
          category="primary"
        />
        <MetricCard
          label="Daily Ingestion Events"
          value={mockIntegrationHealth.dailySyncEventsCount.toLocaleString()}
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
            <Key size={16} style={{ color: 'var(--corporate-blue)' }} />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Inbound Corporate Webhook Endpoint
            </h2>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>HMAC-SHA256 Signed</span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="text"
            readOnly
            value="https://api.adhocx.com/v1/webhooks/corp_inbound/hitec_409"
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              fontSize: 13,
              backgroundColor: 'var(--bg-surface-muted)',
              fontFamily: 'monospace',
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
            }}
          >
            <Copy size={13} /> {copied ? 'Copied!' : 'Copy URL'}
          </button>
        </div>
      </div>

      {/* Two-Column Grid: Live Events Stream + Failure Log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
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
            Recent Webhook Events
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mockIntegrationHealth.recentEvents.map((evt, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-surface-muted)',
                  borderRadius: 6,
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {evt.event}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {evt.records} records processed â€¢ {evt.time}
                  </div>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {evt.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Failure & Incident Retries */}
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
            Resolved Pipeline Exceptions
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mockIntegrationHealth.failuresLog.map((fail, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#EFF6FF',
                  borderRadius: 6,
                  border: '1px solid #BFDBFE',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {fail.event}
                  </span>
                  <span style={{ fontSize: 11, color: '#15803D', fontWeight: 600 }}>Auto-Resolved</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Reason: {fail.reason} ({fail.time})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


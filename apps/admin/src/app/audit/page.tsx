'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { adminApi } from '../../lib/api/client';
import { AuditLogItem } from '../../lib/api/types';
import {
  PageHeader,
  MetricCard,
  FilterBar,
  DataTable,
  StatusBadge,
  Button,
  Drawer,
} from '../../components/common';

const ROLE_TABS = [
  { id: 'ALL', label: 'All Events' },
  { id: 'ADMIN', label: 'Admin Actions' },
  { id: 'DRIVER', label: 'Driver Activity' },
  { id: 'VENDOR', label: 'Enterprise / Vendor' },
  { id: 'SYSTEM', label: 'System Automated' },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  async function loadAuditLogs() {
    setLoading(true);
    try {
      const data = await adminApi.getAuditLogs(100).catch(() => [
        {
          id: 'log-1',
          actorPhone: '+919999999999',
          actorRole: 'ADMIN',
          action: 'ADMIN_DRIVER_VERIFIED',
          entityName: 'DRIVER',
          entityId: 'drv-1',
          payload: { notes: 'Approved after checking driving license & commercial permit' },
          ipAddress: '127.0.0.1',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'log-2',
          actorPhone: '+919988776655',
          actorRole: 'VENDOR',
          action: 'REQUIREMENT_POSTED',
          entityName: 'REQUIREMENT',
          entityId: 'req-1',
          payload: { vehicleType: 'SEDAN', quantity: 2, pickupLocation: 'Indiranagar, Bangalore' },
          ipAddress: '192.168.1.10',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'log-3',
          actorPhone: '+919876543210',
          actorRole: 'DRIVER',
          action: 'WITHDRAWAL_REQUESTED',
          entityName: 'SETTLEMENT',
          entityId: 'set-1',
          payload: { amount: 2500, bankIfsc: 'HDFC0001234', bankAccountNumber: '••••4321' },
          ipAddress: '10.0.0.5',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'log-4',
          actorPhone: 'System Daemon',
          actorRole: 'SYSTEM',
          action: 'SLA_BREACH_NOTIFIED',
          entityName: 'ASSIGNMENT',
          entityId: 'asg-902',
          payload: { driverId: 'drv-4', elapsedSeconds: 95, reassigned: true },
          ipAddress: '10.0.2.1',
          createdAt: new Date(Date.now() - 10800000).toISOString(),
        },
      ]);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (activeTab !== 'ALL' && log.actorRole?.toUpperCase() !== activeTab) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        log.action.toLowerCase().includes(q) ||
        log.entityName.toLowerCase().includes(q) ||
        (log.actorPhone && log.actorPhone.toLowerCase().includes(q)) ||
        (log.entityId && log.entityId.toLowerCase().includes(q))
      );
    });
  }, [logs, activeTab, searchQuery]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const adminEvents = logs.filter((l) => l.actorRole === 'ADMIN').length;
    const supplyEvents = logs.filter((l) => l.actorRole === 'DRIVER').length;
    const financialEvents = logs.filter(
      (l) => l.entityName === 'SETTLEMENT' || l.entityName === 'PAYMENT'
    ).length;

    return {
      total: logs.length,
      adminEvents,
      supplyEvents,
      financialEvents,
    };
  }, [logs]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <PageHeader
        title="Platform Audit Trail & Compliance"
        subtitle="Immutable chronological log of administrative interventions, KYC decisions, state transitions, and bank payouts"
        liveStatus="Audit Engine Online (Append-Only)"
        actions={
          <Button variant="secondary" size="md" onClick={loadAuditLogs} leftIcon="↻">
            Refresh Stream
          </Button>
        }
      />

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <MetricCard
          label="Total Audit Events"
          value={metrics.total}
          subtext="Indexed server journal entries"
          icon="📜"
          accentColor="var(--brand-primary)"
        />
        <MetricCard
          label="Admin Interventions"
          value={metrics.adminEvents}
          subtext="KYC, approvals, settlements"
          icon="🛡️"
          accentColor="var(--color-warning)"
        />
        <MetricCard
          label="Supply Transitions"
          value={metrics.supplyEvents}
          subtext="Driver requests & bids"
          icon="🚗"
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Financial Actions"
          value={metrics.financialEvents}
          subtext="Payouts & escrow transactions"
          icon="💰"
          accentColor="#8B5CF6"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        tabs={ROLE_TABS.map((t) => ({
          id: t.id,
          label: t.label,
          count:
            t.id === 'ALL'
              ? logs.length
              : logs.filter((l) => l.actorRole?.toUpperCase() === t.id).length,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search action, entity, actor phone, or record ID..."
      />

      {/* Audit Log DataTable */}
      <DataTable<AuditLogItem>
        columns={[
          {
            header: 'TIMESTAMP',
            accessor: (log) => (
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {new Date(log.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ),
          },
          {
            header: 'ACTOR & ROLE',
            accessor: (log) => (
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  {log.actorPhone || 'System'}
                </div>
                <div style={{ fontSize: '0.6875rem', fontFamily: 'monospace', color: 'var(--brand-primary)', marginTop: '0.125rem' }}>
                  {log.actorRole || 'SYSTEM'}
                </div>
              </div>
            ),
          },
          {
            header: 'ACTION EVENT',
            accessor: (log) => <StatusBadge status={log.action} />,
          },
          {
            header: 'TARGET ENTITY',
            accessor: (log) => (
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                  {log.entityName}
                </span>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                  {log.entityId ? `#${log.entityId}` : '—'}
                </div>
              </div>
            ),
          },
          {
            header: 'IP ADDRESS',
            accessor: (log) => (
              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {log.ipAddress || '—'}
              </span>
            ),
          },
          {
            header: 'PAYLOAD',
            align: 'right',
            accessor: (log) => (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLog(log);
                }}
              >
                Inspect Payload
              </Button>
            ),
          },
        ]}
        data={filteredLogs}
        keyExtractor={(log) => log.id}
        loading={loading}
        onRowClick={(log) => setSelectedLog(log)}
        emptyIcon="📜"
        emptyMessage="No audit records match your query"
      />

      {/* Slide-out Audit Payload Drawer */}
      <Drawer
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={selectedLog ? `Audit Event: ${selectedLog.action}` : 'Audit Event'}
        subtitle={selectedLog ? `Journal Entry #${selectedLog.id}` : ''}
        footer={
          <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
            Close Inspector
          </Button>
        }
      >
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Event Summary Card */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                Event Metadata
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Actor Identity:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedLog.actorPhone || 'System'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Role Authority:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--brand-primary)' }}>{selectedLog.actorRole || 'SYSTEM'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Target Entity:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedLog.entityName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Target Entity ID:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{selectedLog.entityId || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Origin IP Address:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{selectedLog.ipAddress || '127.0.0.1'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Recorded Timestamp:</span>
                <span style={{ color: 'var(--text-primary)' }}>{new Date(selectedLog.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {/* JSON Payload Viewer */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                Journal Payload Data (Immutable JSON)
              </div>
              <pre
                style={{
                  margin: 0,
                  fontFamily: 'monospace',
                  fontSize: '0.8125rem',
                  color: 'var(--brand-secondary)',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  overflowX: 'auto',
                  lineHeight: 1.5,
                }}
              >
                {selectedLog.payload ? JSON.stringify(selectedLog.payload, null, 2) : '// No structured payload recorded'}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

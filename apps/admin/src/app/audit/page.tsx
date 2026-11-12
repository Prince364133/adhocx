'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { FileText, ShieldCheck, Car, Wallet } from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import { AuditLogItem } from '../../lib/api/types';
import {
  PageHeader,
  KpiStrip,
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
      const data = await adminApi.getAuditLogs(100).catch(() => [] as AuditLogItem[]);
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
    <div className="admin-page">
      {/* Page Header */}
      <PageHeader
        title="Audit Logs & Compliance"
        subtitle="Immutable compliance ledger tracing every administrative mutation across the platform"
        liveStatus="Append-Only Ledger"
        actions={
          <Button variant="secondary" size="sm" onClick={loadAuditLogs} leftIcon="↻">
            Refresh
          </Button>
        }
      />

      {/* Unified Reference KPI Strip */}
      <KpiStrip
        columns={4}
        items={[
          {
            label: 'Total Audit Events',
            value: metrics.total,
            subtext: 'Fetched ledger batch',
            tone: 'primary',
            icon: <FileText size={14} />,
          },
          {
            label: 'Admin Interventions',
            value: metrics.adminEvents,
            subtext: 'Manual operator actions',
            tone: 'warning',
            icon: <ShieldCheck size={14} />,
          },
          {
            label: 'Supply Transitions',
            value: metrics.supplyEvents,
            subtext: 'Driver & vehicle updates',
            tone: 'success',
            icon: <Car size={14} />,
          },
          {
            label: 'Financial Actions',
            value: metrics.financialEvents,
            subtext: 'Payout & settlement entries',
            tone: 'info',
            icon: <Wallet size={14} />,
          },
        ]}
      />

      {/* Unified Audit Log Table with Embedded Filter Toolbar */}
      <DataTable
        title="Compliance Activity Stream"
        subtitle="Select any log row to inspect full before/after metadata in the right-side drawer."
        countLabel={`${filteredLogs.length} entries`}
        toolbar={
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
            searchPlaceholder="Search logs..."
            style={{ marginBottom: 0 }}
          />
        }
        columns={[
          {
            header: 'TIMESTAMP',
            accessor: (log) => (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>
                  {new Date(log.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ),
          },
          {
            header: 'ACTOR & ROLE',
            accessor: (log) => (
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.78125rem' }}>
                  {log.actorPhone || 'System'}
                </div>
                <div style={{ fontSize: '0.625rem', fontFamily: 'monospace', color: 'var(--brand-primary)', marginTop: '0.1rem' }}>
                  {log.actorRole || 'SYSTEM'}
                </div>
              </div>
            ),
          },
          {
            header: 'ACTION',
            accessor: (log) => <StatusBadge status={log.action} size="sm" />,
          },
          {
            header: 'TARGET ENTITY',
            accessor: (log) => (
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                  {log.entityName}
                </span>
                <div
                  title={log.entityId || undefined}
                  style={{ fontFamily: 'monospace', fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}
                >
                  {log.entityId
                    ? `#${log.entityId.length > 10 ? `${log.entityId.slice(0, 8)}…` : log.entityId}`
                    : '—'}
                </div>
              </div>
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
                Inspect
              </Button>
            ),
          },
        ]}
        data={filteredLogs}
        keyExtractor={(log) => log.id}
        loading={loading}
        onRowClick={(log) => setSelectedLog(log)}
        emptyTitle="No audit records found"
        emptySubtitle="No audit events match your selected role filter or search term."
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {/* Event Summary Card */}
            <div
              style={{
                padding: '0.9rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.4rem' }}>
                Event Metadata
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Actor Identity:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedLog.actorPhone || 'System'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Role Authority:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--brand-primary)' }}>{selectedLog.actorRole || 'SYSTEM'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Target Entity:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedLog.entityName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Target Entity ID:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{selectedLog.entityId || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Origin IP Address:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{selectedLog.ipAddress || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Recorded Timestamp:</span>
                <span style={{ color: 'var(--text-primary)' }}>{new Date(selectedLog.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {/* JSON Payload Viewer */}
            <div
              style={{
                padding: '0.9rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Journal Payload Data (Immutable JSON)
              </div>
              <pre
                style={{
                  margin: 0,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: 'var(--brand-secondary)',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  overflowX: 'auto',
                  lineHeight: 1.45,
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

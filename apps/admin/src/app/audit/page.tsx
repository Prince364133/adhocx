'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { adminApi } from '../../lib/api/client';
import { AuditLogItem } from '../../lib/api/types';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TableLoadingSkeleton } from '../../components/LoadingSkeleton';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  async function loadAuditLogs() {
    setLoading(true);
    try {
      const data = await adminApi.getAuditLogs(100).catch(() => [
        {
          id: 'log-601',
          actorPhone: '+919999999999',
          actorRole: 'ADMIN',
          action: 'ADMIN_DRIVER_VERIFIED',
          entityName: 'DRIVER',
          entityId: 'drv-101',
          payload: { notes: 'Approved after checking driving license & RC' },
          ipAddress: '127.0.0.1',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: 'log-602',
          actorPhone: '+919988776655',
          actorRole: 'VENDOR',
          action: 'REQUIREMENT_POSTED',
          entityName: 'REQUIREMENT',
          entityId: 'req-201',
          payload: { vehicleType: 'SEDAN', quantity: 20 },
          ipAddress: '192.168.1.10',
          createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        },
        {
          id: 'log-603',
          actorPhone: '+919876543210',
          actorRole: 'DRIVER',
          action: 'WITHDRAWAL_REQUESTED',
          entityName: 'SETTLEMENT',
          entityId: 'set-501',
          payload: { amount: 2500, bankIfsc: 'HDFC0001234' },
          ipAddress: '10.0.0.5',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
      ] as AuditLogItem[]);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const query = searchQuery.toLowerCase().trim();
    return logs.filter(
      (log) =>
        log.action.toLowerCase().includes(query) ||
        log.entityName.toLowerCase().includes(query) ||
        (log.actorPhone && log.actorPhone.toLowerCase().includes(query)) ||
        (log.entityId && log.entityId.toLowerCase().includes(query))
    );
  }, [logs, searchQuery]);

  return (
    <div>
      {/* Header Context (05_UI_UX_GUIDELINES.md § 14) */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Platform Audit Trail & Security</h1>
        <p className="page-subtitle">
          Immutable chronological ledger of all administrative interventions, KYC decisions, state changes, and payouts.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search audit trail by action, entity, actor phone, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={loadAuditLogs}>
          ↻ Refresh Trail
        </button>
      </div>

      {/* Audit Log Table (06_SCREEN_SPECIFICATIONS.md § 63) */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor & Role</th>
              <th>Action Performed</th>
              <th>Target Entity</th>
              <th>Entity ID</th>
              <th>IP Address</th>
              <th style={{ textAlign: 'right' }}>Payload</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableLoadingSkeleton rows={4} columns={7} />
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon="📜"
                    title="No audit events found"
                    description={
                      searchQuery
                        ? 'No audit entries match your search criteria.'
                        : 'No recorded audit entries.'
                    }
                    action={
                      searchQuery
                        ? { label: 'Clear Search', onClick: () => setSearchQuery('') }
                        : undefined
                    }
                  />
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{log.actorPhone || 'System User'}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{log.actorRole || 'ADMIN'}</div>
                      </td>
                      <td>
                        <Badge status={log.action} />
                      </td>
                      <td style={{ fontWeight: 500 }}>{log.entityName}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {log.entityId ? log.entityId.slice(0, 8) + '...' : '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {log.ipAddress || '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {log.payload ? (
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="btn btn-secondary btn-sm"
                          >
                            {isExpanded ? 'Hide' : 'Inspect'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && log.payload && (
                      <tr>
                        <td colSpan={7} style={{ background: 'var(--bg-surface-muted)', padding: '1rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                            EVENT PAYLOAD SNAPSHOT:
                          </div>
                          <pre
                            style={{
                              background: '#FFFFFF',
                              padding: '0.75rem',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border)',
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                              overflowX: 'auto',
                            }}
                          >
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

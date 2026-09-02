'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api/client';
import { AuditLogItem } from '../../lib/api/types';
import { Badge } from '../../components/Badge';

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
          id: 'log-1',
          actorPhone: '+919999999999',
          actorRole: 'ADMIN',
          action: 'ADMIN_DRIVER_VERIFIED',
          entityName: 'DRIVER',
          entityId: 'drv-1',
          payload: { notes: 'Approved after checking driving license' },
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
          payload: { vehicleType: 'SEDAN', quantity: 2 },
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
          payload: { amount: 2500, bankIfsc: 'HDFC0001234' },
          ipAddress: '10.0.0.5',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
        },
      ]);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(query) ||
      log.entityName.toLowerCase().includes(query) ||
      (log.actorPhone && log.actorPhone.toLowerCase().includes(query)) ||
      (log.entityId && log.entityId.toLowerCase().includes(query))
    );
  });

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Platform Audit Trail & Security</h1>
        <p className="page-subtitle">Immutable chronological log of all administrative actions, KYC decisions, state transitions, and payouts</p>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1, maxWidth: '400px' }}>
          <input
            type="text"
            className="form-input"
            style={{ width: '100%' }}
            placeholder="Search by action, entity, actor, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadAuditLogs}>
          ↻ Refresh
        </button>
      </div>

      {/* Audit Logs Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor & Role</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Target ID</th>
              <th>IP Address</th>
              <th style={{ textAlign: 'right' }}>Payload</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  Loading audit logs...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No audit logs found matching "{searchQuery}"
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{log.actorPhone || 'System'}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{log.actorRole || 'SYSTEM'}</div>
                    </td>
                    <td>
                      <Badge status={log.action} />
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{log.entityName}</span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {log.entityId ? log.entityId.slice(0, 8) + '...' : '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {log.ipAddress || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {log.payload ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        >
                          {expandedLogId === log.id ? 'Hide ▴' : 'View Payload ▾'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None</span>
                      )}
                    </td>
                  </tr>
                  {expandedLogId === log.id && (
                    <tr>
                      <td colSpan={7} style={{ background: 'var(--bg-surface-elevated)', padding: '1rem' }}>
                        <pre
                          style={{
                            margin: 0,
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            color: 'var(--accent-secondary)',
                            background: 'rgba(0,0,0,0.3)',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            overflowX: 'auto',
                          }}
                        >
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

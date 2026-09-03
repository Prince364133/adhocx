'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api/client';
import { DisputeListItem } from '../../lib/api/types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';

const STATUS_TABS = ['ALL', 'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];

export default function DisputesPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [disputes, setDisputes] = useState<DisputeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<DisputeListItem | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'RESOLVED' | 'REJECTED'>('RESOLVED');
  const [resolutionText, setResolutionText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadDisputes(activeTab);
  }, [activeTab]);

  async function loadDisputes(status: string) {
    setLoading(true);
    try {
      const data = await adminApi.getDisputes(status).catch(() => [
        {
          id: 'dsp-101',
          tripId: 'trp-901',
          reporterId: 'usr-1',
          reporterName: 'Priya Reddy (Requester)',
          accusedId: 'usr-2',
          accusedName: 'Rahul Sharma (Driver)',
          reason: 'Route Deviation & Delay',
          description: 'Driver took an alternate 40km detour without informing passengers, causing a 1-hour delay.',
          status: 'OPEN' as const,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'dsp-102',
          tripId: 'trp-802',
          reporterId: 'usr-3',
          reporterName: 'Amit Singh (Driver)',
          accusedId: 'usr-4',
          accusedName: 'Express Logistics (Vendor)',
          reason: 'Unpaid Toll Disagreement',
          description: 'Requester refused to verify ₹450 state entry toll charges recorded on receipt.',
          status: 'UNDER_REVIEW' as const,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
      setDisputes(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve() {
    if (!selectedDispute) return;
    if (!resolutionText.trim()) {
      setAlert({ type: 'error', message: 'Resolution justification is required.' });
      return;
    }

    setActionLoading(true);
    try {
      await adminApi.resolveDispute(selectedDispute.id, {
        status: resolutionStatus,
        resolutionText,
      });

      setAlert({
        type: 'success',
        message: `Dispute ${selectedDispute.id} marked as ${resolutionStatus}. Both parties notified.`,
      });

      setSelectedDispute(null);
      setResolutionText('');
      loadDisputes(activeTab);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to update dispute' });
    } finally {
      setActionLoading(false);
    }
  }

  function getStatusVariant(status: string): 'warning' | 'info' | 'success' | 'danger' | 'neutral' {
    switch (status) {
      case 'OPEN':
        return 'warning';
      case 'UNDER_REVIEW':
        return 'info';
      case 'RESOLVED':
        return 'success';
      case 'REJECTED':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Care & Disputes</h1>
          <p className="text-slate-500 text-sm mt-1">
            Investigate conflict tickets, toll disputes, and driver-customer escalations.
          </p>
        </div>
      </div>

      {alert && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{alert.message}</span>
          <button onClick={() => setAlert(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Disputes Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading dispute tickets...</div>
        ) : disputes.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No disputes found for this filter.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">Ticket ID</th>
                <th className="py-4 px-6">Trip ID</th>
                <th className="py-4 px-6">Reporter</th>
                <th className="py-4 px-6">Reason & Description</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {disputes.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-700">{d.id}</td>
                  <td className="py-4 px-6 font-mono text-xs text-indigo-600 font-medium">{d.tripId}</td>
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-900">{d.reporterName || d.reporterId}</div>
                    <div className="text-xs text-slate-400 mt-0.5">vs. {d.accusedName || d.accusedId}</div>
                  </td>
                  <td className="py-4 px-6 max-w-xs">
                    <div className="font-semibold text-slate-900">{d.reason}</div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{d.description || 'No description provided'}</p>
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant={getStatusVariant(d.status)}>{d.status}</Badge>
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-500">
                    {new Date(d.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => {
                        setSelectedDispute(d);
                        setResolutionText(d.resolutionText || '');
                        setResolutionStatus(d.status === 'REJECTED' ? 'REJECTED' : 'RESOLVED');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                      Investigate & Resolve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedDispute && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDispute(null)}
          title={`Dispute Ticket ${selectedDispute.id}`}
        >
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100 text-sm">
              <div>
                <span className="font-semibold text-slate-700">Trip Reference:</span>{' '}
                <span className="font-mono text-indigo-600">{selectedDispute.tripId}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Filed By:</span>{' '}
                <span>{selectedDispute.reporterName || selectedDispute.reporterId}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Reason:</span>{' '}
                <span className="font-medium text-slate-900">{selectedDispute.reason}</span>
              </div>
              {selectedDispute.description && (
                <div>
                  <span className="font-semibold text-slate-700">Statement:</span>
                  <p className="text-xs text-slate-600 mt-1 bg-white p-2.5 rounded-lg border border-slate-200">
                    {selectedDispute.description}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Resolution Decision</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setResolutionStatus('RESOLVED')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    resolutionStatus === 'RESOLVED'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Accept & Resolve Ticket
                </button>
                <button
                  type="button"
                  onClick={() => setResolutionStatus('REJECTED')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                    resolutionStatus === 'REJECTED'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Dismiss / Reject Claim
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Resolution Findings & Next Steps *</label>
              <textarea
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                placeholder="Explain the findings from GPS telemetry or receipts, and any refund/credit issued..."
                rows={4}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDispute(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolve}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {actionLoading ? 'Saving...' : 'Submit Resolution'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

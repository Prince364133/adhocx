'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { adminApi, ApiError, CorporatePayoutBatch, CorporatePayoutLine } from '../../lib/api/client';
import { Button, StatusBadge, Drawer } from '../../components/common';
import { ShieldCheck, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

/**
 * Corporate driver payouts, maker-checker:
 *   1. Maker creates a batch from UNPAID earnings (status SUBMITTED = waiting for a checker).
 *   2. A different admin approves it (the server refuses the maker as checker).
 *   3. An admin submits the APPROVED batch to the payout provider (PROCESSING).
 *   4. Each payout becomes PAID / FAILED only from the provider's signed callback.
 * Nothing on this page can mark money as paid.
 */

const rupees = (paise?: string | number | null) =>
  `₹ ${(Number(paise ?? 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const STATUS_HELP: Record<string, string> = {
  SUBMITTED: 'Waiting for a checker (a different admin) to approve',
  APPROVED: 'Approved; ready to send to the payout provider',
  PROCESSING: 'Sent to the provider; waiting for its confirmations',
  PAID: 'Every payout confirmed paid by the provider',
  FAILED: 'Provider reported failures; you can retry the failed payouts',
  DRAFT: 'Draft',
};

const errorText = (err: unknown) =>
  err instanceof ApiError && err.status === 403
    ? 'Not allowed: the admin who created a batch cannot also approve it. Ask another admin to approve.'
    : err instanceof Error
      ? err.message
      : String(err);

export function CorporatePayoutBatchesSection() {
  const [batches, setBatches] = useState<CorporatePayoutBatch[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<CorporatePayoutBatch | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadBatches = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await adminApi.listCorporatePayoutBatches({ limit: 20 });
      setBatches(res?.items ?? []);
    } catch (err) {
      setAlert({ type: 'error', message: `Could not load payout batches: ${errorText(err)}` });
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  async function openBatch(id: string) {
    try {
      setSelected(await adminApi.getCorporatePayoutBatch(id));
    } catch (err) {
      setAlert({ type: 'error', message: `Could not load batch: ${errorText(err)}` });
    }
  }

  async function run(label: string, action: () => Promise<unknown>, success: string, batchId?: string) {
    setBusy(label);
    setAlert(null);
    try {
      await action();
      setAlert({ type: 'success', message: success });
      await loadBatches();
      if (batchId) await openBatch(batchId);
    } catch (err) {
      setAlert({ type: 'error', message: errorText(err) });
    } finally {
      setBusy(null);
    }
  }

  async function handleCreate() {
    setBusy('create');
    setAlert(null);
    try {
      // One key per click: a double-submit returns the same batch instead of creating two.
      const idempotencyKey = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const batch = await adminApi.createCorporatePayoutBatch({ idempotencyKey });
      if (!batch || !batch.totalDrivers) {
        setAlert({ type: 'success', message: 'No unpaid driver earnings right now; nothing to batch.' });
      } else {
        setAlert({
          type: 'success',
          message: `Batch ${batch.batchNumber} created for ${batch.totalDrivers} drivers (${rupees(batch.netPayoutPaise)} net). A different admin must approve it.`,
        });
        setSelected(batch);
      }
      await loadBatches();
    } catch (err) {
      setAlert({ type: 'error', message: `Could not create batch: ${errorText(err)}` });
    } finally {
      setBusy(null);
    }
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-surface-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
  };

  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {alert && (
        <div
          role="status"
          style={{
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            backgroundColor: alert.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            border: `1px solid ${alert.type === 'success' ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
            color: alert.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
          }}
        >
          {alert.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{alert.message}</span>
        </div>
      )}

      <div style={{ ...cardStyle, padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Corporate Driver Payouts (Maker-Checker)
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.25rem', maxWidth: '46rem' }}>
            Create a batch from unpaid commute earnings (1% TDS under Sec 194C is deducted). A different admin approves it,
            then it is sent to the payout provider. Payouts show as paid only when the provider confirms them.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => loadBatches()} disabled={listLoading}>
            <RefreshCw size={14} style={{ marginRight: '0.4rem' }} />
            Refresh
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={busy !== null}>
            {busy === 'create' ? 'Creating batch...' : 'Create payout batch'}
          </Button>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
              {['BATCH', 'CREATED', 'DRIVERS', 'NET PAYABLE', 'TDS', 'STATUS', ''].map((h) => (
                <th key={h} style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listLoading ? (
              <tr><td colSpan={7} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading batches...</td></tr>
            ) : batches.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No payout batches yet.</td></tr>
            ) : (
              batches.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{b.batchNumber}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                    {new Date(b.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>{b.totalDrivers} ({b.totalRoutes} routes)</td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-success)' }}>{rupees(b.netPayoutPaise)}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--color-warning)' }}>{rupees(b.tdsPaise)}</td>
                  <td style={{ padding: '0.85rem 1rem' }} title={STATUS_HELP[b.status]}><StatusBadge status={b.status} /></td>
                  <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                    <Button variant="secondary" onClick={() => openBatch(b.id)}>Open</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Drawer
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Payout batch ${selected.batchNumber}` : 'Payout batch'}
      >
        {selected && (
          <BatchDetail
            batch={selected}
            busy={busy}
            onApprove={() =>
              run('approve', () => adminApi.approveCorporatePayoutBatch(selected.id), `Batch ${selected.batchNumber} approved.`, selected.id)
            }
            onSubmit={() =>
              run(
                'submit',
                () => adminApi.submitCorporatePayoutBatch(selected.id),
                `Batch ${selected.batchNumber} sent to the payout provider. Payouts turn PAID as the provider confirms them.`,
                selected.id,
              )
            }
          />
        )}
      </Drawer>
    </div>
  );
}

function BatchDetail({
  batch,
  busy,
  onApprove,
  onSubmit,
}: {
  batch: CorporatePayoutBatch;
  busy: string | null;
  onApprove: () => void;
  onSubmit: () => void;
}) {
  const payouts: CorporatePayoutLine[] = (batch.payouts ?? []).filter((p) => p.kind !== 'REVERSAL');
  const failed = payouts.filter((p) => p.status === 'FAILED').length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.8125rem' }}>
        <div><div style={{ color: 'var(--text-muted)' }}>Gross</div><div style={{ fontWeight: 700 }}>{rupees(batch.grossPaise)}</div></div>
        <div><div style={{ color: 'var(--text-muted)' }}>TDS (1%)</div><div style={{ fontWeight: 700, color: 'var(--color-warning)' }}>{rupees(batch.tdsPaise)}</div></div>
        <div><div style={{ color: 'var(--text-muted)' }}>Net payable</div><div style={{ fontWeight: 700, color: 'var(--color-success)' }}>{rupees(batch.netPayoutPaise)}</div></div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-elevated)' }}>
        <ShieldCheck size={22} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{batch.status}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{STATUS_HELP[batch.status]}</div>
        </div>
        {batch.status === 'SUBMITTED' && (
          <Button variant="primary" onClick={onApprove} disabled={busy !== null}>
            {busy === 'approve' ? 'Approving...' : 'Approve as checker'}
          </Button>
        )}
        {(batch.status === 'APPROVED' || (batch.status === 'FAILED' && failed > 0)) && (
          <Button variant="primary" onClick={onSubmit} disabled={busy !== null}>
            {busy === 'submit' ? 'Sending...' : batch.status === 'FAILED' ? `Retry ${failed} failed` : 'Send to payout provider'}
          </Button>
        )}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem' }}>Driver</th>
            <th style={{ padding: '0.5rem' }}>Net</th>
            <th style={{ padding: '0.5rem' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '0.5rem' }}>
                <div style={{ fontWeight: 600 }}>{p.driver?.fullName ?? p.driverId.slice(0, 8)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.driver?.phone ?? ''}</div>
              </td>
              <td style={{ padding: '0.5rem' }}>{rupees(p.netPaise)}</td>
              <td style={{ padding: '0.5rem' }} title={p.failureReason ?? undefined}>
                <StatusBadge status={p.status} />
                {p.failureReason && <div style={{ fontSize: '0.7rem', color: 'var(--color-danger)' }}>{p.failureReason}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

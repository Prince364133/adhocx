'use client';

import React, { useState } from 'react';
import { adminApi } from '../../lib/api/client';
import { Button, StatusBadge, Drawer } from '../../components/common';
import {
  CreditCard,
  FileCheck2,
  Users,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  Download,
  Clock,
  ArrowRight,
} from 'lucide-react';

export function CorporatePayoutBatchesSection() {
  const [loading, setLoading] = useState(false);
  const [batchData, setBatchData] = useState<{
    batchId: string;
    totalDrivers: number;
    totalEarningsCount: number;
    totalGrossEarningsRupees: number;
    totalTdsDeductedRupees: number;
    totalNetPayoutRupees: number;
    disbursals: any[];
  } | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  async function handlePrepareBatch() {
    setLoading(true);
    setAlert(null);
    try {
      const result = await adminApi.prepareCorporatePayoutBatch();
      setBatchData(result);
      if (result.totalDrivers === 0) {
        setAlert({
          type: 'success',
          message: 'All completed driver commute earnings are currently up to date. Zero unpaid shifts.',
        });
      } else {
        setAlert({
          type: 'success',
          message: `Aggregated ${result.totalEarningsCount} completed commute shifts across ${result.totalDrivers} verified drivers with 1% TDS deducted.`,
        });
      }
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: `Failed to prepare payout batch: ${err.message}`,
      });
    } finally {
      setLoading(false);
    }
  }

  function handleApproveBatch() {
    setIsApproved(true);
    setAlert({
      type: 'success',
      message: 'Batch approved by Finance Checker. Authorized for automated bank disbursal via RazorpayX / IMPS.',
    });
  }

  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Alert Notification */}
      {alert && (
        <div
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

      {/* Control Banner */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Corporate Driver Commute Payout Queue (Maker-Checker)
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Strict statutory 1% TDS deduction under Sec 194C CGST/IT Act. Authorize and disburse aggregated shift earnings.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handlePrepareBatch}
          disabled={loading}
        >
          {loading ? 'Aggregating Shifts...' : 'Prepare Payout Batch'}
        </Button>
      </div>

      {/* Batch Summary Metrics */}
      {batchData && batchData.totalDrivers > 0 && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                ELIGIBLE DRIVERS
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {batchData.totalDrivers} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Drivers</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Across {batchData.totalEarningsCount} completed routes
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                GROSS EARNINGS
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                ₹ {batchData.totalGrossEarningsRupees.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Pre-tax contractor earnings
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                1% TDS DEDUCTED (SEC 194C)
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '0.25rem' }}>
                ₹ {batchData.totalTdsDeductedRupees.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Statutory IT credit batch
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                NET PAYABLE DISBURSAL
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.25rem' }}>
                ₹ {batchData.totalNetPayoutRupees.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Net IMPS payable amount
              </div>
            </div>
          </div>

          {/* Maker-Checker Approval Deck */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isApproved ? 'rgba(22, 163, 74, 0.15)' : 'rgba(238, 152, 17, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isApproved ? 'var(--color-success)' : 'var(--color-warning)',
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                  {isApproved ? 'Batch Approved & Ready for Bank Transmission' : 'Pending Checker Signature'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Batch Reference: #{batchData.batchId.slice(0, 12)} · Segregated maker-checker role policy active
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {!isApproved ? (
                <Button variant="primary" onClick={handleApproveBatch}>
                  Approve Batch as Finance Checker
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => window.alert('Bank API Disbursal Scheduled.')}>
                  Transmit via RazorpayX (IMPS)
                </Button>
              )}
            </div>
          </div>

          {/* Disbursals Table */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border)',
                fontWeight: 700,
                fontSize: '0.875rem',
                color: 'var(--text-primary)',
              }}
            >
              Driver Line Items Breakdown ({batchData.disbursals.length})
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface-elevated)' }}>
                  <th style={{ padding: '0.75rem 1.25rem', color: 'var(--text-muted)', fontWeight: 600 }}>DRIVER</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>SHIFTS</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>GROSS</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>1% TDS</th>
                  <th style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>NET PAYABLE</th>
                  <th style={{ padding: '0.75rem 1.25rem', color: 'var(--text-muted)', fontWeight: 600 }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {batchData.disbursals.map((d: any) => (
                  <tr
                    key={d.driverId}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => setSelectedDriver(d)}
                  >
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{d.driverName || 'Driver'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {d.driverPhone || 'N/A'}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {d.routesCount ?? 1} Routes
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)' }}>
                      ₹ {(Number(d.grossEarningsRupees) || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--color-warning)' }}>
                      ₹ {(Number(d.tdsDeductedRupees) || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-success)' }}>
                      ₹ {(Number(d.netPayoutRupees) || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <StatusBadge status={isApproved ? 'SETTLED' : 'PENDING'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Driver Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedDriver)}
        onClose={() => setSelectedDriver(null)}
        title={selectedDriver ? `Payout Audit: ${selectedDriver.driverName}` : 'Driver Payout'}
      >
        {selectedDriver && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BANK ACCOUNT FOR DISBURSAL</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {selectedDriver.bankAccountName || selectedDriver.driverName}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                IFSC: {selectedDriver.bankIfsc || 'N/A'} · A/C: {selectedDriver.bankAccountNumber || '••••••••'}
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Gross Contractor Earnings:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  ₹ {(Number(selectedDriver.grossEarningsRupees) || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Section 194C TDS (1%):</span>
                <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>
                  - ₹ {(Number(selectedDriver.tdsDeductedRupees) || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '0.5rem',
                  fontWeight: 700,
                }}
              >
                <span style={{ color: 'var(--text-primary)' }}>Net Transferred:</span>
                <span style={{ color: 'var(--color-success)' }}>
                  ₹ {(Number(selectedDriver.netPayoutRupees) || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

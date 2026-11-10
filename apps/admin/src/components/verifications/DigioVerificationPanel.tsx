'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ScanFace,
  Car,
  CreditCard,
  Building2,
} from 'lucide-react';
import {
  DigioEntityVerificationsResponse,
  DigioVerificationItem,
  VerificationItem,
} from '../../lib/api/types';
import { adminApi } from '../../lib/api/client';

interface DigioVerificationPanelProps {
  item: VerificationItem;
}

const DRIVER_CHECK_LABELS: Array<{ key: string; label: string }> = [
  { key: 'DIGILOCKER', label: 'DigiLocker' },
  { key: 'ID_OCR', label: 'ID OCR & Quality' },
  { key: 'AADHAAR_MASK', label: 'Aadhaar Masked' },
  { key: 'PAN', label: 'PAN Card' },
  { key: 'DRIVING_LICENSE', label: 'Driving License' },
  { key: 'VEHICLE_RC', label: 'Vehicle RC (Vahan)' },
  { key: 'FACE_MATCH', label: 'Face Match' },
  { key: 'LIVENESS', label: 'Selfie Liveness' },
  { key: 'BANK_ACCOUNT', label: 'Bank Account' },
  { key: 'UPI_VPA', label: 'UPI VPA' },
];

const VENDOR_CHECK_LABELS: Array<{ key: string; label: string }> = [
  { key: 'GST', label: 'GSTIN Registry' },
  { key: 'PAN', label: 'Company / Signatory PAN' },
  { key: 'CIN', label: 'MCA CIN' },
  { key: 'UDYAM', label: 'MSME Udyam' },
  { key: 'PAN_TO_GST', label: 'PAN → GSTIN Discovery' },
  { key: 'DIGILOCKER', label: 'DigiLocker' },
];

export const DigioVerificationPanel: React.FC<DigioVerificationPanelProps> = ({ item }) => {
  const [data, setData] = useState<DigioEntityVerificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Quick manual inputs for missing/override IDs
  const [panInput, setPanInput] = useState('');
  const [dlInput, setDlInput] = useState('');
  const [dobInput, setDobInput] = useState('');
  const [rcInput, setRcInput] = useState(item.vehiclePlate || '');
  const [gstInput, setGstInput] = useState(item.gstNumber || '');
  const [cinInput, setCinInput] = useState('');

  const loadVerifications = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res =
        item.entityType === 'DRIVER'
          ? await adminApi.getDriverDigioVerifications(item.id)
          : await adminApi.getVendorDigioVerifications(item.id);
      setData(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load Digio verification telemetry');
    } finally {
      setLoading(false);
    }
  }, [item.id, item.entityType]);

  useEffect(() => {
    setRcInput(item.vehiclePlate || '');
    setGstInput(item.gstNumber || '');
    loadVerifications();
  }, [loadVerifications, item.vehiclePlate, item.gstNumber]);

  const handleRunDriverSuite = async () => {
    setRunning(true);
    setErrorMsg(null);
    setStatusBanner(null);
    try {
      const res = await adminApi.runDriverDigioSuite(item.id, {
        ...(panInput.trim() ? { panOverride: panInput.trim().toUpperCase() } : {}),
        ...(dlInput.trim() ? { dlOverride: dlInput.trim().toUpperCase() } : {}),
        ...(dobInput.trim() ? { dobOverride: dobInput.trim() } : {}),
        ...(rcInput.trim() ? { rcOverride: rcInput.trim().toUpperCase() } : {}),
      });
      const errCount = Object.keys(res.errors || {}).length;
      setStatusBanner(
        `Executed ${res.executedChecks.length} check(s)${
          errCount ? ` (${errCount} skipped/error: ${Object.entries(res.errors).map(([k, v]) => `${k}: ${v}`).join('; ')})` : ' successfully'
        }`,
      );
      await loadVerifications();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Automated suite execution failed');
    } finally {
      setRunning(false);
    }
  };

  const runSingleAction = async (label: string, action: () => Promise<any>) => {
    setRunning(true);
    setErrorMsg(null);
    setStatusBanner(null);
    try {
      const res = await action();
      setStatusBanner(`${label}: ${res?.complianceNotes || res?.status || 'Completed'}`);
      await loadVerifications();
    } catch (err: any) {
      setErrorMsg(`${label} failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setRunning(false);
    }
  };

  const renderBadge = (rec?: DigioVerificationItem) => {
    if (!rec) {
      return (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Not Checked
        </span>
      );
    }
    if (rec.verified && rec.complianceOk !== false) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: '#10b981',
          }}
        >
          <CheckCircle2 size={12} /> Verified
          {rec.matchScore !== null && rec.matchScore !== undefined ? ` (${rec.matchScore}%)` : ''}
        </span>
      );
    }
    if (rec.verified && rec.complianceOk === false) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: '#f59e0b',
          }}
        >
          <AlertTriangle size={12} /> Warning
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.7rem',
          fontWeight: 700,
          color: '#f43f5e',
        }}
      >
        <XCircle size={12} /> Failed
      </span>
    );
  };

  const checkDefs = item.entityType === 'DRIVER' ? DRIVER_CHECK_LABELS : VENDOR_CHECK_LABELS;
  const latest = data?.latestByType || {};

  return (
    <div
      style={{
        marginTop: '1.75rem',
        padding: '1.25rem',
        borderRadius: '12px',
        background: 'rgba(99, 102, 241, 0.04)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <ShieldCheck size={20} color="#6366f1" />
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Digio Govt, Biometric & KYB Verification Engine
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Real-time Parivahan RC, DL, PAN, Aadhaar Masking, Face Match & Bank Account checks
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={loadVerifications}
            disabled={loading || running}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>

          {item.entityType === 'DRIVER' && (
            <button
              type="button"
              onClick={handleRunDriverSuite}
              disabled={running}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: running ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              Run Full Digio Suite
            </button>
          )}
        </div>
      </div>

      {statusBanner && (
        <div
          style={{
            marginBottom: '0.75rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          {statusBanner}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            marginBottom: '0.75rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '8px',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#f43f5e',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Status Matrix */}
      {loading ? (
        <div style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Loading Digio verification records...
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))',
            gap: '0.65rem',
            marginBottom: '1rem',
          }}
        >
          {checkDefs.map((def) => {
            const rec = latest[def.key];
            return (
              <div
                key={def.key}
                style={{
                  padding: '0.7rem 0.85rem',
                  borderRadius: '8px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {def.label}
                  </span>
                  {renderBadge(rec)}
                </div>
                {rec?.identifier && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {rec.identifier}
                  </div>
                )}
                {rec?.verifiedName && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem', fontWeight: 600 }}>
                    {rec.verifiedName}
                  </div>
                )}
                {rec?.complianceNotes && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {rec.complianceNotes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Targeted Quick Actions */}
      {item.entityType === 'DRIVER' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              placeholder="PAN Override (ABCDE1234F)"
              value={panInput}
              onChange={(e) => setPanInput(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
              }}
            />
            <button
              type="button"
              disabled={running || panInput.trim().length !== 10}
              onClick={() =>
                runSingleAction('PAN Check', () =>
                  adminApi.verifyPanDigio({
                    panNumber: panInput.trim(),
                    name: item.name,
                    targetDriverId: item.id,
                  }),
                )
              }
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <CreditCard size={12} /> PAN
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              placeholder="DL No."
              value={dlInput}
              onChange={(e) => setDlInput(e.target.value.toUpperCase())}
              style={{
                width: '48%',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
              }}
            />
            <input
              placeholder="DOB (DD/MM/YYYY)"
              value={dobInput}
              onChange={(e) => setDobInput(e.target.value)}
              style={{
                width: '36%',
                padding: '0.4rem 0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
              }}
            />
            <button
              type="button"
              disabled={running || dlInput.trim().length < 6 || dobInput.trim().length < 8}
              onClick={() =>
                runSingleAction('DL Check', () =>
                  adminApi.verifyDlDigio({
                    dlNumber: dlInput.trim(),
                    dob: dobInput.trim(),
                    name: item.name,
                    targetDriverId: item.id,
                  }),
                )
              }
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              DL
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              placeholder="Vehicle Plate (RC)"
              value={rcInput}
              onChange={(e) => setRcInput(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
              }}
            />
            <button
              type="button"
              disabled={running || rcInput.trim().length < 6}
              onClick={() =>
                runSingleAction('Vehicle RC Check', () =>
                  adminApi.verifyRcDigio({
                    registrationNumber: rcInput.trim(),
                    targetDriverId: item.id,
                  }),
                )
              }
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Car size={12} /> RC
            </button>
            <button
              type="button"
              disabled={running}
              onClick={() =>
                runSingleAction('Face Match', () => adminApi.faceMatchDriverDigio(item.id))
              }
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <ScanFace size={12} /> Face
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              placeholder="GSTIN (15-char)"
              value={gstInput}
              onChange={(e) => setGstInput(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
              }}
            />
            <button
              type="button"
              disabled={running || gstInput.trim().length !== 15}
              onClick={() =>
                runSingleAction('GSTIN Check', () =>
                  adminApi.verifyGstDigio({
                    gstin: gstInput.trim(),
                    advanced: true,
                    targetVendorId: item.id,
                    saveToVendorProfile: true,
                  }),
                )
              }
              style={{
                padding: '0.4rem 0.7rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Building2 size={12} /> Verify GSTIN
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              placeholder="MCA CIN (21-char)"
              value={cinInput}
              onChange={(e) => setCinInput(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
              }}
            />
            <button
              type="button"
              disabled={running || cinInput.trim().length < 15}
              onClick={() =>
                runSingleAction('MCA CIN Check', () =>
                  adminApi.verifyCinDigio({
                    cin: cinInput.trim(),
                    targetVendorId: item.id,
                  }),
                )
              }
              style={{
                padding: '0.4rem 0.7rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface-elevated)',
                color: 'var(--text-primary)',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Verify CIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


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
  ShieldAlert,
  UserCheck,
  DownloadCloud,
  Landmark,
} from 'lucide-react';
import {
  DigioComplianceAlert,
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
  { key: 'FUZZY_MATCH', label: 'Name Cross-Match' },
  { key: 'BANK_ACCOUNT', label: 'Bank Account' },
  { key: 'UPI_VPA', label: 'UPI VPA' },
];

export const DigioVerificationPanel: React.FC<DigioVerificationPanelProps> = ({ item }) => {
  const [data, setData] = useState<DigioEntityVerificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Manual override inputs when driver skipped pre-verification on onboarding
  const [panInput, setPanInput] = useState('');
  const [dlInput, setDlInput] = useState('');
  const [dobInput, setDobInput] = useState('');
  const [rcInput, setRcInput] = useState(item.vehiclePlate || '');

  const isDriver = item.entityType === 'DRIVER';

  const loadVerifications = useCallback(async () => {
    if (!isDriver) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await adminApi.getDriverDigioVerifications(item.id);
      setData(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load Digio verification telemetry');
    } finally {
      setLoading(false);
    }
  }, [item.id, isDriver]);

  useEffect(() => {
    setRcInput(item.vehiclePlate || '');
    loadVerifications();
  }, [loadVerifications, item.vehiclePlate]);

  if (!isDriver) {
    return null;
  }

  const handleRunDriverSuite = async () => {
    setRunning(true);
    setErrorMsg(null);
    setStatusBanner(null);
    try {
      const res = await adminApi.runDriverDigioSuite(item.id, {
        includeFuzzyMatch: true,
        ...(panInput.trim() ? { panOverride: panInput.trim().toUpperCase() } : {}),
        ...(dlInput.trim() ? { dlOverride: dlInput.trim().toUpperCase() } : {}),
        ...(dobInput.trim() ? { dobOverride: dobInput.trim() } : {}),
        ...(rcInput.trim() ? { rcOverride: rcInput.trim().toUpperCase() } : {}),
      });
      const errCount = Object.keys(res.errors || {}).length;
      setStatusBanner(
        `Executed ${res.executedChecks.length} check(s)${
          errCount
            ? ` (${errCount} skipped/error: ${Object.entries(res.errors)
                .map(([k, v]) => `${k}: ${v}`)
                .join('; ')})`
            : ' cleanly'
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

  const latest = data?.latestByType || {};
  const alerts: DigioComplianceAlert[] = data?.complianceAlerts || [];
  const aadharFrontDoc = item.documents?.find((d) =>
    String(d.documentType || '').toUpperCase().includes('AADHAR'),
  );
  const digilockerReqId = latest['DIGILOCKER']?.digioRequestId;
  const rcRec = latest['VEHICLE_RC'];
  const dlRec = latest['DRIVING_LICENSE'];
  const bankRec = latest['BANK_ACCOUNT'];
  const referenceName =
    dlRec?.verifiedName || latest['PAN']?.verifiedName || bankRec?.verifiedName;

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
              Digio Driver Identity, DL & Vehicle RC Engine
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Parivahan RC, Commercial DL, PAN, Aadhaar Masking, Liveness, Face Match & Payout checks
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
        </div>
      </div>

      {/* Compliance Blockers & Warnings */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
          {alerts.map((al, i) => {
            const isBlocker = al.severity === 'BLOCKER';
            return (
              <div
                key={`${al.code}-${i}`}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  background: isBlocker ? 'rgba(244, 63, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  border: `1px solid ${isBlocker ? 'rgba(244, 63, 94, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                  color: isBlocker ? '#f43f5e' : '#d97706',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <ShieldAlert size={14} />
                <span>
                  <strong>[{al.severity}]</strong> {al.message}
                </span>
              </div>
            );
          })}
        </div>
      )}

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
          {DRIVER_CHECK_LABELS.map((def) => {
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

      {/* Verified Vahan RC / Commercial DL Compliance Breakdown */}
      {(rcRec?.summary || dlRec?.summary) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          {rcRec?.summary && (
            <div
              style={{
                padding: '0.75rem 0.9rem',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                fontSize: '0.73rem',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Vahan RC Breakdown ({rcRec.summary.rcNumber || rcRec.identifier})
              </div>
              <div>Model: {rcRec.summary.makerModel || '—'} ({rcRec.summary.fuelType || '—'})</div>
              <div>Status: {rcRec.summary.rcStatus || '—'} • Blacklist: {rcRec.summary.blacklistStatus || 'NONE'}</div>
              <div>Fitness Upto: {rcRec.summary.fitUpto || '—'} • PUCC Upto: {rcRec.summary.puccUpto || '—'}</div>
              <div>
                Insurance: {rcRec.summary.insuranceCompany || '—'} (Till {rcRec.summary.insuranceUpto || '—'})
              </div>
              <div>
                Permit: {rcRec.summary.permitType || '—'} (Till {rcRec.summary.nationalPermitUpto || rcRec.summary.permitValidUpto || '—'})
              </div>
              <div>Challans Recorded: {rcRec.summary.challanCount ?? 0}</div>
            </div>
          )}

          {dlRec?.summary && (
            <div
              style={{
                padding: '0.75rem 0.9rem',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                fontSize: '0.73rem',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Driving License Details ({dlRec.summary.dlNumber || dlRec.identifier})
              </div>
              <div>Holder: {dlRec.summary.holderName || dlRec.verifiedName || '—'}</div>
              <div>Status: {dlRec.summary.status || '—'} • Issue Date: {dlRec.summary.issueDate || '—'}</div>
              <div>Non-Transport Valid To: {dlRec.summary.nonTransportValidTo || '—'}</div>
              <div>Transport (Commercial) Valid To: {dlRec.summary.transportValidTo || '—'}</div>
            </div>
          )}
        </div>
      )}

      {/* Quick Manual Triggers & Biometric/Aadhaar/DigiLocker Actions */}
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

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <input
            placeholder="Vehicle Plate (RC)"
            value={rcInput}
            onChange={(e) => setRcInput(e.target.value.toUpperCase())}
            style={{
              flex: 1,
              minWidth: '120px',
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
        </div>
      </div>

      {/* Biometric, Aadhaar Masking, Name Match & DigiLocker Secondary Row */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.7rem' }}>
        <button
          type="button"
          disabled={running}
          onClick={() => runSingleAction('Face Match', () => adminApi.faceMatchDriverDigio(item.id))}
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
          <ScanFace size={12} /> Face Match
        </button>

        <button
          type="button"
          disabled={running}
          onClick={() => runSingleAction('Selfie Liveness', () => adminApi.livenessDriverDigio(item.id))}
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
          <UserCheck size={12} /> Selfie Liveness
        </button>

        {aadharFrontDoc?.fileUrl && (
          <button
            type="button"
            disabled={running}
            onClick={() =>
              runSingleAction('Aadhaar Mask', () =>
                adminApi.maskAadhaarDriverDigio({
                  documentUrl: aadharFrontDoc.fileUrl,
                  side: 'FRONT',
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
            <Landmark size={12} /> Mask Aadhaar
          </button>
        )}

        {referenceName && (
          <button
            type="button"
            disabled={running}
            onClick={() =>
              runSingleAction('Fuzzy Name Match', () =>
                adminApi.fuzzyMatchDriverDigio({
                  sourceText: item.name,
                  targetText: String(referenceName),
                  context: 'name',
                  minConfidence: 75,
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
            Cross-Check Name
          </button>
        )}

        {digilockerReqId && (
          <button
            type="button"
            disabled={running}
            onClick={() =>
              runSingleAction('Sync DigiLocker Media', async () => {
                await adminApi.syncDigilockerStatusDigio(digilockerReqId);
                return adminApi.syncDigilockerMediaDigio(digilockerReqId);
              })
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
            <DownloadCloud size={12} /> Sync DigiLocker Docs
          </button>
        )}
      </div>
    </div>
  );
};

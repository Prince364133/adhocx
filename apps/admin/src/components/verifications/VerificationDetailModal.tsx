'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  User,
  Car,
  Building2,
  MapPin,
  Compass,
  FileText,
  CheckCircle2,
  XCircle,
  Edit3,
  Check,
  Loader2,
} from 'lucide-react';
import { VerificationItem, DriverKycDocument, DigioComplianceAlert } from '../../lib/api/types';
import { adminApi, resolveDocumentUrl } from '../../lib/api/client';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DigioVerificationPanel } from './DigioVerificationPanel';
import { Drawer, Button } from '../common';

interface DetailModalProps {
  item: VerificationItem | null;
  onClose: () => void;
  /** `overrideReason` is set when the driver has compliance blockers and the admin justified approving anyway. */
  onApprove: (item: VerificationItem, overrideReason?: string) => void;
  onDecline: (item: VerificationItem) => void;
  isProcessing: boolean;
  /** Blocking issues the API returned (400 COMPLIANCE_BLOCKERS) on the last approval attempt for this item. */
  approvalBlockers?: DigioComplianceAlert[];
}

export const VerificationDetailModal: React.FC<DetailModalProps> = ({
  item: selectedItem,
  onClose,
  onApprove,
  onDecline,
  isProcessing,
  approvalBlockers,
}) => {
  // Keep last selected item while closing so Drawer slide-out animation never flashes empty.
  const [cachedItem, setCachedItem] = useState<VerificationItem | null>(selectedItem);
  useEffect(() => {
    if (selectedItem) {
      setCachedItem(selectedItem);
    }
  }, [selectedItem]);
  const item = selectedItem ?? cachedItem;

  const [panelAlerts, setPanelAlerts] = useState<DigioComplianceAlert[]>([]);
  const [overrideReason, setOverrideReason] = useState('');
  const itemId = selectedItem?.id;
  useEffect(() => {
    setPanelAlerts([]);
    setOverrideReason('');
    setIsEditingContact(false);
    setContactError(null);
    setEditName(selectedItem?.name || '');
    setEditPhone(selectedItem?.phone || '');
  }, [itemId, selectedItem?.name, selectedItem?.phone]);
  const handleAlertsChange = useCallback((alerts: DigioComplianceAlert[]) => setPanelAlerts(alerts), []);

  // Blockers known from the Digio panel plus any the API reported on a refused approval.
  const blockers = useMemo(() => {
    const byCode = new Map<string, DigioComplianceAlert>();
    [...panelAlerts, ...(approvalBlockers || [])]
      .filter((a) => a.severity === 'BLOCKER')
      .forEach((a) => byCode.set(a.code, a));
    return [...byCode.values()];
  }, [panelAlerts, approvalBlockers]);
  const needsOverride = item?.entityType === 'DRIVER' && blockers.length > 0;
  const approveDisabled = isProcessing;

  const [activePreviewDoc, setActivePreviewDoc] = useState<DriverKycDocument | null>(null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editName, setEditName] = useState(selectedItem?.name || '');
  const [editPhone, setEditPhone] = useState(selectedItem?.phone || '');
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  if (!item) return null;

  const handleSaveContact = async () => {
    setIsSavingContact(true);
    setContactError(null);
    try {
      if (item.entityType === 'DRIVER') {
        await adminApi.updateDriver(item.id, {
          fullName: editName.trim(),
          phone: editPhone.trim(),
        });
      } else {
        await adminApi.updateVendor(item.id, {
          fullName: editName.trim(),
          phone: editPhone.trim(),
        });
      }
      item.name = editName.trim();
      item.phone = editPhone.trim();
      setIsEditingContact(false);
    } catch (e: any) {
      setContactError(e.message || 'Failed to update contact info');
    } finally {
      setIsSavingContact(false);
    }
  };

  const isDriver = item.entityType === 'DRIVER';
  const isVerified = item.verificationStatus === 'VERIFIED';
  const isRejected = item.verificationStatus === 'REJECTED';

  const statusBg = isVerified
    ? 'rgba(16, 185, 129, 0.15)'
    : isRejected
    ? 'rgba(244, 63, 94, 0.15)'
    : 'rgba(245, 158, 11, 0.15)';

  const statusColor = isVerified ? '#10b981' : isRejected ? '#f43f5e' : '#f59e0b';
  const statusLabel = isVerified ? 'VERIFIED' : isRejected ? 'REJECTED' : 'UNDER REVIEW';

  const drawerFooter = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '0.75rem', flexWrap: 'wrap' }}>
      <Button variant="outline" size="sm" onClick={onClose}>
        Close
      </Button>

      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
        <Button
          variant="danger"
          size="sm"
          onClick={() => onDecline(item)}
          disabled={isProcessing}
          leftIcon={<XCircle size={15} />}
        >
          Decline Application...
        </Button>

        <Button
          variant="success"
          size="sm"
          onClick={() => onApprove(item, needsOverride ? (overrideReason.trim() || 'Approved by admin override') : undefined)}
          disabled={approveDisabled}
          isLoading={isProcessing}
          leftIcon={<CheckCircle2 size={15} />}
        >
          {isProcessing ? 'Activating...' : needsOverride ? 'Approve with Override' : 'Approve & Activate'}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={Boolean(selectedItem)}
        onClose={onClose}
        width="min(94vw, 760px)"
        title={`${item.name}${item.organizationName ? ` · ${item.organizationName}` : ''}`}
        subtitle={`${item.entityType} APPLICATION`}
        badge={
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: statusColor,
              background: statusBg,
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
            }}
          >
            {statusLabel}
          </span>
        }
        footer={drawerFooter}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Rejection banner if rejected */}
            {isRejected && item.rejectionReason && (
              <div
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                }}
              >
                <div style={{ fontWeight: 700, color: '#f43f5e', fontSize: '0.875rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} /> Application Was Declined
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                  <strong>Reason Sent to Applicant:</strong> {item.rejectionReason}
                </div>
              </div>
            )}

            {/* Grid for Personal Info & Vehicle/Fleet Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {/* Applicant Profile Card */}
              <div
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingTop: '0.1rem' }}>
                  <h3
                    style={{
                      fontSize: '0.94rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      margin: 0,
                    }}
                  >
                    <User size={15} color="var(--brand-primary)" /> Profile Information
                  </h3>
                  {!isEditingContact ? (
                    <button
                      onClick={() => {
                        setEditName(item.name);
                        setEditPhone(item.phone);
                        setIsEditingContact(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        color: 'var(--brand-primary)',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        onClick={handleSaveContact}
                        disabled={isSavingContact}
                        style={{
                          background: 'var(--brand-primary)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#fff',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        {isSavingContact ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                      </button>
                      <button
                        onClick={() => setIsEditingContact(false)}
                        disabled={isSavingContact}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-light)',
                          borderRadius: '6px',
                          color: 'var(--text-muted)',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {contactError && (
                  <div style={{ color: '#f43f5e', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    {contactError}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Full Name:</span>
                    {isEditingContact ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.8125rem',
                          width: '180px',
                        }}
                      />
                    ) : (
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Mobile Number:</span>
                    {isEditingContact ? (
                      <input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.8125rem',
                          width: '180px',
                        }}
                      />
                    ) : (
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.phone}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Email Address:</span>
                    <span style={{ fontWeight: 600, color: item.email ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {item.email || '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Entity Role:</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{item.entityType}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Submitted At:</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {new Date(item.submittedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vehicle / Enterprise Card */}
              <div
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                }}
              >
                <h3
                  style={{
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
                    paddingTop: '0.1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isDriver ? <Car size={15} color="var(--brand-primary)" /> : <Building2 size={15} color="var(--color-info)" />} {isDriver ? 'Vehicle Specifications' : 'Business Details'}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8125rem' }}>
                  {isDriver ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Registration Plate:</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {item.vehiclePlate || 'Not Registered'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Vehicle Tier:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.vehicleType || 'Unspecified'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Car Model:</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{item.vehicleModel || 'Unspecified'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Organization:</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>
                          {item.organizationName || 'Not Provided'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>GST Number:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.gstNumber || 'Not Provided'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Address:</span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {item.address || item.location?.address || 'Not Provided'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Live Registered GPS Telemetry Card */}
            {item.location && (
              <div
                style={{
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingTop: '0.1rem' }}>
                  <h3
                    style={{
                      fontSize: '0.94rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <MapPin size={15} color="var(--color-success)" /> Registered Location & Telemetry
                  </h3>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: 'var(--color-success)',
                      background: 'rgba(16, 185, 129, 0.12)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                    }}
                  >
                    GPS Active (Zone A)
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div
                    style={{
                      width: '120px',
                      height: '80px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      color: 'var(--brand-primary)',
                    }}
                  >
                    <Compass size={24} color="var(--brand-primary)" />
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600 }}>Map Radar</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Registered Location: </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{item.location.address}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Coordinates: </span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--accent-secondary)' }}>
                        {item.location.latitude.toFixed(4)}° N, {item.location.longitude.toFixed(4)}° E
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Verification Gallery */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingTop: '0.1rem' }}>
                <h3
                  style={{
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <FileText size={15} color="var(--brand-primary)" /> KYC & Compliance Documents ({item.documents?.length ?? 0})
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Click document card to inspect & zoom
                </span>
              </div>

              {(!item.documents || item.documents.length === 0) ? (
                <div
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    background: 'var(--bg-base)',
                    border: '1px dashed var(--border)',
                    borderRadius: '10px',
                    color: 'var(--text-muted)',
                    fontSize: '0.8125rem',
                  }}
                >
                  No documents have been uploaded for this applicant yet.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {item.documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setActivePreviewDoc(doc)}
                      style={{
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div
                        style={{
                          height: '110px',
                          background: 'var(--bg-surface-elevated)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          position: 'relative',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <img
                          src={resolveDocumentUrl(doc.fileUrl)}
                          alt={doc.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            const currentSrc = e.currentTarget.src;
                            if ((currentSrc.includes('localhost:') || currentSrc.includes(':7002/uploads/')) && !e.currentTarget.dataset.retried) {
                              e.currentTarget.dataset.retried = 'true';
                              const filePart = currentSrc.split('/uploads/')[1];
                              if (filePart) {
                                e.currentTarget.src = `https://api.adhocx.com/uploads/${filePart}`;
                                return;
                              }
                            }
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <FileText size={28} color="var(--text-muted)" style={{ position: 'absolute' }} />
                      </div>

                      <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {doc.title}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                          Encrypted Cloudflare R2
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Digio Driver Identity, DL & Vehicle RC Verification Panel */}
              {item.entityType === 'DRIVER' && <DigioVerificationPanel item={item} onAlertsChange={handleAlertsChange} />}
            </div>

          {/* Compliance blockers: approving requires a recorded justification */}
          {needsOverride && (
            <div
              role="alert"
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '10px',
                border: '1px solid rgba(244, 63, 94, 0.45)',
                background: 'rgba(244, 63, 94, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f43f5e', fontWeight: 700, fontSize: '0.875rem' }}>
                <AlertTriangle size={16} /> {blockers.length} compliance issue{blockers.length === 1 ? '' : 's'} detected (you can still approve)
              </div>
              <ul style={{ margin: '0.5rem 0 0.75rem', paddingLeft: '1.25rem', color: 'var(--text-primary)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                {blockers.map((b) => (
                  <li key={b.code}>
                    <strong>{b.code.replace(/_/g, ' ')}</strong>
                    {b.message ? ` — ${b.message}` : ''}
                  </li>
                ))}
              </ul>
              <label htmlFor="override-reason" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                Optional override note (recorded in the audit log)
              </label>
              <textarea
                id="override-reason"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={2}
                placeholder="Optional note (leave blank to approve immediately with default override audit entry)"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  resize: 'vertical',
                }}
              />
            </div>
          )}
        </div>
      </Drawer>

      {/* Document Zoom Lightbox Modal */}
      <DocumentPreviewModal
        isOpen={activePreviewDoc !== null}
        document={activePreviewDoc}
        onClose={() => setActivePreviewDoc(null)}
      />
    </>
  );
};

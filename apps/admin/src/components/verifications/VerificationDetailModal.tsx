'use client';

import React, { useState } from 'react';
import {
  X,
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
import { VerificationItem, DriverKycDocument } from '../../lib/api/types';
import { adminApi } from '../../lib/api/client';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface DetailModalProps {
  item: VerificationItem | null;
  onClose: () => void;
  onApprove: (item: VerificationItem) => void;
  onDecline: (item: VerificationItem) => void;
  isProcessing: boolean;
}

export const VerificationDetailModal: React.FC<DetailModalProps> = ({
  item,
  onClose,
  onApprove,
  onDecline,
  isProcessing,
}) => {
  const [activePreviewDoc, setActivePreviewDoc] = useState<DriverKycDocument | null>(null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editName, setEditName] = useState(item?.name || '');
  const [editPhone, setEditPhone] = useState(item?.phone || '');
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
  const isUnderReview = item.verificationStatus === 'UNDER_REVIEW';
  const isVerified = item.verificationStatus === 'VERIFIED';
  const isRejected = item.verificationStatus === 'REJECTED';

  const statusBg = isVerified
    ? 'rgba(16, 185, 129, 0.15)'
    : isRejected
    ? 'rgba(244, 63, 94, 0.15)'
    : 'rgba(245, 158, 11, 0.15)';

  const statusColor = isVerified ? '#10b981' : isRejected ? '#f43f5e' : '#f59e0b';
  const statusLabel = isVerified ? 'VERIFIED' : isRejected ? 'REJECTED' : 'UNDER REVIEW';

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 90,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '840px',
            height: '100vh',
            background: 'var(--bg-surface)',
            borderLeft: '1px solid var(--border-light)',
            boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.5rem 2rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              background: 'var(--bg-surface)',
              zIndex: 10,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: isDriver ? 'var(--accent-primary)' : 'var(--accent-secondary)',
                    background: isDriver ? 'rgba(99, 102, 241, 0.12)' : 'rgba(14, 165, 233, 0.12)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                  }}
                >
                  {item.entityType} APPLICATION
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: statusColor,
                    background: statusBg,
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                  }}
                >
                  {statusLabel}
                </span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {item.name} {item.organizationName ? `· ${item.organizationName}` : ''}
              </h2>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                color: 'var(--text-muted)',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1 }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3
                    style={{
                      fontSize: '0.8125rem',
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
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-muted)',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3
                    style={{
                      fontSize: '0.8125rem',
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3
                  style={{
                    fontSize: '0.8125rem',
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
                          src={doc.fileUrl}
                          alt={doc.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
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
            </div>
          </div>

          {/* Action Footer */}
          <div
            style={{
              padding: '1.25rem 2rem',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              position: 'sticky',
              bottom: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '8px',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-light)',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => onDecline(item)}
                disabled={isProcessing}
                style={{
                  padding: '0.625rem 1.5rem',
                  borderRadius: '8px',
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                  color: '#f43f5e',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <XCircle size={16} /> Decline Application...
              </button>

              <button
                onClick={() => onApprove(item)}
                disabled={isProcessing}
                style={{
                  padding: '0.625rem 1.75rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
              >
                <CheckCircle2 size={16} /> {isProcessing ? 'Activating...' : 'Approve & Activate'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Document Zoom Lightbox Modal */}
      <DocumentPreviewModal
        isOpen={activePreviewDoc !== null}
        document={activePreviewDoc}
        onClose={() => setActivePreviewDoc(null)}
      />
    </>
  );
};

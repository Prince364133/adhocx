'use client';

import React from 'react';
import { BadgeCheck, Building2, Phone, MapPin, FileText, Mail } from 'lucide-react';
import { VerificationItem } from '../../lib/api/types';

interface CardProps {
  item: VerificationItem;
  onSelect: (item: VerificationItem) => void;
  onApproveQuick: (item: VerificationItem) => void;
  onDeclineQuick: (item: VerificationItem) => void;
  isProcessing?: boolean;
}

export const VerificationCard: React.FC<CardProps> = ({
  item,
  onSelect,
  onApproveQuick,
  onDeclineQuick,
  isProcessing = false,
}) => {
  const isDriver = item.entityType === 'DRIVER';
  const isUnderReview = item.verificationStatus === 'UNDER_REVIEW' || item.verificationStatus === 'PENDING';
  const isVerified = item.verificationStatus === 'VERIFIED';
  const isRejected = item.verificationStatus === 'REJECTED';

  const statusColor = isVerified
    ? 'var(--color-success)'
    : isRejected
    ? 'var(--color-danger)'
    : 'var(--color-warning)';

  const statusBg = isVerified
    ? 'var(--color-success-bg)'
    : isRejected
    ? 'var(--color-danger-bg)'
    : 'var(--color-warning-bg)';

  const statusLabel = isVerified
    ? 'Approved'
    : isRejected
    ? 'Declined'
    : 'Under Review';

  return (
    <div
      onClick={() => onSelect(item)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-card)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--brand-primary)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-elevated)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
      }}
    >
      <div>
        {/* Card Header: Entity Type Tag & Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: isDriver ? 'var(--brand-primary)' : 'var(--color-info)',
              background: isDriver ? 'var(--brand-primary-subtle)' : 'rgba(14, 165, 233, 0.12)',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            {isDriver ? <BadgeCheck size={13} /> : <Building2 size={13} />}
            <span>{isDriver ? 'DRIVER' : 'VENDOR'} KYC</span>
          </span>

          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: statusColor,
              background: statusBg,
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Applicant Avatar & Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: isDriver
                ? 'linear-gradient(135deg, #6347F9, #4328E0)'
                : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1rem',
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            {item.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.name}
            </div>
            {item.organizationName && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--brand-secondary)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.organizationName}
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
              <Phone size={12} />
              <span>{item.phone || 'Email contact only'}</span>
            </div>
            {item.email && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                <Mail size={12} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle or Organization Specs */}
        <div
          style={{
            background: 'var(--bg-card-elevated)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.625rem 0.75rem',
            marginBottom: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
            fontSize: '0.75rem',
          }}
        >
          {isDriver ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vehicle Plate:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {item.vehiclePlate || 'Not Registered'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Class & Model:</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {item.vehicleType ? `${item.vehicleType}${item.vehicleModel ? ` · ${item.vehicleModel}` : ''}` : (item.vehicleModel || 'Unspecified')}
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>GST Number:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {item.gstNumber || 'Not Provided'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>HQ City:</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {item.address || item.location?.address || 'Unspecified'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Live Location Tag */}
        {item.location && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
              marginBottom: '0.75rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <MapPin size={12} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.location.address}
            </span>
          </div>
        )}

        {/* Rejection notice if present */}
        {isRejected && item.rejectionReason && (
          <div
            style={{
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: 'var(--radius-xs)',
              padding: '0.5rem',
              fontSize: '0.6875rem',
              color: 'var(--color-danger)',
              marginBottom: '0.75rem',
            }}
          >
            <strong>Decline Reason:</strong> {item.rejectionReason}
          </div>
        )}
      </div>

      {/* Card Footer: Document count & Action buttons */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '0.75rem',
            marginBottom: '0.75rem',
            fontSize: '0.75rem',
          }}
        >
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FileText size={13} />
            <span>{item.documents?.length ?? 0} Docs Uploaded</span>
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>
            {new Date(item.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item);
            }}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '6px',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-primary)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            Inspect Details →
          </button>

          {isUnderReview && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveQuick(item);
                }}
                title="Quick Approve"
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Approve
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeclineQuick(item);
                }}
                title="Decline with Reason"
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: '#f43f5e',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Decline
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

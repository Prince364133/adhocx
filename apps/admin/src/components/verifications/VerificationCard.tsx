'use client';

import React from 'react';
import { VerificationItem } from '../../lib/api/types';

interface CardProps {
  item: VerificationItem;
  onSelect: (item: VerificationItem) => void;
  onApproveQuick: (item: VerificationItem) => void;
  onDeclineQuick: (item: VerificationItem) => void;
}

export const VerificationCard: React.FC<CardProps> = ({
  item,
  onSelect,
  onApproveQuick,
  onDeclineQuick,
}) => {
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
    <div
      onClick={() => onSelect(item)}
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${isUnderReview ? 'var(--border-light)' : 'var(--border)'}`,
        borderRadius: '12px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-primary)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isUnderReview ? 'var(--border-light)' : 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
      }}
    >
      {/* Top Banner: Entity type & Status */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.875rem',
          }}
        >
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: isDriver ? 'var(--accent-primary)' : 'var(--accent-secondary)',
              background: isDriver ? 'rgba(99, 102, 241, 0.12)' : 'rgba(14, 165, 233, 0.12)',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            <span>{isDriver ? '🪪' : '🏢'}</span>
            <span>{isDriver ? 'DRIVER' : 'USER'} KYC</span>
          </span>


          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: statusColor,
              background: statusBg,
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
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
                ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
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
                  color: 'var(--accent-secondary)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.organizationName}
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              📱 {item.phone}
            </div>
          </div>
        </div>

        {/* Vehicle or Organization Specs */}
        <div
          style={{
            background: 'var(--bg-base)',
            borderRadius: '8px',
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
                  {item.vehiclePlate || 'TS09EA1234'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Class & Model:</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {item.vehicleType} · {item.vehicleModel || 'Sedan'}
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>GST Number:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {item.gstNumber || '36AAAAA1234A1Z5'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>HQ City:</span>
                <span style={{ color: 'var(--text-secondary)' }}>Hyderabad, Telangana</span>
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
            <span>📍</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.location.address}
            </span>
          </div>
        )}

        {/* Rejection notice if present */}
        {isRejected && item.rejectionReason && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: '6px',
              padding: '0.5rem',
              fontSize: '0.6875rem',
              color: '#f43f5e',
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
            borderTop: '1px solid var(--border)',
            paddingTop: '0.75rem',
            marginBottom: '0.75rem',
            fontSize: '0.75rem',
          }}
        >
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>📁</span>
            <span>{item.documents?.length || 4} Docs Uploaded</span>
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

import React from 'react';

export interface StatusBadgeProps {
  status?: string;
  label?: string;
  size?: 'sm' | 'md';
  showPulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = 'UNKNOWN',
  label,
  size = 'md',
  showPulse = false,
}) => {
  const norm = (status || '').toUpperCase().trim();

  // Determine semantic category
  let variant: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral' = 'neutral';
  let isLive = false;

  switch (norm) {
    case 'VERIFIED':
    case 'COMPLETED':
    case 'FULFILLED':
    case 'SETTLED':
    case 'CAPTURED':
    case 'ACTIVE':
    case 'AVAILABLE':
    case 'PUBLISHED':
      variant = 'success';
      break;

    case 'PENDING':
    case 'UNDER_REVIEW':
    case 'PARTIALLY_FULFILLED':
    case 'BUSY':
    case 'PROCESSING':
    case 'AUTHORIZED':
      variant = 'warning';
      isLive = norm === 'UNDER_REVIEW' || norm === 'PARTIALLY_FULFILLED' || norm === 'PROCESSING';
      break;

    case 'REJECTED':
    case 'SUSPENDED':
    case 'CANCELLED':
    case 'FAILED':
    case 'NO_SHOW':
    case 'REFUNDED':
    case 'EXPIRED':
      variant = 'danger';
      break;

    case 'DISPATCHING':
    case 'IN_PROGRESS':
    case 'ARRIVED':
    case 'ASSIGNED':
      variant = 'info';
      isLive = true;
      break;

    case 'POSTED':
    case 'CREATED':
    case 'SENT':
      variant = 'purple';
      break;

    case 'DRAFT':
    case 'OFFLINE':
    case 'ARCHIVED':
    default:
      variant = 'neutral';
      break;
  }

  const getStyle = (): { bg: string; color: string; border: string; pulseColor: string } => {
    switch (variant) {
      case 'success':
        return {
          bg: 'var(--color-success-bg)',
          color: 'var(--color-success)',
          border: 'var(--color-success-border)',
          pulseColor: 'success',
        };
      case 'warning':
        return {
          bg: 'var(--color-warning-bg)',
          color: 'var(--color-warning)',
          border: 'var(--color-warning-border)',
          pulseColor: 'warning',
        };
      case 'danger':
        return {
          bg: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
          border: 'var(--color-danger-border)',
          pulseColor: 'danger',
        };
      case 'info':
        return {
          bg: 'var(--color-info-bg)',
          color: 'var(--color-info)',
          border: 'var(--color-info-border)',
          pulseColor: 'info',
        };
      case 'purple':
        return {
          bg: 'var(--brand-primary-subtle)',
          color: 'var(--brand-primary)',
          border: 'rgba(91, 66, 243, 0.28)',
          pulseColor: 'purple',
        };
      case 'neutral':
      default:
        return {
          bg: 'rgba(100, 116, 139, 0.12)',
          color: 'var(--text-secondary)',
          border: 'rgba(100, 116, 139, 0.22)',
          pulseColor: '',
        };
    }
  };

  const st = getStyle();
  const displayLabel = label || norm.replace(/_/g, ' ');
  const pulse = showPulse || isLive;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: size === 'sm' ? '0.15rem 0.5rem' : '0.25rem 0.625rem',
        borderRadius: 'var(--radius-pill)',
        fontSize: size === 'sm' ? '0.6875rem' : '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        backgroundColor: st.bg,
        color: st.color,
        border: `1px solid ${st.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {pulse && <span className={`pulse-dot ${st.pulseColor}`} />}
      {displayLabel}
    </span>
  );
};

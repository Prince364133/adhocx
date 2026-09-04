import React from 'react';

export type BadgeProps = {
  status?: string;
  variant?: 'success' | 'warning' | 'info' | 'danger' | 'neutral' | string;
  children?: React.ReactNode;
  className?: string;
};

export const Badge: React.FC<BadgeProps> = ({ status, variant, children, className = '' }) => {
  const content = children ?? status ?? '';
  const text = typeof content === 'string' ? content : (status || '');
  const normalized = (text || '').toUpperCase().trim();

  let variantClass = variant ? `badge-${variant}` : 'badge-neutral';

  if (!variant) {
    switch (normalized) {
      // Success states
      case 'VERIFIED':
      case 'COMPLETED':
      case 'SETTLED':
      case 'CAPTURED':
      case 'AVAILABLE':
      case 'ACTIVE':
      case 'CONFIRMED':
      case 'FULFILLED':
      case 'PAID':
      case 'RESOLVED':
        variantClass = 'badge-success';
        break;

      // Warning / Pending / Attention states
      case 'PENDING':
      case 'UNDER_REVIEW':
      case 'PROCESSING':
      case 'DISPATCHING':
      case 'PARTIALLY_FULFILLED':
      case 'OFFLINE':
      case 'AUTHORIZED':
        variantClass = 'badge-warning';
        break;

      // Error / Destructive / Cancelled states
      case 'REJECTED':
      case 'SUSPENDED':
      case 'DEACTIVATED':
      case 'CANCELLED':
      case 'FAILED':
      case 'NO_SHOW':
      case 'NO_DRIVER_AVAILABLE':
      case 'UNAVAILABLE':
        variantClass = 'badge-danger';
        break;

      // Informational / In-Progress states
      case 'OPEN':
      case 'IN_PROGRESS':
      case 'ARRIVED':
      case 'ASSIGNED':
      case 'POSTED':
      case 'BUSY':
        variantClass = 'badge-info';
        break;

      default:
        variantClass = 'badge-neutral';
        break;
    }
  }

  const displayLabel = typeof content === 'string' ? normalized.replace(/_/g, ' ') : content;

  return (
    <span className={`badge ${variantClass} ${className}`}>
      <span className="badge-dot" aria-hidden="true" />
      <span>{displayLabel}</span>
    </span>
  );
};


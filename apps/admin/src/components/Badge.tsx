import React from 'react';

type BadgeProps = {
  status?: string;
  variant?: 'success' | 'warning' | 'info' | 'danger' | 'neutral' | string;
  children?: React.ReactNode;
};

export const Badge: React.FC<BadgeProps> = ({ status, variant, children }) => {
  const content = children ?? status ?? '';
  const text = typeof content === 'string' ? content : (status || '');
  const normalized = text.toUpperCase();

  let variantClass = variant ? `badge-${variant}` : 'badge-neutral';

  if (!variant) {
    switch (normalized) {
      case 'OPEN':
      case 'IN_PROGRESS':
      case 'ARRIVED':
      case 'POSTED':
      case 'FULFILLED':
      case 'ASSIGNED':
      case 'BUSY':
        variantClass = 'badge-info';
        break;

      case 'RESOLVED':
      case 'VERIFIED':
      case 'COMPLETED':
      case 'PAID':
      case 'CAPTURED':
      case 'SETTLED':
      case 'AVAILABLE':
        variantClass = 'badge-success';
        break;

      case 'UNDER_REVIEW':
      case 'PENDING':
      case 'DISPATCHING':
      case 'PROCESSING':
      case 'PARTIALLY_FULFILLED':
      case 'OFFLINE':
        variantClass = 'badge-warning';
        break;

      case 'REJECTED':
      case 'SUSPENDED':
      case 'CANCELLED':
      case 'FAILED':
      case 'NO_SHOW':
      case 'UNAVAILABLE':
        variantClass = 'badge-danger';
        break;
    }
  }

  return <span className={`badge ${variantClass}`}>{content}</span>;
};


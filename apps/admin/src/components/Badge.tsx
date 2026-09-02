import React from 'react';

type BadgeProps = {
  status: string;
};

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const normalized = (status || '').toUpperCase();

  let variantClass = 'badge-neutral';

  switch (normalized) {
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

    case 'IN_PROGRESS':
    case 'ARRIVED':
    case 'POSTED':
    case 'FULFILLED':
    case 'ASSIGNED':
    case 'BUSY':
      variantClass = 'badge-info';
      break;
  }

  return <span className={`badge ${variantClass}`}>{status}</span>;
};

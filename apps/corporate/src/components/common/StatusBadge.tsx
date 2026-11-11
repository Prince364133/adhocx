import React from 'react';

export interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  pulse = false,
}) => {
  const normalized = (status || '').toUpperCase();

  const colorMap: Record<
    string,
    {
      bgLight: string;
      textLight: string;
      borderLight: string;
      bgDark: string;
      textDark: string;
      borderDark: string;
    }
  > = {
    // Green (Success / Active / Live / Completed)
    COMPLETED: { bgLight: '#DCFCE7', textLight: '#15803D', borderLight: '#86EFAC', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    BOARDED: { bgLight: '#DCFCE7', textLight: '#15803D', borderLight: '#86EFAC', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    ACCEPTED: { bgLight: '#DCFCE7', textLight: '#15803D', borderLight: '#86EFAC', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    ON_TIME: { bgLight: '#DCFCE7', textLight: '#15803D', borderLight: '#86EFAC', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    RESOLVED: { bgLight: '#DCFCE7', textLight: '#15803D', borderLight: '#86EFAC', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    LIVE: { bgLight: '#DCFCE7', textLight: '#15803D', borderLight: '#86EFAC', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    ACTIVE: { bgLight: '#DCFCE7', textLight: '#15803D', borderLight: '#86EFAC', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    PUBLISHED: { bgLight: '#DCFCE7', textLight: '#15803D', borderLight: '#86EFAC', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    PROCESSED: { bgLight: '#DCFCE7', textLight: '#15803D', borderLight: '#86EFAC', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    PAID: { bgLight: '#DCFCE7', textLight: '#15803D', borderLight: '#86EFAC', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    CLOSED: { bgLight: '#DCFCE7', textLight: '#15803D', borderLight: '#86EFAC', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    FALSE_ALARM: { bgLight: '#DCFCE7', textLight: '#15803D', borderLight: '#86EFAC', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },

    // Amber / Warning (In progress, Dwell, At Risk, Open, Draft, Stale)
    DISPATCHING: { bgLight: '#FEF3C7', textLight: '#B45309', borderLight: '#FCD34D', bgDark: 'rgba(245, 158, 11, 0.16)', textDark: '#FBBF24', borderDark: 'rgba(245, 158, 11, 0.35)' },
    ARRIVED: { bgLight: '#FEF3C7', textLight: '#B45309', borderLight: '#FCD34D', bgDark: 'rgba(245, 158, 11, 0.16)', textDark: '#FBBF24', borderDark: 'rgba(245, 158, 11, 0.35)' },
    AT_RISK: { bgLight: '#FEE2E2', textLight: '#B91C1C', borderLight: '#FCA5A5', bgDark: 'rgba(245, 158, 11, 0.22)', textDark: '#F59E0B', borderDark: 'rgba(245, 158, 11, 0.5)' },
    PENDING: { bgLight: '#FEF3C7', textLight: '#B45309', borderLight: '#FCD34D', bgDark: 'rgba(245, 158, 11, 0.16)', textDark: '#FBBF24', borderDark: 'rgba(245, 158, 11, 0.35)' },
    INVESTIGATING: { bgLight: '#FEF3C7', textLight: '#B45309', borderLight: '#FCD34D', bgDark: 'rgba(245, 158, 11, 0.18)', textDark: '#FBBF24', borderDark: 'rgba(245, 158, 11, 0.4)' },
    OPEN: { bgLight: '#FEF3C7', textLight: '#B45309', borderLight: '#FCD34D', bgDark: 'rgba(245, 158, 11, 0.16)', textDark: '#FBBF24', borderDark: 'rgba(245, 158, 11, 0.35)' },
    DRAFT: { bgLight: '#FEF3C7', textLight: '#B45309', borderLight: '#FCD34D', bgDark: 'rgba(245, 158, 11, 0.16)', textDark: '#FBBF24', borderDark: 'rgba(245, 158, 11, 0.35)' },
    STALE: { bgLight: '#FEF3C7', textLight: '#B45309', borderLight: '#FCD34D', bgDark: 'rgba(245, 158, 11, 0.16)', textDark: '#FBBF24', borderDark: 'rgba(245, 158, 11, 0.35)' },

    // Purple / Blue (Assigned, In Transit, Approved, Issued)
    IN_TRANSIT: { bgLight: '#F3E8FF', textLight: '#5728B2', borderLight: '#D8B4FE', bgDark: 'rgba(115, 61, 217, 0.18)', textDark: '#B794F4', borderDark: 'rgba(115, 61, 217, 0.35)' },
    ASSIGNED: { bgLight: '#F3E8FF', textLight: '#5728B2', borderLight: '#D8B4FE', bgDark: 'rgba(115, 61, 217, 0.18)', textDark: '#B794F4', borderDark: 'rgba(115, 61, 217, 0.35)' },
    APPROVED: { bgLight: '#F3E8FF', textLight: '#5728B2', borderLight: '#D8B4FE', bgDark: 'rgba(115, 61, 217, 0.18)', textDark: '#B794F4', borderDark: 'rgba(115, 61, 217, 0.35)' },
    ISSUED: { bgLight: '#F3E8FF', textLight: '#5728B2', borderLight: '#D8B4FE', bgDark: 'rgba(115, 61, 217, 0.18)', textDark: '#B794F4', borderDark: 'rgba(115, 61, 217, 0.35)' },
    IN_PROGRESS: { bgLight: '#F3E8FF', textLight: '#5728B2', borderLight: '#D8B4FE', bgDark: 'rgba(115, 61, 217, 0.18)', textDark: '#B794F4', borderDark: 'rgba(115, 61, 217, 0.35)' },
    RESPONDED: { bgLight: '#EFF6FF', textLight: '#2563EB', borderLight: '#BFDBFE', bgDark: 'rgba(59, 130, 246, 0.16)', textDark: '#93C5FD', borderDark: 'rgba(59, 130, 246, 0.3)' },
    RESCHEDULED: { bgLight: '#EFF6FF', textLight: '#2563EB', borderLight: '#BFDBFE', bgDark: 'rgba(59, 130, 246, 0.16)', textDark: '#93C5FD', borderDark: 'rgba(59, 130, 246, 0.3)' },
    PLANNED: { bgLight: '#EFF6FF', textLight: '#2563EB', borderLight: '#BFDBFE', bgDark: 'rgba(59, 130, 246, 0.16)', textDark: '#93C5FD', borderDark: 'rgba(59, 130, 246, 0.3)' },
    ACKNOWLEDGED: { bgLight: '#EFF6FF', textLight: '#2563EB', borderLight: '#BFDBFE', bgDark: 'rgba(59, 130, 246, 0.16)', textDark: '#93C5FD', borderDark: 'rgba(59, 130, 246, 0.3)' },

    // Red (Delayed, Cancelled, Rejected, Overdue, Critical)
    NO_DRIVERS_FOUND: { bgLight: '#FEE2E2', textLight: '#B91C1C', borderLight: '#FCA5A5', bgDark: 'rgba(239, 68, 68, 0.22)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.5)' },
    DRIVERS_NOT_FOUND: { bgLight: '#FEE2E2', textLight: '#B91C1C', borderLight: '#FCA5A5', bgDark: 'rgba(239, 68, 68, 0.22)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.5)' },
    DRIVER_ASSIGNED: { bgLight: '#DCFCE7', textLight: '#15803D', borderLight: '#86EFAC', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    OFFERED: { bgLight: '#FEF3C7', textLight: '#B45309', borderLight: '#FCD34D', bgDark: 'rgba(245, 158, 11, 0.16)', textDark: '#FBBF24', borderDark: 'rgba(245, 158, 11, 0.35)' },
    DELAYED: { bgLight: '#FEE2E2', textLight: '#B91C1C', borderLight: '#FCA5A5', bgDark: 'rgba(239, 68, 68, 0.18)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.4)' },
    CANCELLED: { bgLight: '#FEE2E2', textLight: '#B91C1C', borderLight: '#FCA5A5', bgDark: 'rgba(239, 68, 68, 0.16)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.35)' },
    NO_SHOW: { bgLight: '#FEE2E2', textLight: '#B91C1C', borderLight: '#FCA5A5', bgDark: 'rgba(239, 68, 68, 0.16)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.35)' },
    REJECTED: { bgLight: '#FEE2E2', textLight: '#B91C1C', borderLight: '#FCA5A5', bgDark: 'rgba(239, 68, 68, 0.16)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.35)' },
    OVERDUE: { bgLight: '#FEE2E2', textLight: '#B91C1C', borderLight: '#FCA5A5', bgDark: 'rgba(239, 68, 68, 0.16)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.35)' },
    VOID: { bgLight: '#FEE2E2', textLight: '#B91C1C', borderLight: '#FCA5A5', bgDark: 'rgba(239, 68, 68, 0.16)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.35)' },
    UNSERVED: { bgLight: '#FEE2E2', textLight: '#B91C1C', borderLight: '#FCA5A5', bgDark: 'rgba(239, 68, 68, 0.16)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.35)' },
    OFFLINE: { bgLight: '#FEE2E2', textLight: '#B91C1C', borderLight: '#FCA5A5', bgDark: 'rgba(239, 68, 68, 0.16)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.35)' },
    INACTIVE: { bgLight: '#F1F5F9', textLight: '#64748B', borderLight: '#CBD5E1', bgDark: '#1F1F1F', textDark: '#A3A3A3', borderDark: '#333333' },
    SUSPENDED: { bgLight: '#FEE2E2', textLight: '#B91C1C', borderLight: '#FCA5A5', bgDark: 'rgba(239, 68, 68, 0.16)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.35)' },
    NEW: { bgLight: '#FEE2E2', textLight: '#DC2626', borderLight: '#F87171', bgDark: 'rgba(220, 38, 38, 0.25)', textDark: '#EF4444', borderDark: 'rgba(220, 38, 38, 0.6)' },
    ESCALATED: { bgLight: '#FEE2E2', textLight: '#DC2626', borderLight: '#F87171', bgDark: 'rgba(220, 38, 38, 0.25)', textDark: '#EF4444', borderDark: 'rgba(220, 38, 38, 0.6)' },
    CRITICAL_P0: { bgLight: '#FEE2E2', textLight: '#DC2626', borderLight: '#EF4444', bgDark: 'rgba(220, 38, 38, 0.3)', textDark: '#FF4D4D', borderDark: 'rgba(220, 38, 38, 0.7)' },
  };

  const scheme = colorMap[normalized] || {
    bgLight: 'var(--bg-surface-muted, #F1F5F9)',
    textLight: 'var(--text-secondary, #475569)',
    borderLight: 'var(--border-subtle, #E2E8F0)',
    bgDark: '#1F1F1F',
    textDark: '#A3A3A3',
    borderDark: '#333333',
  };

  const isPulsing = pulse || normalized === 'DELAYED' || normalized === 'AT_RISK' || normalized === 'NEW';

  return (
    <span
      className={isPulsing ? (normalized === 'NEW' || normalized === 'CRITICAL_P0' ? 'pulse-critical' : 'pulse-warning') : ''}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 600,
        borderRadius: 'var(--radius-pill, 9999px)',
        backgroundColor: 'var(--badge-bg, ' + scheme.bgLight + ')',
        color: 'var(--badge-text, ' + scheme.textLight + ')',
        border: '1px solid var(--badge-border, ' + scheme.borderLight + ')',
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
        }}
      />
      {label || status}
    </span>
  );
};

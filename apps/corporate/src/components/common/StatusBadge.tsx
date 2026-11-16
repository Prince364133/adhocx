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
    COMPLETED: { bgLight: 'var(--color-success-bg)', textLight: 'var(--color-success-text)', borderLight: 'var(--color-success-border)', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    BOARDED: { bgLight: 'var(--color-success-bg)', textLight: 'var(--color-success-text)', borderLight: 'var(--color-success-border)', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    ACCEPTED: { bgLight: 'var(--color-success-bg)', textLight: 'var(--color-success-text)', borderLight: 'var(--color-success-border)', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    ON_TIME: { bgLight: 'var(--color-success-bg)', textLight: 'var(--color-success-text)', borderLight: 'var(--color-success-border)', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    RESOLVED: { bgLight: 'var(--color-success-bg)', textLight: 'var(--color-success-text)', borderLight: 'var(--color-success-border)', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    LIVE: { bgLight: 'var(--color-success-bg)', textLight: 'var(--color-success-text)', borderLight: 'var(--color-success-border)', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    ACTIVE: { bgLight: 'var(--color-success-bg)', textLight: 'var(--color-success-text)', borderLight: 'var(--color-success-border)', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    PUBLISHED: { bgLight: 'var(--color-success-bg)', textLight: 'var(--color-success-text)', borderLight: 'var(--color-success-border)', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    PROCESSED: { bgLight: 'var(--color-success-bg)', textLight: 'var(--color-success-text)', borderLight: 'var(--color-success-border)', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    PAID: { bgLight: 'var(--color-success-bg)', textLight: 'var(--color-success-text)', borderLight: 'var(--color-success-border)', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    CLOSED: { bgLight: 'var(--color-success-bg)', textLight: 'var(--color-success-text)', borderLight: 'var(--color-success-border)', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    FALSE_ALARM: { bgLight: 'var(--color-success-bg)', textLight: 'var(--color-success-text)', borderLight: 'var(--color-success-border)', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },

    // Amber / Warning (In progress, Dwell, At Risk, Open, Draft, Stale)
    DISPATCHING: { bgLight: 'var(--color-warning-bg)', textLight: 'var(--color-warning-text)', borderLight: 'var(--color-warning-border)', bgDark: 'rgba(245, 158, 11, 0.16)', textDark: 'var(--color-warning-text-bright)', borderDark: 'rgba(245, 158, 11, 0.35)' },
    ARRIVED: { bgLight: 'var(--color-warning-bg)', textLight: 'var(--color-warning-text)', borderLight: 'var(--color-warning-border)', bgDark: 'rgba(245, 158, 11, 0.16)', textDark: 'var(--color-warning-text-bright)', borderDark: 'rgba(245, 158, 11, 0.35)' },
    AT_RISK: { bgLight: 'var(--color-danger-bg)', textLight: 'var(--color-danger-text)', borderLight: 'var(--color-danger-border)', bgDark: 'rgba(245, 158, 11, 0.22)', textDark: '#F59E0B', borderDark: 'rgba(245, 158, 11, 0.5)' },
    PENDING: { bgLight: 'var(--color-warning-bg)', textLight: 'var(--color-warning-text)', borderLight: 'var(--color-warning-border)', bgDark: 'rgba(245, 158, 11, 0.16)', textDark: 'var(--color-warning-text-bright)', borderDark: 'rgba(245, 158, 11, 0.35)' },
    INVESTIGATING: { bgLight: 'var(--color-warning-bg)', textLight: 'var(--color-warning-text)', borderLight: 'var(--color-warning-border)', bgDark: 'rgba(245, 158, 11, 0.18)', textDark: 'var(--color-warning-text-bright)', borderDark: 'rgba(245, 158, 11, 0.4)' },
    OPEN: { bgLight: 'var(--color-warning-bg)', textLight: 'var(--color-warning-text)', borderLight: 'var(--color-warning-border)', bgDark: 'rgba(245, 158, 11, 0.16)', textDark: 'var(--color-warning-text-bright)', borderDark: 'rgba(245, 158, 11, 0.35)' },
    DRAFT: { bgLight: 'var(--color-warning-bg)', textLight: 'var(--color-warning-text)', borderLight: 'var(--color-warning-border)', bgDark: 'rgba(245, 158, 11, 0.16)', textDark: 'var(--color-warning-text-bright)', borderDark: 'rgba(245, 158, 11, 0.35)' },
    STALE: { bgLight: 'var(--color-warning-bg)', textLight: 'var(--color-warning-text)', borderLight: 'var(--color-warning-border)', bgDark: 'rgba(245, 158, 11, 0.16)', textDark: 'var(--color-warning-text-bright)', borderDark: 'rgba(245, 158, 11, 0.35)' },

    // Informational and workflow states
    IN_TRANSIT: { bgLight: 'var(--brand-blue-100)', textLight: 'var(--brand-primary)', borderLight: 'var(--color-purple-border)', bgDark: 'var(--color-info-bg)', textDark: 'var(--color-info)', borderDark: 'var(--color-info-border)' },
    ASSIGNED: { bgLight: 'var(--brand-blue-100)', textLight: 'var(--brand-primary)', borderLight: 'var(--color-purple-border)', bgDark: 'var(--color-info-bg)', textDark: 'var(--color-info)', borderDark: 'var(--color-info-border)' },
    APPROVED: { bgLight: 'var(--brand-blue-100)', textLight: 'var(--brand-primary)', borderLight: 'var(--color-purple-border)', bgDark: 'var(--color-info-bg)', textDark: 'var(--color-info)', borderDark: 'var(--color-info-border)' },
    ISSUED: { bgLight: 'var(--brand-blue-100)', textLight: 'var(--brand-primary)', borderLight: 'var(--color-purple-border)', bgDark: 'var(--color-info-bg)', textDark: 'var(--color-info)', borderDark: 'var(--color-info-border)' },
    IN_PROGRESS: { bgLight: 'var(--brand-blue-100)', textLight: 'var(--brand-primary)', borderLight: 'var(--color-purple-border)', bgDark: 'var(--color-info-bg)', textDark: 'var(--color-info)', borderDark: 'var(--color-info-border)' },
    RESPONDED: { bgLight: 'var(--color-blue-bg)', textLight: 'var(--color-blue-text)', borderLight: 'var(--color-blue-border)', bgDark: 'rgba(59, 130, 246, 0.16)', textDark: '#93C5FD', borderDark: 'rgba(59, 130, 246, 0.3)' },
    RESCHEDULED: { bgLight: 'var(--color-blue-bg)', textLight: 'var(--color-blue-text)', borderLight: 'var(--color-blue-border)', bgDark: 'rgba(59, 130, 246, 0.16)', textDark: '#93C5FD', borderDark: 'rgba(59, 130, 246, 0.3)' },
    PLANNED: { bgLight: 'var(--color-blue-bg)', textLight: 'var(--color-blue-text)', borderLight: 'var(--color-blue-border)', bgDark: 'rgba(59, 130, 246, 0.16)', textDark: '#93C5FD', borderDark: 'rgba(59, 130, 246, 0.3)' },
    ACKNOWLEDGED: { bgLight: 'var(--color-blue-bg)', textLight: 'var(--color-blue-text)', borderLight: 'var(--color-blue-border)', bgDark: 'rgba(59, 130, 246, 0.16)', textDark: '#93C5FD', borderDark: 'rgba(59, 130, 246, 0.3)' },

    // Red (Delayed, Cancelled, Rejected, Overdue, Critical)
    SEARCHING: { bgLight: 'var(--color-blue-bg-strong)', textLight: 'var(--color-blue-text-strong)', borderLight: '#93C5FD', bgDark: 'rgba(59, 130, 246, 0.16)', textDark: '#60A5FA', borderDark: 'rgba(59, 130, 246, 0.35)' },
    RETRY_SCHEDULED: { bgLight: 'var(--color-warning-bg)', textLight: 'var(--color-warning-text)', borderLight: 'var(--color-warning-border)', bgDark: 'rgba(245, 158, 11, 0.16)', textDark: 'var(--color-warning-text-bright)', borderDark: 'rgba(245, 158, 11, 0.35)' },
    NO_DRIVERS_FOUND: { bgLight: 'var(--color-danger-bg)', textLight: 'var(--color-danger-text)', borderLight: 'var(--color-danger-border)', bgDark: 'rgba(239, 68, 68, 0.22)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.5)' },
    DRIVERS_NOT_FOUND: { bgLight: 'var(--color-danger-bg)', textLight: 'var(--color-danger-text)', borderLight: 'var(--color-danger-border)', bgDark: 'rgba(239, 68, 68, 0.22)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.5)' },
    DRIVER_ASSIGNED: { bgLight: 'var(--color-success-bg)', textLight: 'var(--color-success-text)', borderLight: 'var(--color-success-border)', bgDark: 'rgba(34, 197, 94, 0.16)', textDark: '#4ADE80', borderDark: 'rgba(34, 197, 94, 0.35)' },
    OFFERED: { bgLight: 'var(--color-warning-bg)', textLight: 'var(--color-warning-text)', borderLight: 'var(--color-warning-border)', bgDark: 'rgba(245, 158, 11, 0.16)', textDark: 'var(--color-warning-text-bright)', borderDark: 'rgba(245, 158, 11, 0.35)' },
    DELAYED: { bgLight: 'var(--color-danger-bg)', textLight: 'var(--color-danger-text)', borderLight: 'var(--color-danger-border)', bgDark: 'rgba(239, 68, 68, 0.18)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.4)' },
    CANCELLED: { bgLight: 'var(--color-danger-bg)', textLight: 'var(--color-danger-text)', borderLight: 'var(--color-danger-border)', bgDark: 'rgba(239, 68, 68, 0.16)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.35)' },
    NO_SHOW: { bgLight: 'var(--color-danger-bg)', textLight: 'var(--color-danger-text)', borderLight: 'var(--color-danger-border)', bgDark: 'rgba(239, 68, 68, 0.16)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.35)' },
    REJECTED: { bgLight: 'var(--color-danger-bg)', textLight: 'var(--color-danger-text)', borderLight: 'var(--color-danger-border)', bgDark: 'rgba(239, 68, 68, 0.16)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.35)' },
    OVERDUE: { bgLight: 'var(--color-danger-bg)', textLight: 'var(--color-danger-text)', borderLight: 'var(--color-danger-border)', bgDark: 'rgba(239, 68, 68, 0.16)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.35)' },
    VOID: { bgLight: 'var(--color-danger-bg)', textLight: 'var(--color-danger-text)', borderLight: 'var(--color-danger-border)', bgDark: 'rgba(239, 68, 68, 0.16)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.35)' },
    UNSERVED: { bgLight: 'var(--color-danger-bg)', textLight: 'var(--color-danger-text)', borderLight: 'var(--color-danger-border)', bgDark: 'rgba(239, 68, 68, 0.16)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.35)' },
    OFFLINE: { bgLight: 'var(--color-danger-bg)', textLight: 'var(--color-danger-text)', borderLight: 'var(--color-danger-border)', bgDark: 'rgba(239, 68, 68, 0.16)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.35)' },
    INACTIVE: { bgLight: '#F1F5F9', textLight: '#64748B', borderLight: '#CBD5E1', bgDark: '#1F1F1F', textDark: '#A3A3A3', borderDark: '#333333' },
    SUSPENDED: { bgLight: 'var(--color-danger-bg)', textLight: 'var(--color-danger-text)', borderLight: 'var(--color-danger-border)', bgDark: 'rgba(239, 68, 68, 0.16)', textDark: '#F87171', borderDark: 'rgba(239, 68, 68, 0.35)' },
    NEW: { bgLight: 'var(--color-danger-bg)', textLight: '#DC2626', borderLight: '#F87171', bgDark: 'rgba(220, 38, 38, 0.25)', textDark: '#EF4444', borderDark: 'rgba(220, 38, 38, 0.6)' },
    ESCALATED: { bgLight: 'var(--color-danger-bg)', textLight: '#DC2626', borderLight: '#F87171', bgDark: 'rgba(220, 38, 38, 0.25)', textDark: '#EF4444', borderDark: 'rgba(220, 38, 38, 0.6)' },
    CRITICAL_P0: { bgLight: 'var(--color-danger-bg)', textLight: '#DC2626', borderLight: '#EF4444', bgDark: 'rgba(220, 38, 38, 0.3)', textDark: '#FF4D4D', borderDark: 'rgba(220, 38, 38, 0.7)' },
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
        backgroundColor: 'var(--badge-bg, light-dark(' + scheme.bgLight + ', ' + scheme.bgDark + '))',
        color: 'var(--badge-text, light-dark(' + scheme.textLight + ', ' + scheme.textDark + '))',
        border: '1px solid var(--badge-border, light-dark(' + scheme.borderLight + ', ' + scheme.borderDark + '))',
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

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

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    // Green (Success / On Time)
    COMPLETED: { bg: 'rgba(22, 163, 74, 0.15)', text: '#4ADE80', border: 'rgba(22, 163, 74, 0.35)' },
    BOARDED: { bg: 'rgba(22, 163, 74, 0.15)', text: '#4ADE80', border: 'rgba(22, 163, 74, 0.35)' },
    ACCEPTED: { bg: 'rgba(22, 163, 74, 0.15)', text: '#4ADE80', border: 'rgba(22, 163, 74, 0.35)' },
    ON_TIME: { bg: 'rgba(22, 163, 74, 0.15)', text: '#4ADE80', border: 'rgba(22, 163, 74, 0.35)' },
    RESOLVED: { bg: 'rgba(22, 163, 74, 0.15)', text: '#4ADE80', border: 'rgba(22, 163, 74, 0.35)' },

    // Amber / Warning (In progress, Dwell, At Risk)
    DISPATCHING: { bg: 'rgba(238, 152, 17, 0.15)', text: '#FBBF24', border: 'rgba(238, 152, 17, 0.35)' },
    ARRIVED: { bg: 'rgba(238, 152, 17, 0.15)', text: '#FBBF24', border: 'rgba(238, 152, 17, 0.35)' },
    AT_RISK: { bg: 'rgba(238, 152, 17, 0.2)', text: '#F59E0B', border: 'rgba(238, 152, 17, 0.5)' },
    PENDING: { bg: 'rgba(238, 152, 17, 0.15)', text: '#FBBF24', border: 'rgba(238, 152, 17, 0.35)' },
    INVESTIGATING: { bg: 'rgba(238, 152, 17, 0.18)', text: '#FBBF24', border: 'rgba(238, 152, 17, 0.4)' },

    // Blue (In Transit, Assigned)
    IN_TRANSIT: { bg: 'rgba(17, 103, 238, 0.15)', text: '#60A5FA', border: 'rgba(17, 103, 238, 0.35)' },
    ASSIGNED: { bg: 'rgba(17, 103, 238, 0.15)', text: '#60A5FA', border: 'rgba(17, 103, 238, 0.35)' },
    PLANNED: { bg: 'rgba(17, 103, 238, 0.12)', text: '#93C5FD', border: 'rgba(17, 103, 238, 0.25)' },
    ACKNOWLEDGED: { bg: 'rgba(17, 103, 238, 0.15)', text: '#60A5FA', border: 'rgba(17, 103, 238, 0.35)' },


    // Corporate portal statuses (roster / request / invoice / ticket / dispute / GPS / user)
    LIVE: { bg: 'rgba(22, 163, 74, 0.15)', text: '#4ADE80', border: 'rgba(22, 163, 74, 0.35)' },
    ACTIVE: { bg: 'rgba(22, 163, 74, 0.15)', text: '#4ADE80', border: 'rgba(22, 163, 74, 0.35)' },
    PUBLISHED: { bg: 'rgba(22, 163, 74, 0.15)', text: '#4ADE80', border: 'rgba(22, 163, 74, 0.35)' },
    PROCESSED: { bg: 'rgba(22, 163, 74, 0.15)', text: '#4ADE80', border: 'rgba(22, 163, 74, 0.35)' },
    PAID: { bg: 'rgba(22, 163, 74, 0.15)', text: '#4ADE80', border: 'rgba(22, 163, 74, 0.35)' },
    ISSUED: { bg: 'rgba(17, 103, 238, 0.15)', text: '#60A5FA', border: 'rgba(17, 103, 238, 0.35)' },
    APPROVED: { bg: 'rgba(17, 103, 238, 0.15)', text: '#60A5FA', border: 'rgba(17, 103, 238, 0.35)' },
    OPEN: { bg: 'rgba(238, 152, 17, 0.15)', text: '#FBBF24', border: 'rgba(238, 152, 17, 0.35)' },
    IN_PROGRESS: { bg: 'rgba(17, 103, 238, 0.15)', text: '#60A5FA', border: 'rgba(17, 103, 238, 0.35)' },
    CLOSED: { bg: 'rgba(22, 163, 74, 0.15)', text: '#4ADE80', border: 'rgba(22, 163, 74, 0.35)' },
    STALE: { bg: 'rgba(238, 152, 17, 0.15)', text: '#FBBF24', border: 'rgba(238, 152, 17, 0.35)' },
    DRAFT: { bg: 'rgba(238, 152, 17, 0.15)', text: '#FBBF24', border: 'rgba(238, 152, 17, 0.35)' },
    REJECTED: { bg: 'rgba(220, 38, 38, 0.15)', text: '#F87171', border: 'rgba(220, 38, 38, 0.35)' },
    OVERDUE: { bg: 'rgba(220, 38, 38, 0.15)', text: '#F87171', border: 'rgba(220, 38, 38, 0.35)' },
    VOID: { bg: 'rgba(220, 38, 38, 0.15)', text: '#F87171', border: 'rgba(220, 38, 38, 0.35)' },
    OFFLINE: { bg: 'rgba(220, 38, 38, 0.15)', text: '#F87171', border: 'rgba(220, 38, 38, 0.35)' },
    UNSERVED: { bg: 'rgba(220, 38, 38, 0.15)', text: '#F87171', border: 'rgba(220, 38, 38, 0.35)' },
    INACTIVE: { bg: 'rgba(220, 38, 38, 0.15)', text: '#F87171', border: 'rgba(220, 38, 38, 0.35)' },
    SUSPENDED: { bg: 'rgba(220, 38, 38, 0.15)', text: '#F87171', border: 'rgba(220, 38, 38, 0.35)' },
    FALSE_ALARM: { bg: 'rgba(22, 163, 74, 0.15)', text: '#4ADE80', border: 'rgba(22, 163, 74, 0.35)' },
    RESPONDED: { bg: 'rgba(17, 103, 238, 0.15)', text: '#60A5FA', border: 'rgba(17, 103, 238, 0.35)' },
    RESCHEDULED: { bg: 'rgba(17, 103, 238, 0.15)', text: '#60A5FA', border: 'rgba(17, 103, 238, 0.35)' },

    // Red (Critical, Delayed, Cancelled, SOS)
    DELAYED: { bg: 'rgba(220, 38, 38, 0.18)', text: '#F87171', border: 'rgba(220, 38, 38, 0.4)' },
    CANCELLED: { bg: 'rgba(220, 38, 38, 0.15)', text: '#F87171', border: 'rgba(220, 38, 38, 0.35)' },
    NO_SHOW: { bg: 'rgba(220, 38, 38, 0.15)', text: '#F87171', border: 'rgba(220, 38, 38, 0.35)' },
    NEW: { bg: 'rgba(220, 38, 38, 0.25)', text: '#EF4444', border: 'rgba(220, 38, 38, 0.6)' },
    ESCALATED: { bg: 'rgba(220, 38, 38, 0.25)', text: '#EF4444', border: 'rgba(220, 38, 38, 0.6)' },
    CRITICAL_P0: { bg: 'rgba(220, 38, 38, 0.3)', text: '#FF4D4D', border: 'rgba(220, 38, 38, 0.7)' },
  };

  const style = colorMap[normalized] || {
    bg: 'rgba(148, 163, 184, 0.15)',
    text: '#94A3B8',
    border: 'rgba(148, 163, 184, 0.25)',
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
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: style.text,
        }}
      />
      {label || status}
    </span>
  );
};


import React from 'react';
import { ageText } from '../../lib/format';
import type { GpsState } from '../../lib/api/types';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
      <div>
        <h1 className="h2-text">{title}</h1>
        {subtitle && <p className="body-text muted" style={{ marginTop: 4 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>{children}</div>;
}

export function Card({
  title,
  actions,
  children,
  padded = true,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <section className="surface-card" style={{ overflow: 'hidden' }}>
      {(title || actions) && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            padding: 'var(--space-3) var(--space-4)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {title && <h2 className="h4-text" style={{ fontSize: 15 }}>{title}</h2>}
          {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
        </header>
      )}
      <div style={padded ? { padding: 'var(--space-4)' } : undefined}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <div className="field-error">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}

export function KeyValue({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="caption-text muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</dt>
          <dd className="body-medium" style={{ marginTop: 2, wordBreak: 'break-word' }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const GPS_STYLE: Record<GpsState, { color: string; bg: string; border: string; label: string }> = {
  LIVE: { color: '#4ADE80', bg: 'var(--color-success-bg)', border: 'var(--color-success-border)', label: 'LIVE' },
  STALE: { color: '#FBBF24', bg: 'var(--color-warning-bg)', border: 'var(--color-warning-border)', label: 'STALE' },
  OFFLINE: { color: '#F87171', bg: 'var(--color-danger-bg)', border: 'var(--color-danger-border)', label: 'OFFLINE' },
};

/** GPS freshness from the API (LIVE <= 45 s, STALE <= 180 s, else OFFLINE) with the fix age. */
export function GpsBadge({ state, ageSec }: { state: GpsState; ageSec: number | null }) {
  const s = GPS_STYLE[state] ?? GPS_STYLE.OFFLINE;
  return (
    <span
      title="GPS freshness reported by the API: LIVE ≤ 45 s, STALE ≤ 180 s, otherwise OFFLINE"
      className={state === 'STALE' ? 'pulse-warning' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        fontSize: 12,
        fontWeight: 700,
        borderRadius: 'var(--radius-pill)',
        color: s.color,
        backgroundColor: s.bg,
        border: `1px solid ${s.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: s.color }} />
      GPS {s.label}
      <span style={{ fontWeight: 500, opacity: 0.85 }}>· {ageText(ageSec)}</span>
    </span>
  );
}

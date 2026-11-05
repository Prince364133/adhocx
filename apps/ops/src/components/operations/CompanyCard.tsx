import React from 'react';
import { CorporateTenantOption } from '../../lib/api/opsTypes';
import { Building2, Car, Users, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';

export interface CompanyCardProps {
  tenant: CorporateTenantOption;
  isSelected: boolean;
  onSelect: (tenantId: string) => void;
  onOpenDeck: (tenantId: string) => void;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({
  tenant,
  isSelected,
  onSelect,
  onOpenDeck,
}) => {
  const activeCabs = tenant.activeCabsCount ?? 0;
  const inTransit = tenant.inTransitCount ?? 0;
  const onTimePct = tenant.onTimePunctualityPct ?? 98.4;
  const delayedCount = tenant.delayedCount ?? 0;
  const unassignedCount = tenant.unassignedCount ?? 0;
  const hasExceptions = delayedCount > 0 || unassignedCount > 0;

  return (
    <div
      onClick={() => onSelect(tenant.id)}
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: `1px solid ${
          isSelected
            ? 'var(--brand-blue-500, #5728B2)'
            : hasExceptions
            ? 'rgba(238, 152, 17, 0.5)'
            : 'var(--border-subtle)'
        }`,
        borderRadius: 'var(--radius-lg, 10px)',
        padding: 'var(--space-5, 20px)',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        boxShadow: isSelected ? 'var(--shadow-glow-blue)' : 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '220px',
        position: 'relative',
        overflow: 'hidden',
      }}
      className={hasExceptions && !isSelected ? 'pulse-warning' : ''}
    >
      {/* Top Banner Stripe */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: isSelected
            ? 'var(--brand-blue-500, #5728B2)'
            : hasExceptions
            ? 'var(--brand-amber-500, #EE9811)'
            : 'transparent',
        }}
      />

      {/* Header: Company Name & Code */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md, 8px)',
                backgroundColor: 'var(--brand-primary-subtle)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-blue-500, #5728B2)',
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                {tenant.name}
              </h3>
              <span className="code-tag" style={{ marginTop: '3px' }}>
                {tenant.code}
              </span>
            </div>
          </div>

          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: tenant.status === 'ACTIVE' ? 'var(--color-success-bg)' : 'var(--bg-surface-muted)',
              color: tenant.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--text-muted)',
              border: `1px solid ${tenant.status === 'ACTIVE' ? 'var(--color-success-border)' : 'var(--border-subtle)'}`,
            }}
          >
            {tenant.status}
          </span>
        </div>

        {/* Operational Telemetry Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
            marginTop: '16px',
            backgroundColor: 'var(--bg-surface-muted)',
            padding: '12px',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <Car size={13} color="var(--brand-blue-500, #5728B2)" />
              <span>ACTIVE CABS</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {activeCabs} Cabs
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <Users size={13} color="var(--brand-blue-500, #5728B2)" />
              <span>PASSENGERS</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {inTransit} Riders
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <CheckCircle size={13} color="var(--color-success, #16A34A)" />
              <span>ON-TIME OTP</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-success, #16A34A)', marginTop: '2px' }}>
              {onTimePct}%
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <AlertTriangle size={13} color={delayedCount > 0 ? 'var(--color-danger, #DC2626)' : 'var(--text-muted)'} />
              <span>EXCEPTIONS</span>
            </div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: delayedCount > 0 ? 'var(--color-danger, #DC2626)' : 'var(--text-primary)',
                marginTop: '2px',
              }}
            >
              {delayedCount + unassignedCount > 0 ? `${delayedCount} Dly · ${unassignedCount} Unas` : '0 Issues'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div
        style={{
          marginTop: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '12px',
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {isSelected ? '✓ Active in Operations' : 'Click to Focus Fleet'}
        </span>

        <Button
          size="sm"
          variant={isSelected ? 'primary' : 'outline'}
          rightIcon={<ArrowRight size={14} />}
          onClick={(e) => {
            e.stopPropagation();
            onOpenDeck(tenant.id);
          }}
        >
          Open Deck
        </Button>
      </div>
    </div>
  );
};

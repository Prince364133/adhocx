'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, MapPin, RefreshCw, SlidersHorizontal, X } from 'lucide-react';

export interface OfficeLocationMismatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  distanceKm?: string;
  savedOfficeName?: string;
  savedOfficeAddress?: string;
  plannedOfficeName?: string;
  refreshing: boolean;
  refreshNotice: string | null;
  onRefreshOffices: () => void;
  onEditParams: () => void;
}

export const OfficeLocationMismatchModal: React.FC<OfficeLocationMismatchModalProps> = ({
  isOpen,
  onClose,
  distanceKm,
  savedOfficeName,
  savedOfficeAddress,
  plannedOfficeName,
  refreshing,
  refreshNotice,
  onRefreshOffices,
  onEditParams,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const officeLabel = savedOfficeName || 'the selected office';
  const steps: React.ReactNode[] = [
    <>
      Update the <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Office Address &amp; Map Pin</strong> for{' '}
      <strong style={{ color: 'var(--brand-primary, #5728B2)', fontWeight: 600 }}>{officeLabel}</strong> in the{' '}
      <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Admin Dashboard</strong> — or update the{' '}
      <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>office address</strong> in your CSV file so both match.
    </>,
    <>
      Click <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Refresh Offices</strong> (if updated in Admin) or{' '}
      <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Edit Params</strong> to review your office hub.
    </>,
    <>
      Re-run <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Calculate Routes</strong> and post the routes once both locations align within 2 km.
    </>,
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="office-location-mismatch-title"
      aria-describedby="office-location-mismatch-subtitle"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.52)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Dialog Card */}
      <div
        className="ops-modal-in"
        style={{
          position: 'relative',
          zIndex: 1101,
          width: '100%',
          maxWidth: '580px',
          backgroundColor: 'var(--bg-surface, #FFFFFF)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle, #E2E8F0)',
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25), 0 8px 16px -6px rgba(15, 23, 42, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '22px 24px 18px',
            borderBottom: '1px solid var(--border-subtle, #E2E8F0)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            backgroundColor: 'var(--bg-surface, #FFFFFF)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', minWidth: 0 }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'var(--brand-primary-subtle, #F3E8FF)',
                border: '1px solid rgba(87, 40, 178, 0.12)',
                color: 'var(--brand-primary, #5728B2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <MapPin size={21} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'var(--brand-primary, #5728B2)',
                  marginBottom: '3px',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--color-warning, #EE9811)',
                    display: 'inline-block',
                  }}
                />
                Location Mismatch
              </div>
              <h3
                id="office-location-mismatch-title"
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--text-primary, #191B1C)',
                  lineHeight: 1.25,
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}
              >
                Office Location Doesn&apos;t Match
              </h3>
              <p
                id="office-location-mismatch-subtitle"
                style={{
                  fontSize: '13.5px',
                  color: 'var(--text-secondary, #595F61)',
                  margin: '3px 0 0',
                  lineHeight: 1.4,
                }}
              >
                The route destination does not match your saved office coordinates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle, #E2E8F0)',
              backgroundColor: 'var(--bg-surface, #FFFFFF)',
              color: 'var(--text-secondary, #595F61)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '22px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxHeight: '72vh',
            overflowY: 'auto',
          }}
        >
          {/* Warning Callout Card */}
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              padding: '18px 20px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-warning-bg, #FFFBF4)',
              border: '1px solid var(--color-warning-border, #FDE3B9)',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(238, 152, 17, 0.16)',
                color: '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '1px',
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '14.5px',
                  fontWeight: 700,
                  color: 'var(--text-primary, #191B1C)',
                  marginBottom: '5px',
                  lineHeight: 1.35,
                }}
              >
                {distanceKm
                  ? `Planned Destination Is ${distanceKm} km Away from Saved Office`
                  : 'Planned Destination Does Not Match Saved Office'}
              </div>
              <p
                style={{
                  fontSize: '13.5px',
                  color: 'var(--text-secondary, #595F61)',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Your routes were optimized for{' '}
                <strong style={{ color: 'var(--text-primary, #191B1C)', fontWeight: 600 }}>
                  {plannedOfficeName || 'a different address'}
                </strong>
                , which doesn&apos;t match the saved address and coordinates for{' '}
                <strong style={{ color: 'var(--brand-primary, #5728B2)', fontWeight: 600 }}>
                  {officeLabel}
                </strong>
                . To prevent misrouted pickups, routes can only be posted when both locations are within{' '}
                <strong style={{ color: 'var(--text-primary, #191B1C)', fontWeight: 600 }}>2 km</strong> of each other.
              </p>

              {(savedOfficeAddress || plannedOfficeName || distanceKm) && (
                <div
                  style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px dashed var(--color-warning-border, #FDE3B9)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '12.5px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600, minWidth: '120px' }}>
                      Saved Office Hub:
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {officeLabel}
                      {savedOfficeAddress && savedOfficeAddress !== savedOfficeName ? ` — ${savedOfficeAddress}` : ''}
                    </span>
                  </div>
                  {plannedOfficeName && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600, minWidth: '120px' }}>
                        File Destination:
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {plannedOfficeName}
                      </span>
                    </div>
                  )}
                  {distanceKm && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600, minWidth: '120px' }}>
                        Distance Apart:
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(238, 152, 17, 0.16)',
                          color: '#B45309',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        {distanceKm} km (max 2 km allowed)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step-by-Step Timeline Card */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-surface-muted, #F8FAFC)',
              border: '1px solid var(--border-subtle, #E2E8F0)',
            }}
          >
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: 'var(--text-muted, #94A3B8)',
                marginBottom: '14px',
              }}
            >
              What to do next
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {steps.map((content, idx) => {
                const isLast = idx === steps.length - 1;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      gap: '14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '9999px',
                          backgroundColor: 'var(--bg-surface, #FFFFFF)',
                          border: '1.5px solid var(--brand-blue-200, #C4B5FD)',
                          color: 'var(--brand-primary, #5728B2)',
                          fontSize: '12px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </span>
                      {!isLast && (
                        <span
                          aria-hidden="true"
                          style={{
                            width: '1.5px',
                            flex: 1,
                            minHeight: '14px',
                            backgroundColor: 'var(--border-subtle, #E2E8F0)',
                            margin: '4px 0',
                          }}
                        />
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: '13.5px',
                        color: 'var(--text-secondary, #595F61)',
                        lineHeight: 1.5,
                        paddingTop: '2px',
                        paddingBottom: isLast ? '0px' : '14px',
                      }}
                    >
                      {content}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {refreshNotice && (
            <div
              role="status"
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-info-bg)',
                border: '1px solid var(--color-info-border)',
                color: 'var(--color-info)',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                lineHeight: 1.45,
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{refreshNotice}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: 'var(--bg-surface-muted, #F8FAFC)',
            borderTop: '1px solid var(--border-subtle, #E2E8F0)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={onRefreshOffices}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border-strong, #CBD5E1)',
              backgroundColor: 'var(--bg-surface, #FFFFFF)',
              color: 'var(--text-primary, #191B1C)',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.65 : 1,
              boxShadow: 'var(--shadow-sm)',
              fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : undefined} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Offices'}</span>
          </button>

          <button
            type="button"
            onClick={onEditParams}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border-strong, #CBD5E1)',
              backgroundColor: 'var(--bg-surface, #FFFFFF)',
              color: 'var(--text-primary, #191B1C)',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              fontFamily: 'inherit',
            }}
          >
            <SlidersHorizontal size={15} />
            <span>Edit Params</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '9px 22px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: 'var(--brand-primary, #5728B2)',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(87, 40, 178, 0.28)',
              fontFamily: 'inherit',
            }}
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};

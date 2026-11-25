'use client';

import React from 'react';
import { OptimizedCabCluster, OptimizationResult } from '../types';
import { X, CheckCircle } from 'lucide-react';

interface OptimizationAuditModalProps {
  cluster: OptimizedCabCluster | null;
  result: OptimizationResult;
  onClose: () => void;
}

export const OptimizationAuditModal: React.FC<OptimizationAuditModalProps> = ({
  cluster,
  result,
  onClose,
}) => {
  if (!cluster) return null;

  const audit = cluster.auditInfo;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-elevated)',
          border: '1px solid var(--border-subtle)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'var(--brand-primary-subtle)',
                  color: 'var(--brand-blue-500, #5728B2)',
                }}
              >
                Audit Trail
              </span>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                Optimization Audit: {cluster.clusterId} ({cluster.vehicleCategory})
              </h3>
            </div>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              Traceable algorithmic decisions, sequencing iterations, and multi-objective scoring breakdown.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Algorithm Overview Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '10px',
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Solver Engine
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginTop: '4px',
              }}
            >
              {audit.sequencingMethod === 'EXACT_PERMUTATION'
                ? 'Branch & Bound (N!)'
                : 'Greedy + 2-Opt'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {audit.totalEvaluatedSequences} sequences evaluated
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Provider Status
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#16A34A',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle size={13} />
              {audit.isRealRoad ? 'Live Road API' : 'Local Road Matrix'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {result.source}
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Distance Saved
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--brand-blue-500, #5728B2)',
                marginTop: '4px',
              }}
            >
              {audit.distanceImprovementKm} km ({audit.distanceImprovementPct}%)
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
              vs individual trips
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Vehicle Utilization
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#D97706',
                marginTop: '4px',
              }}
            >
              {audit.vehicleUtilizationPct}%
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {cluster.passengerCount} / {cluster.capacity} seats filled
            </div>
          </div>
        </div>

        {/* Pickup Sequence Stepper */}
        <div
          style={{
            padding: '14px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-muted)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
            }}
          >
            Pickup Sequence Optimization
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {cluster.passengers.map((p, i) => (
              <React.Fragment key={p.id}>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  #{i + 1} {p.name} ({p.estimatedPickupTime})
                </span>
                {i < cluster.passengers.length - 1 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>→</span>
                )}
              </React.Fragment>
            ))}
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>→</span>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                border: '1px solid rgba(22, 163, 74, 0.25)',
                color: '#16A34A',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              🏢 Office ({cluster.arrival})
            </span>
          </div>
        </div>

        {/* Evaluated Corridors Comparison Table */}
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
            }}
          >
            Evaluated Corridors &amp; Scoring Breakdown (Profile: {audit.scoringProfileUsed})
          </div>
          <div
            style={{
              overflowX: 'auto',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>#</th>
                  <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Corridor</th>
                  <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Distance</th>
                  <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Duration</th>
                  <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Dist Score</th>
                  <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Detour / IDF</th>
                  <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Time Score</th>
                  <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Overall Score</th>
                  <th style={{ padding: '8px 10px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {cluster.routeOptions.map((opt, idx) => (
                  <tr
                    key={opt.index}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: opt.isRecommended ? 'var(--brand-primary-subtle)' : 'var(--bg-surface)',
                    }}
                  >
                    <td style={{ padding: '8px 10px', fontWeight: 700 }}>#{idx + 1}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{opt.title}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{opt.formattedDistance}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{opt.formattedEta}</td>
                    <td style={{ padding: '8px 10px' }}>{opt.scoreBreakdown?.distanceScore ?? '-'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <div>{opt.scoreBreakdown?.detourScore ?? '-'}</div>
                      {opt.averageIdf !== undefined && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>IDF: {opt.averageIdf}x</div>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px' }}>{opt.scoreBreakdown?.timeScore ?? '-'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--brand-blue-500, #5728B2)' }}>
                      {opt.score}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      {opt.isRecommended ? (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(22, 163, 74, 0.1)',
                            color: '#16A34A',
                            border: '1px solid rgba(22, 163, 74, 0.25)',
                          }}
                        >
                          Primary Dispatch
                        </span>
                      ) : opt.isEquivalent ? (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(217, 119, 6, 0.1)',
                            color: '#D97706',
                            border: '1px solid rgba(217, 119, 6, 0.25)',
                          }}
                        >
                          Identical Corridor
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-surface-muted)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          Alternative
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Diagnostic Logs */}
        {audit.auditLogs && audit.auditLogs.length > 0 && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: '#0F172A',
              color: '#CBD5E1',
              fontFamily: 'monospace',
              fontSize: '11px',
              lineHeight: 1.6,
            }}
          >
            <div style={{ color: '#94A3B8', fontFamily: 'sans-serif', fontWeight: 700, marginBottom: '6px' }}>
              Algorithmic Diagnostic Logs:
            </div>
            {audit.auditLogs.map((log, i) => (
              <div key={i}>• {log}</div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-muted)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};

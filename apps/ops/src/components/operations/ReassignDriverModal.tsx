'use client';

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CorporateRouteItem } from '../../lib/api/opsTypes';
import { opsApi } from '../../lib/api/opsClient';
import { UserCheck, AlertTriangle } from 'lucide-react';

export interface ReassignDriverModalProps {
  route: CorporateRouteItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REASSIGN_REASONS = [
  'Assigned driver vehicle breakdown / puncture',
  'Assigned driver unresponsive / late for pickup',
  'Driver rejected offer / timed out',
  'Driver duty hours limit exceeded',
  'Emergency client request',
  'Route vehicle upgrade',
];

export const ReassignDriverModal: React.FC<ReassignDriverModalProps> = ({
  route,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState(REASSIGN_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [targetDriverId, setTargetDriverId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!route) return null;

  async function handleConfirm() {
    const finalReason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
    if (!finalReason) {
      setErrorMsg('Please specify a reassignment reason');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await opsApi.reassignDriver(route!.id, {
        newDriverId: targetDriverId.trim() || undefined,
        reason: finalReason,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Driver reassignment failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual Driver Reassignment"
      subtitle={`Route RT-${route.id.slice(0, 8).toUpperCase()} · ${route.vehicleCategory}`}
      width="480px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md, 8px)',
              fontSize: '13px',
              backgroundColor: 'rgba(220, 38, 38, 0.15)',
              border: '1px solid rgba(220, 38, 38, 0.35)',
              color: '#F87171',
            }}
          >
            {errorMsg}
          </div>
        )}

        <div
          style={{
            backgroundColor: 'var(--bg-canvas, #010D2D)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--border-subtle, #1E3060)',
            fontSize: '13px',
          }}
        >
          <div style={{ color: 'var(--text-muted, #64748B)', fontSize: '11px', marginBottom: '2px' }}>
            CURRENT ASSIGNMENT
          </div>
          <div style={{ fontWeight: 600, color: '#F8FAFC' }}>
            {route.driver?.fullName || 'Unassigned (No Driver)'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94A3B8)' }}>
            Vehicle: {route.vehicle?.registrationNumber || 'N/A'} · Shift: {route.shiftTime} ({route.direction})
          </div>
        </div>

        {/* Reason Select */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', marginBottom: '6px' }}>
            MANDATORY AUDIT REASON (§ 55)
          </label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              backgroundColor: 'var(--bg-canvas, #010D2D)',
              border: '1px solid var(--border-strong, #2D4685)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '0 12px',
              color: '#F8FAFC',
              fontSize: '13px',
              outline: 'none',
            }}
          >
            {REASSIGN_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="Other">Other custom reason...</option>
          </select>
        </div>

        {selectedReason === 'Other' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', marginBottom: '6px' }}>
              CUSTOM REASON SPECIFICATION
            </label>
            <input
              type="text"
              placeholder="Enter operational reason"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              style={{
                width: '100%',
                height: '36px',
                backgroundColor: 'var(--bg-canvas, #010D2D)',
                border: '1px solid var(--border-strong, #2D4685)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '0 12px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* Direct Driver ID Override (Optional) */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', marginBottom: '6px' }}>
            SPECIFIC DRIVER ID (LEAVE BLANK FOR AUTOMATIC NEARBY 10KM RE-DISPATCH)
          </label>
          <input
            type="text"
            placeholder="e.g. drv_948a31... (or leave blank to broadcast offer)"
            value={targetDriverId}
            onChange={(e) => setTargetDriverId(e.target.value)}
            style={{
              width: '100%',
              height: '36px',
              backgroundColor: 'var(--bg-canvas, #010D2D)',
              border: '1px solid var(--border-strong, #2D4685)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '0 12px',
              color: '#F8FAFC',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {/* Warning Note */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '12px',
            color: '#FBBF24',
            backgroundColor: 'rgba(238, 152, 17, 0.1)',
            padding: '10px',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid rgba(238, 152, 17, 0.25)',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            Executing this intervention revokes any pending offers, notifies the former driver, and instantly alerts the riders with updated vehicle tracking.
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Dismiss
          </Button>
          <Button
            variant="primary"
            leftIcon={<UserCheck size={16} />}
            isLoading={loading}
            onClick={handleConfirm}
          >
            Confirm Reassignment
          </Button>
        </div>
      </div>
    </Modal>
  );
};


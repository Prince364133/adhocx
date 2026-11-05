'use client';

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CorporateRouteItem } from '../../lib/api/opsTypes';
import { opsApi } from '../../lib/api/opsClient';
import { UserCheck } from 'lucide-react';

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
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
            }}
          >
            {errorMsg}
          </div>
        )}

        <div
          style={{
            backgroundColor: 'var(--bg-surface-muted)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md, 8px)',
            border: '1px solid var(--border-subtle)',
            fontSize: '13px',
          }}
        >
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px', fontWeight: 600 }}>
            CURRENT ASSIGNMENT
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {route.driver?.fullName || 'Unassigned (No Driver)'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Vehicle: {route.vehicle?.registrationNumber || 'Not assigned'} ({route.vehicleCategory})
          </div>
        </div>

        {/* Reason Select */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            REASSIGNMENT REASON (§ 55)
          </label>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '0 12px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
            }}
          >
            {REASSIGN_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="Other">Other custom operational cause...</option>
          </select>
        </div>

        {selectedReason === 'Other' && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              CUSTOM CAUSE EXPLANATION
            </label>
            <textarea
              placeholder="State reason for audit compliance..."
              rows={2}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'none',
              }}
            />
          </div>
        )}

        {/* Target Driver ID (Optional manual override) */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            TARGET DRIVER ID (OPTIONAL OVERRIDE)
          </label>
          <input
            type="text"
            placeholder="Leave empty to auto-dispatch nearest available driver"
            value={targetDriverId}
            onChange={(e) => setTargetDriverId(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '0 12px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            If empty, the routing engine broadcasts to compliant commercial yellow-plate drivers within 10 km.
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            leftIcon={<UserCheck size={16} />}
            isLoading={loading}
            onClick={handleConfirm}
          >
            Reassign Now
          </Button>
        </div>
      </div>
    </Modal>
  );
};

'use client';

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CorporateRouteItem } from '../../lib/api/opsTypes';
import { opsApi } from '../../lib/api/opsClient';
import { XCircle, AlertTriangle } from 'lucide-react';

export interface CancelRouteModalProps {
  route: CorporateRouteItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CANCEL_REASONS = [
  'Client emergency request / team shift cancelled',
  'Severe weather / facility emergency shutdown',
  'No available compliant driver supply within 10 km',
  'Accident / vehicle mechanical failure before pickup',
  'Security / route corridor alert',
];

export const CancelRouteModal: React.FC<CancelRouteModalProps> = ({
  route,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!route) return null;

  async function handleConfirm() {
    const finalReason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
    if (!finalReason) {
      setErrorMsg('Please specify a cancellation reason');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await opsApi.cancelRoute(route!.id, { reason: finalReason });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Route cancellation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Force Cancel Corporate Route"
      subtitle={`Route RT-${route.id.slice(0, 8).toUpperCase()} · ${route.assignedPassengerCount} Passengers`}
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
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.25)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            color: '#F87171',
            fontSize: '13px',
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 700 }}>Destructive Action (§ 20.3)</div>
            <div style={{ fontSize: '12px', marginTop: '2px', color: 'rgba(248, 113, 113, 0.9)' }}>
              Cancelling this route immediately revokes any active driver duties, releases pending reservations, and notifies all {route.assignedPassengerCount} scheduled passengers via push alert.
            </div>
          </div>
        </div>

        {/* Reason Select */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', marginBottom: '6px' }}>
            MANDATORY CANCELLATION REASON (§ 55)
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
            {CANCEL_REASONS.map((r) => (
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
              CUSTOM AUDIT EXPLANATION
            </label>
            <textarea
              placeholder="State the operational cause for audit compliance..."
              rows={3}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-canvas, #010D2D)',
                border: '1px solid var(--border-strong, #2D4685)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '8px 12px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'none',
              }}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Abort
          </Button>
          <Button
            variant="danger"
            leftIcon={<XCircle size={16} />}
            isLoading={loading}
            onClick={handleConfirm}
          >
            Confirm Cancellation
          </Button>
        </div>
      </div>
    </Modal>
  );
};

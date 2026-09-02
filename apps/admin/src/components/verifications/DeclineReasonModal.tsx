'use client';

import React from 'react';
import { VerificationItem } from '../../lib/api/types';

interface DeclineModalProps {
  isOpen: boolean;
  target: VerificationItem | null;
  presetReason: string;
  onPresetReasonChange: (reason: string) => void;
  customNotes: string;
  onCustomNotesChange: (notes: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isProcessing: boolean;
}

const PRESET_REASONS = [
  'Blurry or unreadable Driving License image',
  'Driving License is expired or invalid',
  'Vehicle RC plate number mismatch with document',
  'Vehicle exterior photo does not clearly show registration plate',
  'Commercial insurance policy is expired or inactive',
  'Aadhaar / National ID details mismatch with name',
  'GST certificate registration inactive or entity name mismatch',
  'Vehicle class does not match selected tier (Sedan/SUV/Hatchback)',
];

export const DeclineReasonModal: React.FC<DeclineModalProps> = ({
  isOpen,
  target,
  presetReason,
  onPresetReasonChange,
  customNotes,
  onCustomNotesChange,
  onConfirm,
  onClose,
  isProcessing,
}) => {
  if (!isOpen || !target) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid rgba(244, 63, 94, 0.4)',
          borderRadius: '16px',
          padding: '1.75rem',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>❌</span>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Decline Application
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Specify the exact reason. This feedback will be sent directly to <strong>{target.name}</strong> on their mobile waitlist screen.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '1.25rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Preset chips */}
        <div>
          <label
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: '0.5rem',
            }}
          >
            Select Rejection Reason Preset:
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {PRESET_REASONS.map((r) => {
              const isSelected = presetReason === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => onPresetReasonChange(r)}
                  style={{
                    padding: '0.375rem 0.625rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 600 : 500,
                    border: `1px solid ${isSelected ? 'var(--color-danger)' : 'var(--border-light)'}`,
                    background: isSelected ? 'rgba(244, 63, 94, 0.15)' : 'var(--bg-base)',
                    color: isSelected ? '#f43f5e' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                >
                  {isSelected ? '✓ ' : ''}{r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom notes */}
        <div>
          <label
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: '0.5rem',
            }}
          >
            Additional Explanation (Optional):
          </label>
          <textarea
            rows={3}
            placeholder="e.g., Please upload a clearer high-resolution photo of the front page of your Driving License with numbers visible."
            value={customNotes}
            onChange={(e) => onCustomNotesChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'var(--bg-base)',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing || !presetReason}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              background: '#f43f5e',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: isProcessing || !presetReason ? 'not-allowed' : 'pointer',
              opacity: isProcessing || !presetReason ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {isProcessing ? 'Submitting Decline...' : 'Confirm & Send Decline to User'}
          </button>
        </div>
      </div>
    </div>
  );
};

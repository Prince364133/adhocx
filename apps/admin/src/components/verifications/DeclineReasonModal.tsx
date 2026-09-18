'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
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
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        className="animate-modal"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid rgba(244, 63, 94, 0.4)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: '560px',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
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
              <AlertTriangle size={18} color="#f43f5e" />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Decline Application
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem', margin: 0 }}>
              Specify the exact reason. This feedback will be sent directly to <strong>{target.name}</strong>.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Target summary banner */}
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8125rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Target: </span>
            <strong style={{ color: 'var(--text-primary)' }}>{target.name}</strong>
            <span style={{ color: 'var(--text-muted)' }}> ({target.phone})</span>
          </div>
          <span
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              backgroundColor: target.entityType === 'DRIVER' ? 'rgba(91, 66, 243, 0.2)' : 'rgba(2, 132, 199, 0.2)',
              color: target.entityType === 'DRIVER' ? 'var(--brand-primary)' : 'var(--color-info)',
            }}
          >
            {target.entityType}
          </span>
        </div>

        {/* Preset chips */}
        <div>
          <label
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
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
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                    background: isSelected ? 'rgba(244, 63, 94, 0.2)' : 'var(--bg-surface-elevated)',
                    color: isSelected ? '#f43f5e' : 'var(--text-secondary)',
                    border: isSelected ? '1px solid #f43f5e' : '1px solid var(--border)',
                  }}
                >
                  {r}
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
              letterSpacing: '0.05em',
              color: 'var(--text-secondary)',
              display: 'block',
              marginBottom: '0.375rem',
            }}
          >
            Additional Operational Notes / Instructions:
          </label>
          <textarea
            rows={3}
            placeholder="e.g., Please upload a clearer high-resolution photo of the front page of your Driving License with numbers visible."
            value={customNotes}
            onChange={(e) => onCustomNotesChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#f43f5e';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)';
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
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
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
              borderRadius: 'var(--radius-md)',
              background: '#f43f5e',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: isProcessing || !presetReason ? 'not-allowed' : 'pointer',
              opacity: isProcessing || !presetReason ? 0.5 : 1,
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {isProcessing ? 'Processing...' : 'Confirm Decline'}
          </button>
        </div>
      </div>
    </div>
  );
};

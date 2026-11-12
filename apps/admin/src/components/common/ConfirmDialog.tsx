'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { Modal } from '../Modal';
import { Button } from './Button';

export type ConfirmDialogVariant = 'confirm' | 'danger' | 'warning' | 'success' | 'info';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void | Promise<void>;
  title: string;
  subtitle?: string;
  description: React.ReactNode;
  details?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  isLoading?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  minReasonLength?: number;
  reasonValue?: string;
  onReasonChange?: (value: string) => void;
  hideCancel?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  description,
  details,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'confirm',
  isLoading = false,
  requireReason = false,
  reasonLabel = 'Administrative Reason',
  reasonPlaceholder = 'Provide clear audit justification...',
  minReasonLength = 0,
  reasonValue,
  onReasonChange,
  hideCancel = false,
}) => {
  const [internalReason, setInternalReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const controlled = reasonValue !== undefined && onReasonChange !== undefined;
  const activeReason = controlled ? reasonValue : internalReason;
  const setReason = (val: string) => {
    setValidationError(null);
    if (controlled) onReasonChange(val);
    else setInternalReason(val);
  };

  useEffect(() => {
    if (isOpen) {
      setValidationError(null);
      if (!controlled) setInternalReason('');
    }
  }, [isOpen, controlled]);

  const variantConfig: Record<
    ConfirmDialogVariant,
    {
      icon: React.ReactNode;
      iconBg: string;
      iconColor: string;
      modalVariant: 'default' | 'danger' | 'warning' | 'success' | 'info';
      btnVariant: 'primary' | 'danger' | 'success';
    }
  > = {
    confirm: {
      icon: <Info size={18} />,
      iconBg: 'var(--brand-primary-subtle)',
      iconColor: 'var(--brand-primary)',
      modalVariant: 'default',
      btnVariant: 'primary',
    },
    danger: {
      icon: <ShieldAlert size={18} />,
      iconBg: 'var(--color-danger-bg)',
      iconColor: 'var(--color-danger)',
      modalVariant: 'danger',
      btnVariant: 'danger',
    },
    warning: {
      icon: <AlertTriangle size={18} />,
      iconBg: 'var(--color-warning-bg)',
      iconColor: 'var(--color-warning)',
      modalVariant: 'warning',
      btnVariant: 'primary',
    },
    success: {
      icon: <CheckCircle2 size={18} />,
      iconBg: 'var(--color-success-bg)',
      iconColor: 'var(--color-success)',
      modalVariant: 'success',
      btnVariant: 'success',
    },
    info: {
      icon: <Info size={18} />,
      iconBg: 'var(--color-info-bg)',
      iconColor: 'var(--color-info)',
      modalVariant: 'info',
      btnVariant: 'primary',
    },
  };

  const cfg = variantConfig[variant];

  const handleConfirmClick = () => {
    if (requireReason) {
      const trimmed = activeReason.trim();
      const needed = Math.max(1, minReasonLength);
      if (trimmed.length < needed) {
        setValidationError(
          needed > 1
            ? `Please enter at least ${needed} characters.`
            : 'Please provide a reason before proceeding.'
        );
        return;
      }
      onConfirm(trimmed);
      return;
    }
    onConfirm(activeReason.trim() || undefined);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) onClose();
      }}
      title={title}
      subtitle={subtitle}
      size="sm"
      maxWidth="460px"
      variant={cfg.modalVariant}
      closeOnBackdrop={!isLoading}
      hideCloseButton={isLoading}
      icon={
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-md)',
            background: cfg.iconBg,
            color: cfg.iconColor,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {cfg.icon}
        </div>
      }
      footer={
        <>
          {!hideCancel && (
            <Button variant="secondary" size="md" onClick={onClose} disabled={isLoading}>
              {cancelLabel}
            </Button>
          )}
          <Button
            variant={cfg.btnVariant}
            size="md"
            loading={isLoading}
            onClick={handleConfirmClick}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {description}
        </div>

        {details && (
          <div
            style={{
              padding: '0.7rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card-elevated)',
              border: '1px solid var(--border)',
              fontSize: '0.78rem',
              color: 'var(--text-primary)',
            }}
          >
            {details}
          </div>
        )}

        {requireReason && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              {reasonLabel} <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              value={activeReason}
              placeholder={reasonPlaceholder}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
            {validationError && (
              <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 600 }}>
                {validationError}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};


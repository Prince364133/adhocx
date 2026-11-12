'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { acquireScrollLock } from './common/scrollLock';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';
export type ModalVariant = 'default' | 'danger' | 'warning' | 'success' | 'info';

const SIZE_MAP: Record<ModalSize, string> = {
  sm: '390px',
  md: '490px',
  lg: '620px',
  xl: '780px',
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  size?: ModalSize;
  icon?: React.ReactNode;
  variant?: ModalVariant;
  closeOnBackdrop?: boolean;
  hideCloseButton?: boolean;
}

const EXIT_DURATION_MS = 160;

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth,
  size = 'md',
  icon,
  variant = 'default',
  closeOnBackdrop = true,
  hideCloseButton = false,
}) => {
  const [rendered, setRendered] = useState(isOpen);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      setClosing(false);
      return;
    }
    if (rendered) {
      setClosing(true);
      const timer = setTimeout(() => {
        setRendered(false);
        setClosing(false);
      }, EXIT_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [isOpen, rendered]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    const releaseScroll = acquireScrollLock();
    return () => {
      document.removeEventListener('keydown', handleEsc);
      releaseScroll();
    };
  }, [isOpen, onClose]);

  if (!rendered) return null;

  const resolvedMaxWidth = maxWidth || SIZE_MAP[size] || '600px';
  const accentBorder =
    variant === 'danger'
      ? 'var(--color-danger-border)'
      : variant === 'warning'
      ? 'var(--color-warning-border)'
      : variant === 'success'
      ? 'var(--color-success-border)'
      : variant === 'info'
      ? 'var(--color-info-border)'
      : 'var(--border)';

  return (
    <div
      className={`modal-overlay${closing ? ' is-closing' : ''}`}
      onClick={() => {
        if (closeOnBackdrop) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`modal-content${closing ? ' is-closing' : ''}`}
        style={{ maxWidth: resolvedMaxWidth, borderColor: accentBorder }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', minWidth: 0 }}>
            {icon && (
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', marginTop: '0.05rem' }}>
                {icon}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <h3 className="modal-title">{title}</h3>
              {subtitle && (
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.73rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {!hideCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              style={{
                background: 'transparent',
                border: '1px solid transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.3rem',
                borderRadius: 'var(--radius-sm)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.15s ease, color 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

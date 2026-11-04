import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = '500px',
}) => {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4, 16px)',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(1, 13, 45, 0.8)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Modal Dialog */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: width,
          backgroundColor: 'var(--bg-surface, #0B132B)',
          border: '1px solid var(--border-strong, #2D4685)',
          borderRadius: 'var(--radius-xl, 12px)',
          boxShadow: 'var(--shadow-elevated)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1101,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--space-4, 16px) var(--space-5, 20px)',
            borderBottom: '1px solid var(--border-subtle, #1E3060)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-surface-elevated, #111D3D)',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-primary, #F8FAFC)',
                margin: 0,
              }}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary, #94A3B8)',
                  margin: '2px 0 0 0',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Close Modal"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #94A3B8)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm, 6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 'var(--space-5, 20px)' }}>{children}</div>
      </div>
    </div>
  );
};

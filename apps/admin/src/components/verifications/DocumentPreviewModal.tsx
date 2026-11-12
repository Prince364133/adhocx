'use client';

import React, { useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, X, FileText, ExternalLink } from 'lucide-react';
import { DriverKycDocument } from '../../lib/api/types';
import { resolveDocumentUrl, handleDocumentImageError } from '../../lib/api/client';
import { acquireScrollLock } from '../common/scrollLock';

interface PreviewModalProps {
  isOpen: boolean;
  document: DriverKycDocument | null;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  document,
  onClose,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  useEffect(() => {
    if (!isOpen || !document) return;
    setZoom(1);
    setRotation(0);

    const releaseLock = acquireScrollLock();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      releaseLock();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, document, onClose]);

  if (!isOpen || !document) return null;

  const toolbarBtnStyle: React.CSSProperties = {
    padding: '0.4rem 0.65rem',
    borderRadius: '8px',
    background: 'rgba(15, 23, 42, 0.86)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    color: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.78rem',
    fontWeight: 600,
    transition: 'all 0.15s ease',
  };

  return (
    <div
      className="animate-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Document preview: ${document.title}`}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(8px)',
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      {/* Header bar */}
      <div
        className="animate-modal-pop"
        style={{
          width: '100%',
          maxWidth: '900px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '0.85rem',
          color: '#ffffff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
            {document.title}
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: '0.15rem 0 0' }}>
            Cloudflare R2 Encrypted Document Storage
          </p>
        </div>

        {/* Zoom and Rotate controls */}
        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            style={toolbarBtnStyle}
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <span style={{ fontSize: '0.75rem', minWidth: '42px', textAlign: 'center', color: '#e2e8f0', fontWeight: 600 }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            style={toolbarBtnStyle}
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>

          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            style={toolbarBtnStyle}
          >
            <RotateCw size={14} /> Rotate
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              ...toolbarBtnStyle,
              background: 'rgba(220, 38, 38, 0.22)',
              border: '1px solid rgba(248, 113, 113, 0.45)',
              color: '#fecaca',
            }}
          >
            <X size={14} /> Close
          </button>
        </div>
      </div>

      {/* Document Viewport */}
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '75vh',
          background: 'var(--bg-base)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          padding: '1.5rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {(() => {
            const resolvedUrl = resolveDocumentUrl(document.fileUrl);
            const isPdf = (resolvedUrl || '').toLowerCase().split('?')[0].endsWith('.pdf');

            if (isPdf) {
              return (
                <div
                  style={{
                    width: '600px',
                    height: '400px',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                  }}
                >
                  <FileText size={48} color="var(--brand-primary)" />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>PDF Document: {document.title}</span>
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--brand-primary)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <ExternalLink size={14} /> Open in New Tab
                  </a>
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <img
                  src={resolvedUrl}
                  alt={document.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '65vh',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  }}
                  onError={(e) => {
                    handleDocumentImageError(e, document.title);
                  }}
                />
                {resolvedUrl && (
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: '#94a3b8',
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      textDecoration: 'underline',
                    }}
                  >
                    <ExternalLink size={12} /> Open original asset in new window
                  </a>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

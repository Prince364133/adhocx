'use client';

import React, { useState } from 'react';
import { DriverKycDocument } from '../../lib/api/types';

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

  if (!isOpen || !document) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
      onClick={onClose}
    >
      {/* Header bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          color: '#ffffff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>
            {document.title}
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Cloudflare R2 Encrypted Document Storage
          </p>
        </div>

        {/* Zoom and Rotate controls */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '6px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            🔍 -
          </button>
          <span style={{ fontSize: '0.75rem', minWidth: '40px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '6px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            🔍 +
          </button>

          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '6px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            🔄 Rotate
          </button>

          <button
            onClick={onClose}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '6px',
              background: 'rgba(244, 63, 94, 0.2)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#f43f5e',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Close ✕
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
          {document.fileUrl.endsWith('.pdf') ? (
            <div
              style={{
                width: '600px',
                height: '400px',
                background: '#1e293b',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
              }}
            >
              <span style={{ fontSize: '3rem' }}>📄</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>PDF Document: {document.title}</span>
              <a
                href={document.fileUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--accent-primary)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                Open in New Tab ↗
              </a>
            </div>
          ) : (
            <img
              src={document.fileUrl}
              alt={document.title}
              style={{
                maxWidth: '100%',
                maxHeight: '65vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
              onError={(e) => {
                // Fallback graphic for placeholder image
                e.currentTarget.src =
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380"><rect width="600" height="380" fill="%231e293b"/><text x="50%" y="45%" fill="%236366f1" font-size="20" font-family="sans-serif" text-anchor="middle" font-weight="bold">GOVERNMENT OF INDIA / OFFICIAL DOCUMENT</text><text x="50%" y="55%" fill="%2394a3b8" font-size="14" font-family="sans-serif" text-anchor="middle">Official Verified Document Sample</text></svg>';
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

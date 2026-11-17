"use client";

import React, { useEffect, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  FileText,
  ExternalLink,
} from "lucide-react";
import { DriverKycDocument } from "../../lib/api/types";
import {
  resolveDocumentUrl,
  handleDocumentImageError,
} from "../../lib/api/client";
import { acquireScrollLock } from "../common/scrollLock";

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
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      releaseLock();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, document, onClose]);

  if (!isOpen || !document) return null;

  const toolbarBtnStyle: React.CSSProperties = {
    padding: "0.4rem 0.65rem",
    borderRadius: "8px",
    background: "rgba(15, 23, 42, 0.86)",
    border: "1px solid rgba(255, 255, 255, 0.16)",
    color: "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
    fontSize: "0.78rem",
    fontWeight: 600,
    transition: "all 0.15s ease",
  };

  return (
    <div
      className="animate-modal-backdrop fixed flex flex-col items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Document preview: ${document.title}`}
      style={{
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.88)",
        backdropFilter: "blur(8px)",
        zIndex: 120,
      }}
      onClick={onClose}
    >
      {/* Header bar */}
      <div
        className="animate-modal-pop w-full flex justify-between items-center gap-4 flex-wrap"
        style={{ maxWidth: "900px", marginBottom: "0.85rem", color: "#ffffff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3
            className="text-title-sm font-bold m-0"
            style={{ color: "#ffffff" }}
          >
            {document.title}
          </h3>
          <p
            className="text-sm"
            style={{ color: "#cbd5e1", margin: "0.15rem 0 0" }}
          >
            Cloudflare R2 Encrypted Document Storage
          </p>
        </div>

        {/* Zoom and Rotate controls */}
        <div className="flex gap-snug items-center">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            style={toolbarBtnStyle}
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <span
            className="text-sm text-center font-semibold"
            style={{ minWidth: "42px", color: "#e2e8f0" }}
          >
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
              background: "rgba(220, 38, 38, 0.22)",
              border: "1px solid rgba(248, 113, 113, 0.45)",
              color: "#fecaca",
            }}
          >
            <X size={14} /> Close
          </button>
        </div>
      </div>

      {/* Document Viewport */}
      <div
        className="w-full bg-base border flex items-center justify-center overflow-auto p-6"
        style={{ maxWidth: "900px", maxHeight: "75vh", borderRadius: "12px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex flex-col items-center"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: "transform 0.2s ease",
          }}
        >
          {(() => {
            const resolvedUrl = resolveDocumentUrl(document.fileUrl);
            const isPdf = (resolvedUrl || "")
              .toLowerCase()
              .split("?")[0]
              .endsWith(".pdf");

            if (isPdf) {
              return (
                <div
                  className="bg-surface-elevated flex flex-col items-center justify-center gap-4"
                  style={{
                    width: "600px",
                    height: "400px",
                    borderRadius: "8px",
                  }}
                >
                  <FileText size={48} color="var(--text-brand)" />
                  <span className="text-primary font-semibold">
                    PDF Document: {document.title}
                  </span>
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-4 bg-brand font-semibold text-md flex items-center gap-tight"
                    style={{ borderRadius: "6px", color: "#fff" }}
                  >
                    <ExternalLink size={14} /> Open in New Tab
                  </a>
                </div>
              );
            }

            return (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={resolvedUrl}
                  alt={document.title}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "65vh",
                    objectFit: "contain",
                    borderRadius: "8px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
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
                    className="text-sm inline-flex items-center gap-1"
                    style={{ color: "#94a3b8", textDecoration: "underline" }}
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

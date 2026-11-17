"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { VerificationItem } from "../../lib/api/types";
import { Modal } from "../Modal";
import { Button } from "../common/Button";

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
  "Blurry or unreadable Driving License image",
  "Driving License is expired or invalid",
  "Vehicle RC plate number mismatch with document",
  "Vehicle exterior photo does not clearly show registration plate",
  "Commercial insurance policy is expired or inactive",
  "Aadhaar / National ID details mismatch with name",
  "GST certificate registration inactive or entity name mismatch",
  "Vehicle class does not match the selected category",
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
  return (
    <Modal
      isOpen={isOpen && Boolean(target)}
      onClose={() => {
        if (!isProcessing) onClose();
      }}
      title="Decline Application"
      subtitle={
        target ? `Specify feedback sent directly to ${target.name}` : undefined
      }
      variant="danger"
      size="md"
      closeOnBackdrop={!isProcessing}
      icon={<AlertTriangle size={18} color="var(--color-danger)" />}
      footer={
        <>
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            loading={isProcessing}
            disabled={!presetReason}
            onClick={onConfirm}
          >
            {isProcessing ? "Processing..." : "Confirm Decline"}
          </Button>
        </>
      }
    >
      {target && (
        <div className="flex flex-col gap-wide">
          {/* Target summary banner */}
          <div
            className="bg-card-elevated rounded-md border flex justify-between items-center text-base"
            style={{ padding: "0.7rem 0.9rem" }}
          >
            <div>
              <span className="text-muted">Target: </span>
              <strong className="text-primary">{target.name}</strong>
              <span className="text-muted"> ({target.phone})</span>
            </div>
            <span
              className="badge"
              style={{
                backgroundColor:
                  target.entityType === "DRIVER"
                    ? "var(--brand-primary-subtle)"
                    : "var(--color-info-bg)",
                color:
                  target.entityType === "DRIVER"
                    ? "var(--text-brand)"
                    : "var(--color-info)",
                border: `1px solid ${target.entityType === "DRIVER" ? "var(--brand-primary-border)" : "var(--color-info-border)"}`,
              }}
            >
              {target.entityType}
            </span>
          </div>

          {/* Preset chips */}
          <div>
            <label className="text-sm font-semibold text-secondary block mb-snug">
              Select Rejection Reason Preset{" "}
              <span className="text-danger">*</span>
            </label>
            <div className="flex flex-wrap gap-compact">
              {PRESET_REASONS.map((r) => {
                const isSelected = presetReason === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onPresetReasonChange(r)}
                    className="rounded-sm text-control text-left cursor-pointer"
                    style={{
                      padding: "0.35rem 0.62rem",
                      fontWeight: isSelected ? 600 : 500,
                      transition: "all 0.14s ease",
                      background: isSelected
                        ? "var(--color-danger-bg)"
                        : "var(--bg-card-elevated)",
                      color: isSelected
                        ? "var(--color-danger)"
                        : "var(--text-secondary)",
                      border: isSelected
                        ? "1px solid var(--color-danger)"
                        : "1px solid var(--border)",
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom notes */}
          <div className="form-group mb-0">
            <label className="form-label">
              Additional Operational Notes / Instructions
            </label>
            <textarea
              rows={3}
              className="form-textarea"
              placeholder="e.g., Please upload a clearer high-resolution photo of the front page of your Driving License with numbers visible."
              value={customNotes}
              onChange={(e) => onCustomNotesChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </Modal>
  );
};

'use client';

import { useState, useCallback } from 'react';
import { adminApi, complianceBlockersFromError } from '../lib/api/client';
import { DigioComplianceAlert, VerificationItem } from '../lib/api/types';

export function useVerificationActions(
  onStatusUpdated?: (id: string, status: 'VERIFIED' | 'REJECTED', reason?: string) => void,
) {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  /** Issues the API returned with a 400 COMPLIANCE_BLOCKERS on the last approval attempt. */
  const [approvalBlockers, setApprovalBlockers] = useState<{ itemId: string; issues: DigioComplianceAlert[] } | null>(null);

  // Decline dialog state
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState<boolean>(false);
  const [declineTarget, setDeclineTarget] = useState<VerificationItem | null>(null);
  const [selectedPresetReason, setSelectedPresetReason] = useState<string>('');
  const [customDeclineNotes, setCustomDeclineNotes] = useState<string>('');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  const approveApplication = useCallback(
    async (item: VerificationItem, notes?: string, overrideReason?: string) => {
      setIsProcessing(true);
      setActionError(null);

      try {
        if (item.entityType === 'DRIVER') {
          await adminApi.verifyDriver(
            item.id,
            notes || 'Verified and approved by Super Admin',
            overrideReason || 'Approved by admin override',
          );
        } else {
          await adminApi.verifyVendor(item.id, notes || 'Verified and approved by Super Admin');
        }

        onStatusUpdated?.(item.id, 'VERIFIED');
        setApprovalBlockers(null);
        showToast(`Successfully approved ${item.name} (${item.entityType})`);
        return true;
      } catch (err: any) {
        const blockers = complianceBlockersFromError(err);
        if (blockers) {
          setApprovalBlockers({ itemId: item.id, issues: blockers });
          setActionError(err.message || 'Compliance blockers must be resolved or overridden with a reason');
          showToast(`${item.name} has compliance blockers: open the application and add an override reason to approve.`);
          return false;
        }
        setActionError(err.message || 'Verification update failed');
        showToast(`Failed to approve ${item.name}: ${err.message || 'Server error'}`);
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [onStatusUpdated, showToast],
  );

  const openDeclineDialog = useCallback((item: VerificationItem) => {
    setDeclineTarget(item);
    setSelectedPresetReason('Blurry or unreadable Driving License image');
    setCustomDeclineNotes('');
    setIsDeclineModalOpen(true);
  }, []);

  const closeDeclineDialog = useCallback(() => {
    setIsDeclineModalOpen(false);
    setDeclineTarget(null);
    setSelectedPresetReason('');
    setCustomDeclineNotes('');
  }, []);

  const confirmDecline = useCallback(async () => {
    if (!declineTarget) return;

    const fullReason = customDeclineNotes.trim()
      ? `${selectedPresetReason}: ${customDeclineNotes.trim()}`
      : selectedPresetReason || 'Application details do not meet platform verification standards.';

    setIsProcessing(true);
    setActionError(null);

    try {
      if (declineTarget.entityType === 'DRIVER') {
        await adminApi.rejectDriver(declineTarget.id, fullReason);
      } else {
        await adminApi.rejectVendor(declineTarget.id, fullReason);
      }

      onStatusUpdated?.(declineTarget.id, 'REJECTED', fullReason);
      showToast(`Declined application for ${declineTarget.name}. Feedback sent to user.`);
      closeDeclineDialog();
      return true;
    } catch (err: any) {
      setActionError(err.message || 'Decline update failed');
      showToast(`Failed to decline ${declineTarget.name}: ${err.message || 'Server error'}`);
      closeDeclineDialog();
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [declineTarget, selectedPresetReason, customDeclineNotes, onStatusUpdated, showToast, closeDeclineDialog]);

  return {
    isProcessing,
    actionError,
    toastMessage,
    isDeclineModalOpen,
    declineTarget,
    selectedPresetReason,
    setSelectedPresetReason,
    customDeclineNotes,
    setCustomDeclineNotes,
    approveApplication,
    approvalBlockers,
    openDeclineDialog,
    closeDeclineDialog,
    confirmDecline,
  };
}

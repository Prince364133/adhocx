"use client";

import React from "react";
import { Bell, Clock, ShieldCheck } from "lucide-react";
import { Button, FeedbackBanner, PageHeader } from "../../components/common";
import { VerificationStatsHeader } from "../../components/verifications/VerificationStatsHeader";
import { VerificationFilterBar } from "../../components/verifications/VerificationFilterBar";
import { VerificationCard } from "../../components/verifications/VerificationCard";
import { VerificationDetailModal } from "../../components/verifications/VerificationDetailModal";
import { DeclineReasonModal } from "../../components/verifications/DeclineReasonModal";
import { useVerificationCenter } from "../../hooks/useVerificationCenter";
import { useVerificationActions } from "../../hooks/useVerificationActions";

export default function VerificationCenterPage() {
  const {
    items,
    stats,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    entityFilter,
    setEntityFilter,
    statusFilter,
    setStatusFilter,
    selectedItem,
    setSelectedItem,
    refreshQueue,
    updateItemStatus,
  } = useVerificationCenter();

  const {
    isProcessing,
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
  } = useVerificationActions(updateItemStatus);

  return (
    <div className="admin-page">
      <PageHeader
        title="Verification Center"
        subtitle="Review, authenticate, and manage Driver KYC submissions and Vendor enterprise applications"
        liveStatus="KYC Pipeline Active"
      />

      <div className="flex flex-col gap-4">
        {/* Toast Feedback Notification */}
        {toastMessage && (
          <div
            className="animate-toast-in bg-surface text-primary font-semibold flex items-center fixed text-body-lg"
            style={{
              top: "20px",
              right: "20px",
              border: "1px solid var(--border-focus)",
              padding: "0.75rem 1.15rem",
              borderRadius: "10px",
              boxShadow: "var(--shadow-lg)",
              zIndex: 200,
              gap: "0.625rem",
            }}
          >
            <Bell size={16} color="var(--text-brand)" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 1. Metric Counter Cards */}
        <VerificationStatsHeader stats={stats} />

        {/* 2. Multi-Filter & Search Bar */}
        <VerificationFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          entityFilter={entityFilter}
          onEntityFilterChange={setEntityFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onRefresh={refreshQueue}
          isLoading={isLoading}
          totalCount={items.length}
        />

        {/* 3. Verification Card Grid */}
        {error && <FeedbackBanner type="error" message={error} />}

        {isLoading ? (
          <div
            className="flex flex-col items-center justify-center gap-3 text-muted bg-surface border text-body-lg"
            style={{ padding: "3.25rem 1.5rem", borderRadius: "12px" }}
          >
            <Clock size={26} color="var(--text-brand)" />
            <div>Loading verification queue from secure storage...</div>
          </div>
        ) : items.length === 0 ? (
          <div
            className="bg-surface border py-12 px-6 text-center flex flex-col items-center gap-relaxed"
            style={{ borderRadius: "12px" }}
          >
            <div
              className="rounded-full bg-brand-subtle flex items-center justify-center text-brand"
              style={{ width: "52px", height: "52px" }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3
                className="font-bold text-primary m-0"
                style={{ fontSize: "1.06rem" }}
              >
                No Applications in This Filter
              </h3>
              <p className="text-base text-muted mt-1">
                All submitted driver and vendor KYC applications have been
                reviewed or match no search query.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setEntityFilter("ALL");
                setStatusFilter("ALL");
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div
            className="verification-card-grid grid gap-4"
          >
            {items.map((item) => (
              <VerificationCard
                key={item.id}
                item={item}
                onSelect={(selected) => setSelectedItem(selected)}
                onApproveQuick={(target) => approveApplication(target)}
                onDeclineQuick={(target) => openDeclineDialog(target)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 4. Slide-Over Detailed Inspector */}
      <VerificationDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onApprove={(target, overrideReason) =>
          approveApplication(target, undefined, overrideReason)
        }
        onDecline={(target) => openDeclineDialog(target)}
        isProcessing={isProcessing}
        approvalBlockers={
          approvalBlockers &&
          selectedItem &&
          approvalBlockers.itemId === selectedItem.id
            ? approvalBlockers.issues
            : undefined
        }
      />

      {/* 5. Decline Reason Dialog */}
      <DeclineReasonModal
        isOpen={isDeclineModalOpen}
        target={declineTarget}
        presetReason={selectedPresetReason}
        onPresetReasonChange={setSelectedPresetReason}
        customNotes={customDeclineNotes}
        onCustomNotesChange={setCustomDeclineNotes}
        onConfirm={confirmDecline}
        onClose={closeDeclineDialog}
        isProcessing={isProcessing}
      />
    </div>
  );
}

'use client';

import React from 'react';
import { Bell, Clock, ShieldCheck } from 'lucide-react';
import { Button, FeedbackBanner, PageHeader } from '../../components/common';
import { VerificationStatsHeader } from '../../components/verifications/VerificationStatsHeader';
import { VerificationFilterBar } from '../../components/verifications/VerificationFilterBar';
import { VerificationCard } from '../../components/verifications/VerificationCard';
import { VerificationDetailModal } from '../../components/verifications/VerificationDetailModal';
import { DeclineReasonModal } from '../../components/verifications/DeclineReasonModal';
import { useVerificationCenter } from '../../hooks/useVerificationCenter';
import { useVerificationActions } from '../../hooks/useVerificationActions';

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Toast Feedback Notification */}
        {toastMessage && (
          <div
            className="animate-toast-in"
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--brand-primary)',
              color: 'var(--text-primary)',
              padding: '0.75rem 1.15rem',
              borderRadius: '10px',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 200,
              fontSize: '0.84rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
            }}
          >
            <Bell size={16} color="var(--brand-primary)" />
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
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3.25rem 1.5rem',
              gap: '0.75rem',
              color: 'var(--text-muted)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              fontSize: '0.84rem',
            }}
          >
            <Clock size={26} color="var(--brand-primary)" />
            <div>Loading verification queue from secure storage...</div>
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.85rem',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'var(--brand-primary-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-primary)',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.06rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                No Applications in This Filter
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                All submitted driver and vendor KYC applications have been reviewed or match no search query.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setEntityFilter('ALL');
                setStatusFilter('ALL');
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1rem',
            }}
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
        onApprove={(target, overrideReason) => approveApplication(target, undefined, overrideReason)}
        onDecline={(target) => openDeclineDialog(target)}
        isProcessing={isProcessing}
        approvalBlockers={
          approvalBlockers && selectedItem && approvalBlockers.itemId === selectedItem.id ? approvalBlockers.issues : undefined
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

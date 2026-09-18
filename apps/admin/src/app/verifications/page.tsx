'use client';

import React from 'react';
import { Bell, Clock, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/common';
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
    openDeclineDialog,
    closeDeclineDialog,
    confirmDecline,
  } = useVerificationActions(updateItemStatus);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        title="Verification Center"
        subtitle="Review, authenticate, and manage Driver KYC submissions and Vendor enterprise applications"
        liveStatus="KYC Pipeline Active"
      />

      <div>
        {/* Toast Feedback Notification */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              background: 'var(--bg-card-elevated)',
              border: '1px solid var(--brand-primary)',
              color: 'var(--text-primary)',
              padding: '0.875rem 1.5rem',
              borderRadius: '10px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
              zIndex: 200,
              fontSize: '0.875rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <Bell size={18} color="var(--brand-primary)" />
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
        {error && (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid var(--color-danger)',
              borderRadius: '8px',
              color: '#f43f5e',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        {isLoading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4rem',
              gap: '1rem',
              color: 'var(--text-muted)',
            }}
          >
            <Clock size={32} color="var(--brand-primary)" />
            <div>Loading verification queue from secure storage...</div>
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '4rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-primary)',
              }}
            >
              <ShieldCheck size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                No Applications in This Filter
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                All submitted driver and vendor KYC applications have been reviewed or match no search query.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setEntityFilter('ALL');
                setStatusFilter('ALL');
              }}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.25rem',
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
        onApprove={(target) => approveApplication(target)}
        onDecline={(target) => openDeclineDialog(target)}
        isProcessing={isProcessing}
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

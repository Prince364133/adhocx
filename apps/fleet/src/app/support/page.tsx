'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type {
  FleetSupportAttachmentLinkDto,
  FleetSupportTicketDetailDto,
  FleetSupportTicketDto,
} from '@adhocx/contracts';
import { Paperclip, Plus, Send, X } from 'lucide-react';
import { fleetApi } from '../../lib/api/client';
import { DrawerSkeleton, TablePageSkeleton } from '../../components/common/Skeletons';
import { ConfirmDialog, EmptyState, ErrorState, StatusBadge } from '../../components/common/StatePrimitives';

const STATUS_TABS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const TICKET_CATEGORIES = [
  'DRIVER_ISSUE',
  'FLEET_CODE',
  'EARNINGS_PAYOUT',
  'INCENTIVE',
  'GENERAL',
];

export default function FleetSupportPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [tickets, setTickets] = useState<FleetSupportTicketDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create ticket modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [category, setCategory] = useState('DRIVER_ISSUE');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [createAttachments, setCreateAttachments] = useState<FleetSupportAttachmentLinkDto[]>([]);
  const [uploadingCreateFile, setUploadingCreateFile] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Detail drawer state
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FleetSupportTicketDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<FleetSupportAttachmentLinkDto[]>([]);
  const [uploadingReplyFile, setUploadingReplyFile] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fleetApi.listSupportTickets({
        status: statusFilter,
        category: categoryFilter,
        page,
        limit: 15,
      });
      setTickets(res.items || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to fetch support tickets.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, page, statusFilter]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const openTicketDrawer = useCallback(async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setDetailLoading(true);
    setDetailError(null);
    setReplyBody('');
    setReplyAttachments([]);
    setReplyError(null);
    try {
      const d = await fleetApi.getSupportTicketDetail(ticketId);
      setDetail(d);
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : 'Unable to load ticket thread.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tid = new URLSearchParams(window.location.search).get('ticketId');
    if (tid) {
      void openTicketDrawer(tid);
    }
  }, [openTicketDrawer]);

  const handleUploadFiles = async (
    files: FileList | null,
    target: 'CREATE' | 'REPLY',
  ) => {
    if (!files || files.length === 0) return;
    const current = target === 'CREATE' ? createAttachments : replyAttachments;
    if (current.length + files.length > 5) {
      const msg = 'Maximum 5 attachments are allowed per message.';
      if (target === 'CREATE') setCreateError(msg);
      else setReplyError(msg);
      return;
    }

    if (target === 'CREATE') {
      setUploadingCreateFile(true);
      setCreateError(null);
    } else {
      setUploadingReplyFile(true);
      setReplyError(null);
    }

    try {
      const uploaded: FleetSupportAttachmentLinkDto[] = [];
      for (const file of Array.from(files)) {
        const res = await fleetApi.uploadSupportAttachment(file);
        uploaded.push(res);
      }
      if (target === 'CREATE') {
        setCreateAttachments((prev) => [...prev, ...uploaded]);
      } else {
        setReplyAttachments((prev) => [...prev, ...uploaded]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Attachment upload failed.';
      if (target === 'CREATE') setCreateError(msg);
      else setReplyError(msg);
    } finally {
      setUploadingCreateFile(false);
      setUploadingReplyFile(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!subject.trim() || !description.trim()) {
      setCreateError('Subject and description are required.');
      return;
    }
    setCreating(true);
    try {
      await fleetApi.createSupportTicket({
        category,
        subject: subject.trim(),
        description: description.trim(),
        attachments: createAttachments.map((a) => ({
          key: a.key,
          fileName: a.fileName,
          mimeType: a.mimeType,
        })),
      });
      setShowCreateModal(false);
      setSubject('');
      setDescription('');
      setCreateAttachments([]);
      await loadTickets();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Unable to create support ticket.');
    } finally {
      setCreating(false);
    }
  };

  const submitReply = async (reopen: boolean) => {
    if (!detail) return;
    setReplyError(null);
    if (!replyBody.trim()) {
      setReplyError('Please enter a message before sending.');
      return;
    }
    setReplying(true);
    try {
      await fleetApi.replySupportTicket(detail.id, {
        body: replyBody.trim(),
        reopen,
        attachments: replyAttachments.map((a) => ({
          key: a.key,
          fileName: a.fileName,
          mimeType: a.mimeType,
        })),
      });
      setReplyBody('');
      setReplyAttachments([]);
      setShowReopenConfirm(false);
      await openTicketDrawer(detail.id);
      await loadTickets();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('fleet:notifications-updated'));
      }
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : 'Failed to send reply.');
    } finally {
      setReplying(false);
    }
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    if (!replyBody.trim()) {
      setReplyError('Please enter a message before sending.');
      return;
    }
    if (detail.status === 'RESOLVED' || detail.status === 'CLOSED') {
      setShowReopenConfirm(true);
      return;
    }
    void submitReply(false);
  };

  const totalPages = Math.max(1, Math.ceil(total / 15));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        className="fleet-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: statusFilter === s ? 'var(--brand-primary)' : 'var(--bg-surface)',
                color: statusFilter === s ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.45rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              fontSize: '0.825rem',
            }}
          >
            <option value="ALL">All Categories</option>
            {TICKET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setShowCreateModal(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--brand-primary)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            <span>New Support Ticket</span>
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadTickets} />}

      {loading ? (
        <TablePageSkeleton />
      ) : tickets.length === 0 ? (
        <EmptyState
          title="No Support Tickets"
          description="Need help with driver verification, Fleet Code associations, payouts, or incentives? Raise a support ticket."
          action={
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--brand-primary)',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Create First Ticket
            </button>
          }
        />
      ) : (
        <div className="fleet-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Ticket #</th>
                <th style={{ padding: '0.75rem 1rem' }}>Subject</th>
                <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Created</th>
                <th style={{ padding: '0.75rem 1rem' }}>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => void openTicketDrawer(t.id)}
                  style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                    {t.ticketNumber}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{t.subject}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                    {t.category.replace(/_/g, ' ')}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <StatusBadge status={t.status} />
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                    {new Date(t.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Page {page} of {totalPages} ({total} tickets)
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '0.35rem 0.7rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{ padding: '0.35rem 0.7rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create Support Ticket"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 55,
          }}
        >
          <form
            onSubmit={handleCreateSubmit}
            className="fleet-card"
            style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Create Support Ticket</h2>
              <button
                type="button"
                aria-label="Close create ticket dialog"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div
                role="alert"
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  background: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                }}
              >
                {createError}
              </div>
            )}

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.825rem', fontWeight: 600 }}>
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
              >
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.825rem', fontWeight: 600 }}>
              Subject
              <input
                type="text"
                required
                placeholder="Brief summary of the issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.825rem', fontWeight: 600 }}>
              Description
              <textarea
                required
                rows={4}
                placeholder="Include affected driver name/ID, payout reference, or trip ID..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', resize: 'vertical' }}
              />
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--brand-primary)',
                }}
              >
                <Paperclip size={15} />
                <span>{uploadingCreateFile ? 'Uploading...' : 'Attach files (PNG, JPEG, WEBP, PDF, TXT — max 5)'}</span>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.txt"
                  disabled={uploadingCreateFile}
                  onChange={(e) => void handleUploadFiles(e.target.files, 'CREATE')}
                  style={{ display: 'none' }}
                />
              </label>

              {createAttachments.length > 0 && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {createAttachments.map((att, idx) => (
                    <span
                      key={`${att.key}-${idx}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '9999px',
                        background: 'var(--bg-surface-muted)',
                        fontSize: '0.75rem',
                      }}
                    >
                      <span>{att.fileName}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${att.fileName}`}
                        onClick={() =>
                          setCreateAttachments((prev) => prev.filter((_, i) => i !== idx))
                        }
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.3rem' }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || uploadingCreateFile}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--brand-primary)',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {creating ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ticket Detail & Conversation Drawer */}
      {selectedTicketId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Support Ticket Conversation"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 55,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: 'var(--bg-surface)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              padding: '1.25rem',
              overflowY: 'auto',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {detail?.ticketNumber || 'Support Ticket'}
                </div>
                <h2 style={{ margin: '0.15rem 0 0', fontSize: '1.05rem', fontWeight: 700 }}>
                  {detail?.subject || 'Loading conversation...'}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close ticket drawer"
                onClick={() => {
                  setSelectedTicketId(null);
                  setDetail(null);
                }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {detailLoading ? (
              <DrawerSkeleton />
            ) : detailError ? (
              <ErrorState
                message={detailError}
                onRetry={() => {
                  if (selectedTicketId) void openTicketDrawer(selectedTicketId);
                }}
              />
            ) : detail ? (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <StatusBadge status={detail.status} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {detail.category.replace(/_/g, ' ')} · Opened {new Date(detail.createdAt).toLocaleString()}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                  {detail.messages.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-subtle)',
                        background: m.senderRole.startsWith('FLEET')
                          ? 'var(--bg-surface-muted)'
                          : 'var(--bg-surface)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                        <strong>{m.senderName || m.senderRole}</strong>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {new Date(m.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{m.body}</p>
                      {m.attachments.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                          {m.attachments.map((att, idx) => (
                            <a
                              key={`${att.key}-${idx}`}
                              href={att.downloadUrl || '#'}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.75rem',
                                color: 'var(--brand-primary)',
                                textDecoration: 'underline',
                              }}
                            >
                              <Paperclip size={12} />
                              <span>{att.fileName}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleReplySubmit}
                  style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                  }}
                >
                  {replyError && (
                    <div
                      role="alert"
                      style={{
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        background: 'var(--color-danger-bg)',
                        color: 'var(--color-danger)',
                        fontSize: '0.8rem',
                      }}
                    >
                      {replyError}
                    </div>
                  )}

                  <textarea
                    rows={3}
                    placeholder={
                      detail.status === 'RESOLVED' || detail.status === 'CLOSED'
                        ? 'Write a reply (you will be asked to confirm reopening)...'
                        : 'Write a reply to AdhocX Support...'
                    }
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    style={{
                      padding: '0.55rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      resize: 'vertical',
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                      <Paperclip size={14} />
                      <span>{uploadingReplyFile ? 'Uploading...' : `Attach (${replyAttachments.length}/5)`}</span>
                      <input
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp,.pdf,.txt"
                        disabled={uploadingReplyFile}
                        onChange={(e) => void handleUploadFiles(e.target.files, 'REPLY')}
                        style={{ display: 'none' }}
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={replying || uploadingReplyFile}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 0.9rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'var(--brand-primary)',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                      }}
                    >
                      <Send size={14} />
                      <span>
                        {replying
                          ? 'Sending...'
                          : detail.status === 'RESOLVED' || detail.status === 'CLOSED'
                            ? 'Reopen & Reply'
                            : 'Send Reply'}
                      </span>
                    </button>
                  </div>
                </form>
              </>
            ) : null}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showReopenConfirm}
        title="Reopen Support Ticket?"
        description="This ticket is currently marked resolved or closed. Sending this reply will reopen the ticket as OPEN."
        confirmLabel="Reopen & Send Reply"
        isLoading={replying}
        onConfirm={() => void submitReply(true)}
        onClose={() => setShowReopenConfirm(false)}
      />
    </div>
  );
}

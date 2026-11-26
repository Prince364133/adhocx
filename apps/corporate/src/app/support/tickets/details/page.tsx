'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useParams } from 'next/navigation';
import { ContentLoadingSkeleton, PageLoadingSkeleton } from '@adhocx/ui/page-loading';
import {
  MessageSquare,
  ArrowLeft,
  Clock,
  User,
  ShieldCheck,
  Send,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Building,
  RefreshCw,
} from 'lucide-react';
import { supportApi } from '../../../../lib/api/corporate';
import type { SupportTicket, CorporateTicketMessage } from '../../../../lib/api/types';
import { useSession } from '../../../../lib/auth/SessionContext';

function TicketDetailsThreadContent() {
  const { tenantId, status: sessionStatus } = useSession();

  const searchParams = useSearchParams();
  const routeParams = useParams();
  const ticketIdParam = (Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id) || searchParams.get('id');

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<CorporateTicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Reopen ticket modal/state
  const [isReopenOpen, setIsReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load ticket details and persistent messages
  const loadTicketAndMessages = useCallback(async () => {
    if (sessionStatus === 'loading') return;
    if (!tenantId && !ticketIdParam) {
      setTicket(null);
      setLoading(false);
      return;
    }

    if (!ticketIdParam) {
      // If no ID param, load latest ticket for tenant
      try {
        setLoading(true);
        const list = await supportApi.list(tenantId || undefined, { limit: 1 });
        if (list.length > 0) {
          const t = list[0];
          setTicket(t);
          loadMessages(t.id);
        } else {
          setTicket(null);
        }
      } catch (err: any) {
        console.warn('Failed to load tickets:', err);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const data = await supportApi.get(ticketIdParam).catch(async () => {
        if (!tenantId) return null;
        // Fallback to searching the list
        const list = await supportApi.list(tenantId, {});
        return list.find((t) => t.id === ticketIdParam) || null;
      });

      setTicket(data);
      if (data) {
        loadMessages(data.id);
      }
    } catch (err: any) {
      console.warn('Failed to load ticket:', err);
      setFeedback({ type: 'error', message: err?.message || 'Failed to load ticket details' });
    } finally {
      setLoading(false);
    }
  }, [ticketIdParam, tenantId, sessionStatus]);

  const loadMessages = async (id: string) => {
    setMessagesLoading(true);
    try {
      const msgs = await supportApi.listMessages(id);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err) {
      console.warn('Failed to load messages:', err);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    loadTicketAndMessages();
  }, [loadTicketAndMessages]);

  // Send persistent reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !replyMessage.trim()) return;

    setSendingReply(true);
    setFeedback(null);
    try {
      const newMsg = await supportApi.sendMessage(ticket.id, {
        message: replyMessage.trim(),
      });
      setMessages((prev) => [...prev, newMsg]);
      setReplyMessage('');
      setFeedback({ type: 'success', message: 'Reply sent to AdhocX support team.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to send reply.' });
    } finally {
      setSendingReply(false);
    }
  };

  // Reopen ticket
  const handleReopenTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !reopenReason.trim()) return;

    setReopening(true);
    setFeedback(null);
    try {
      const updated = await supportApi.reopen(ticket.id, {
        reason: reopenReason.trim(),
      });
      setTicket(updated);
      setIsReopenOpen(false);
      setReopenReason('');
      setFeedback({ type: 'success', message: `Ticket #${updated.ticketNumber || updated.id.slice(0, 8)} reopened to IN PROGRESS.` });
      loadMessages(updated.id);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to reopen ticket.' });
    } finally {
      setReopening(false);
    }
  };

  if (loading) {
    return <PageLoadingSkeleton variant="detail" />;
  }

  if (!ticket) {
    return (
      <div className="surface-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
        Ticket not found.
      </div>
    );
  }

  const isResolvedOrClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: 6,
            backgroundColor: feedback.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            border: `1px solid ${feedback.type === 'success' ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
            color: feedback.type === 'success' ? '#166534' : '#991B1B',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/support"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <ArrowLeft size={14} /> Back to Support Overview
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Ticket #{ticket.ticketNumber || ticket.id.slice(0, 8).toUpperCase()}
              </h1>
              <span
                style={{
                  padding: '2px 8px',
                  backgroundColor:
                    ticket.status === 'RESOLVED'
                      ? 'var(--color-success-bg)'
                      : ticket.status === 'IN_PROGRESS'
                      ? '#E0E7FF'
                      : ticket.status === 'CLOSED'
                      ? '#F1F5F9'
                      : 'var(--color-warning-bg)',
                  color:
                    ticket.status === 'RESOLVED'
                      ? 'var(--color-success)'
                      : ticket.status === 'IN_PROGRESS'
                      ? 'var(--color-chart-indigo-hover)'
                      : ticket.status === 'CLOSED'
                      ? '#475569'
                      : '#D97706',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {ticket.status.replace('_', ' ')}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Category: <strong>{ticket.category.replace('_', ' ')}</strong> · Priority:{' '}
              <strong>{ticket.priority || 'Normal'}</strong>
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => loadTicketAndMessages()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} style={{ animation: messagesLoading ? 'spin 1s linear infinite' : undefined }} />
            Refresh Thread
          </button>

          {isResolvedOrClosed && (
            <button
              type="button"
              onClick={() => setIsReopenOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                backgroundColor: '#F59E0B',
                color: '#FFFFFF',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={14} /> Reopen Ticket
            </button>
          )}
        </div>
      </div>

      {/* Reopen Inline Modal / Dialog */}
      {isReopenOpen && (
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            backgroundColor: 'var(--color-warning-bg-alt)',
            border: '1px solid var(--color-warning-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-warning-text-deep)' }}>
            Reopen Support Ticket #{ticket.ticketNumber || ticket.id.slice(0, 8)}
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-warning-text)', margin: 0 }}>
            If the resolution was incomplete or the issue recurred, provide details below. The ticket will transition
            back to IN PROGRESS.
          </p>
          <textarea
            rows={2}
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            placeholder="Explain why this ticket is being reopened..."
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid var(--color-warning-text-bright)',
              backgroundColor: 'var(--bg-surface)',
              fontSize: 13,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={() => setIsReopenOpen(false)}
              disabled={reopening}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--color-border-neutral)',
                backgroundColor: 'var(--bg-surface)',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReopenTicket}
              disabled={reopening || !reopenReason.trim()}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#D97706',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 700,
                cursor: reopening || !reopenReason.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {reopening ? 'Reopening...' : 'Confirm Reopen'}
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Left Conversation Thread / Right Ticket Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.4fr) minmax(280px, 1fr)', gap: 16 }}>
        {/* Thread */}
        <div
          className="surface-card"
          style={{
            padding: 20,
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Initial Ticket Description */}
          <div
            style={{
              padding: 16,
              backgroundColor: 'var(--bg-surface-muted)',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {ticket.subject}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {new Date(ticket.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
              {ticket.description}
            </p>
          </div>

          {/* Resolution Banner if present */}
          {ticket.resolutionNotes && (
            <div
              style={{
                padding: 14,
                borderRadius: 8,
                backgroundColor: 'var(--color-success-bg-alt)',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <CheckCircle2 size={18} color="var(--color-success)" style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 2 }}>
                  Official Resolution
                </div>
                <div style={{ fontSize: 13, color: '#14532D', lineHeight: 1.5 }}>
                  {ticket.resolutionNotes}
                </div>
                {ticket.resolvedAt && (
                  <div style={{ fontSize: 11, color: 'var(--color-success)', marginTop: 4 }}>
                    Resolved at: {new Date(ticket.resolvedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Persistent Messages Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Message History ({messages.length})
            </div>

            {messagesLoading ? (
              <ContentLoadingSkeleton kind="list" count={4} label="Loading conversation…" />
            ) : messages.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: 24,
                  backgroundColor: 'var(--bg-surface-muted)',
                  borderRadius: 6,
                  color: 'var(--text-muted)',
                  fontSize: 13,
                }}
              >
                No responses recorded yet. Reply below to communicate with the operations team.
              </div>
            ) : (
              messages.map((m) => {
                const isSupportTeam = m.senderRole === 'ADMIN' || m.senderRole === 'OPS';

                return (
                  <div
                    key={m.id}
                    style={{
                      padding: 14,
                      borderRadius: 8,
                      backgroundColor: isSupportTeam ? 'var(--color-blue-bg)' : 'var(--bg-surface-muted)',
                      border: `1px solid ${isSupportTeam ? 'var(--color-blue-border)' : 'var(--border-subtle)'}`,
                      marginLeft: isSupportTeam ? 0 : 20,
                      marginRight: isSupportTeam ? 20 : 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 11,
                        color: isSupportTeam ? 'var(--color-chart-indigo-hover)' : 'var(--text-primary)',
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      <span>
                        {m.senderName || (isSupportTeam ? 'AdhocX Support Desk' : 'Corporate User')}
                        <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
                          ({m.senderRole})
                        </span>
                      </span>
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply Form */}
          <form onSubmit={handleSendReply} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <textarea
              rows={3}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your response to the support desk..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={sendingReply || !replyMessage.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 18px',
                  backgroundColor: 'var(--brand-action)',
                  color: '#FFFFFF',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: sendingReply || !replyMessage.trim() ? 'not-allowed' : 'pointer',
                  opacity: sendingReply || !replyMessage.trim() ? 0.6 : 1,
                }}
              >
                <Send size={14} /> {sendingReply ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Info Sidebar */}
        <div
          className="surface-card"
          style={{
            padding: 20,
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Ticket Metadata & Details
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Ticket Number</div>
              <div style={{ fontWeight: 700, color: 'var(--brand-primary)', fontFamily: 'monospace' }}>
                #{ticket.ticketNumber || ticket.id.slice(0, 8).toUpperCase()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Created Date</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {new Date(ticket.createdAt).toLocaleString()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Category</div>
              <div style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>
                {ticket.category.replace('_', ' ')}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Priority</div>
              <div style={{ fontWeight: 600, color: ticket.priority === 'CRITICAL' ? '#DC2626' : 'var(--text-primary)' }}>
                {ticket.priority || 'Normal'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Status</div>
              <div
                style={{
                  fontWeight: 700,
                  color:
                    ticket.status === 'RESOLVED'
                      ? 'var(--color-success)'
                      : ticket.status === 'IN_PROGRESS'
                      ? 'var(--color-chart-indigo-hover)'
                      : '#D97706',
                }}
              >
                {ticket.status.replace('_', ' ')}
              </div>
            </div>

            {ticket.slaMinutes && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Target SLA</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {ticket.slaMinutes} minutes
                </div>
              </div>
            )}

            {ticket.employee && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Affected Employee</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {ticket.employee.fullName}
                </div>
                {ticket.employee.employeeCode && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    ID: {ticket.employee.employeeCode}
                  </div>
                )}
                {(ticket.employee.phoneNumber ?? ticket.employee.phone) && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Phone: {ticket.employee.phoneNumber ?? ticket.employee.phone}
                  </div>
                )}
              </div>
            )}

            {ticket.routeId && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Linked Route</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--brand-primary)' }}>
                  {ticket.routeId}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TicketDetailsThreadPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant="detail" />}>
      <TicketDetailsThreadContent />
    </Suspense>
  );
}

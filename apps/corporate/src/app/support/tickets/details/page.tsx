'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  MessageSquare,
  ArrowLeft,
  Clock,
  User,
  ShieldCheck,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { supportApi } from '../../../../lib/api/corporate';
import type { SupportTicket } from '../../../../lib/api/types';
import { useSession } from '../../../../lib/auth/SessionContext';

function TicketDetailsThreadContent() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const searchParams = useSearchParams();
  const ticketIdParam = searchParams.get('id');

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [replies, setReplies] = useState<Array<{ sender: string; time: string; text: string }>>([]);

  useEffect(() => {
    setLoading(true);
    supportApi
      .list(activeTenantId, {})
      .then((tickets) => {
        if (tickets.length > 0) {
          const match = ticketIdParam ? tickets.find((t) => t.id === ticketIdParam) : null;
          setTicket(match || tickets[0]);
        }
      })
      .catch((err) => {
        console.warn('Failed to load ticket:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeTenantId, ticketIdParam]);

  const handleSendReply = () => {
    if (!replyMessage.trim()) return;
    setReplies([
      ...replies,
      {
        sender: 'Corporate Transport Admin (You)',
        time: 'Just now',
        text: replyMessage.trim(),
      },
    ]);
    setReplyMessage('');
  };

  if (loading) {
    return (
      <div className="surface-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading ticket thread...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="surface-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
        Ticket not found.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                Ticket — {ticket.id.slice(0, 8)}
              </h1>
              <span
                style={{
                  padding: '2px 8px',
                  backgroundColor: ticket.status === 'RESOLVED' ? '#DCFCE7' : '#EFF6FF',
                  color: ticket.status === 'RESOLVED' ? '#16A34A' : '#5728B2',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {ticket.status}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Category: {ticket.category} · Priority: {ticket.priority || 'Normal'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Conversation Thread / Right Ticket Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.4fr) minmax(280px, 1fr)', gap: 16 }}>
        {/* Thread */}
        <div className="surface-card" style={{ padding: 20, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 16, backgroundColor: 'var(--bg-surface-muted)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              {ticket.subject}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {ticket.description}
            </p>
          </div>

          {/* Reply history */}
          {replies.map((r, idx) => (
            <div key={idx} style={{ padding: 14, borderRadius: 8, backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#5728B2', fontWeight: 700, marginBottom: 4 }}>
                <span>{r.sender}</span>
                <span>{r.time}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{r.text}</div>
            </div>
          ))}

          {/* Reply Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <textarea
              rows={3}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your response to the commuter or operations vendor..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleSendReply}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  backgroundColor: '#5728B2',
                  color: '#FFFFFF',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Send size={14} /> Send Reply
              </button>
            </div>
          </div>
        </div>

        {/* Right Info */}
        <div className="surface-card" style={{ padding: 20, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
            Ticket Metadata
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Ticket ID</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{ticket.id}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Created Date</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {new Date(ticket.createdAt).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Category</div>
              <div style={{ fontWeight: 600, color: '#5728B2' }}>{ticket.category}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Status</div>
              <div style={{ fontWeight: 700, color: ticket.status === 'RESOLVED' ? '#16A34A' : '#D97706' }}>
                {ticket.status}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TicketDetailsThreadPage() {
  return (
    <Suspense fallback={<div className="surface-card" style={{ padding: 40, textAlign: 'center' }}>Loading...</div>}>
      <TicketDetailsThreadContent />
    </Suspense>
  );
}

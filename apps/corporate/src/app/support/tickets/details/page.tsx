'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  ArrowLeft,
  Clock,
  User,
  ShieldCheck,
  Send,
  CheckCircle2,
  AlertTriangle,
  Car,
  FileText,
} from 'lucide-react';
import { mockSupportTickets } from '../../../../lib/mock/corporateMockData';

export default function TicketDetailsThreadPage() {
  const [selectedTktId, setSelectedTktId] = useState('TKT-901');
  const ticket = mockSupportTickets.find((t) => t.id === selectedTktId) || mockSupportTickets[0];
  const [replyMessage, setReplyMessage] = useState('');
  const [conversation, setConversation] = useState(ticket.conversation);
  const [ticketStatus, setTicketStatus] = useState(ticket.status);

  const handleSendReply = () => {
    if (!replyMessage.trim()) return;
    const newMsg = {
      sender: 'Corporate Transport Admin (You)',
      role: 'Agent' as const,
      time: 'Just now',
      message: replyMessage.trim(),
    };
    setConversation([...conversation, newMsg]);
    setReplyMessage('');
  };

  const handleResolve = () => {
    setTicketStatus('Resolved');
    setConversation([
      ...conversation,
      {
        sender: 'System',
        role: 'System' as const,
        time: 'Just now',
        message: 'Ticket marked as RESOLVED by Corporate Transport Admin.',
      },
    ]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/support/tickets"
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
              backgroundColor: '#FFFFFF',
            }}
          >
            <ArrowLeft size={14} /> Back to Ticket List
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {ticket.ticketId}: {ticket.subject}
              </h1>
              <span
                style={{
                  padding: '2px 8px',
                  backgroundColor: ticket.priority === 'High' ? '#FFEDD5' : '#EFF6FF',
                  color: ticket.priority === 'High' ? '#C2410C' : 'var(--corporate-blue)',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {ticket.priority} Priority
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  backgroundColor: ticketStatus === 'Resolved' ? '#DCFCE7' : '#EFF6FF',
                  color: ticketStatus === 'Resolved' ? '#15803D' : 'var(--corporate-blue)',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {ticketStatus}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Opened {ticket.createdAt} • Category: {ticket.category}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {ticketStatus !== 'Resolved' && (
            <button
              type="button"
              onClick={handleResolve}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <CheckCircle2 size={16} /> Mark as Resolved
            </button>
          )}
        </div>
      </div>

      {/* Two-Column Grid: Left Metadata & Right Chat Thread */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16 }}>
        {/* Left Column: Ticket Metadata & Commuter Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
              Ticket Information
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Commuter:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {ticket.employeeName} ({ticket.employeeId})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Campus Site:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ticket.office}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Category:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ticket.category}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Trip Reference:</span>
                <span style={{ fontWeight: 600, color: 'var(--corporate-blue)' }}>
                  {ticket.tripReference || 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>SLA Target:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {ticket.slaTargetHours} Hours (Elapsed: {ticket.elapsedTimeHours})
                </span>
              </div>
            </div>

            {/* SLA Timer Indicator */}
            <div style={{ marginTop: 16, padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: 6, border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803D', fontWeight: 600, fontSize: 12 }}>
                <Clock size={14} /> Within Contractual SLA Window
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Target resolution by 10:30 AM (48 min remaining)
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Conversation Thread */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 460,
          }}
        >
          {/* Messages Header */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', fontSize: 14, fontWeight: 700 }}>
            Investigation Thread & Employee Messages ({conversation.length})
          </div>

          {/* Messages Container */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
            {conversation.map((msg, idx) => {
              const isEmployee = msg.role === 'Employee';
              const isSystem = msg.role === 'System';

              if (isSystem) {
                return (
                  <div
                    key={idx}
                    style={{
                      textAlign: 'center',
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      padding: '4px 10px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: 4,
                      alignSelf: 'center',
                    }}
                  >
                    {msg.message} • {msg.time}
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  style={{
                    alignSelf: isEmployee ? 'flex-start' : 'flex-end',
                    maxWidth: '80%',
                    backgroundColor: isEmployee ? '#F1F5F9' : '#EFF6FF',
                    borderRadius: 8,
                    padding: '10px 14px',
                    border: `1px solid ${isEmployee ? '#E2E8F0' : '#BFDBFE'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isEmployee ? 'var(--text-primary)' : 'var(--corporate-blue)' }}>
                      {msg.sender}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{msg.time}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                    {msg.message}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Reply Input Box */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: 10,
              backgroundColor: '#F8FAFC',
            }}
          >
            <input
              type="text"
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
              placeholder="Type an official response or internal note to the commuter..."
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                fontSize: 13,
                backgroundColor: '#FFFFFF',
              }}
            />
            <button
              type="button"
              onClick={handleSendReply}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                backgroundColor: 'var(--corporate-blue)',
                color: '#FFFFFF',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Send size={14} /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


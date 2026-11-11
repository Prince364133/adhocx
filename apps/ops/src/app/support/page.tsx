'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Eye, LifeBuoy, MessageSquareText, Send, Shield, X } from 'lucide-react';
import { opsApi } from '../../lib/api/opsClient';
import type { OpsSupportTicket, OpsSupportTicketStatus } from '../../lib/api/opsTypes';

const STATUSES: OpsSupportTicketStatus[] = ['ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CORPORATE', 'RESOLVED'];
const inputStyle: React.CSSProperties = { minHeight: 38, width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box' };
const buttonStyle: React.CSSProperties = { minHeight: 34, padding: '0 11px', borderRadius: 7, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const primaryStyle: React.CSSProperties = { ...buttonStyle, border: 0, background: '#5d3ab6', color: '#fff' };
const display = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function OpsSupportPage() {
  const [tickets, setTickets] = useState<OpsSupportTicket[]>([]);
  const [selected, setSelected] = useState<OpsSupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updateText, setUpdateText] = useState('');
  const [resolution, setResolution] = useState('');
  const [status, setStatus] = useState<OpsSupportTicketStatus>('IN_PROGRESS');
  const [saving, setSaving] = useState(false);

  const loadTickets = useCallback(async () => {
    setError('');
    try {
      const response = await opsApi.getSupportTickets();
      setTickets(Array.isArray(response) ? response : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load assigned support tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
    const timer = window.setInterval(() => void loadTickets(), 30000);
    return () => window.clearInterval(timer);
  }, [loadTickets]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tickets.filter((ticket) => (!statusFilter || ticket.status === statusFilter)
      && (!needle || ticket.ticketNumber.toLowerCase().includes(needle) || ticket.subject.toLowerCase().includes(needle)));
  }, [tickets, query, statusFilter]);

  const openTicket = async (ticket: OpsSupportTicket) => {
    try {
      const detail = await opsApi.getSupportTicket(ticket.id);
      setSelected(detail);
      setStatus(detail.status === 'ASSIGNED' || detail.status === 'OPEN' ? 'IN_PROGRESS' : detail.status);
      setResolution(detail.resolutionNotes || '');
      setUpdateText('');
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Unable to open ticket.');
    }
  };

  const refreshSelected = async () => {
    if (!selected) return;
    const detail = await opsApi.getSupportTicket(selected.id);
    setSelected(detail);
    await loadTickets();
  };

  const sendUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !updateText.trim()) return;
    setSaving(true);
    try {
      await opsApi.addSupportTicketUpdate(selected.id, updateText.trim());
      setUpdateText('');
      setNotice('Operational update sent to the Admin team.');
      await refreshSelected();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Unable to send update.');
    } finally {
      setSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await opsApi.updateSupportTicketStatus(selected.id, status, status === 'RESOLVED' ? resolution : undefined);
      setNotice(`Ticket status updated to ${display(status)}.`);
      await refreshSelected();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Unable to update ticket status.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div><h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 23, fontWeight: 750 }}>Support Tickets</h1><p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Operational queue assigned to OPS or directly to your account.</p></div>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Shared queue · auto-refreshes every 30 seconds</span>
      </header>
      {notice && <div role="status" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 7, background: '#f1effb', color: '#523697', fontSize: 12 }}>{notice}<button type="button" aria-label="Dismiss" onClick={() => setNotice('')} style={{ border: 0, background: 'none', color: 'inherit', cursor: 'pointer' }}><X size={14} /></button></div>}
      <section style={{ border: '1px solid var(--border-subtle)', borderRadius: 9, background: 'var(--bg-surface)', overflow: 'hidden' }}>
        <div style={{ padding: 14, display: 'flex', gap: 10, borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
          <input aria-label="Search tickets" placeholder="Search ticket number or title" value={query} onChange={(event) => setQuery(event.target.value)} style={{ ...inputStyle, maxWidth: 340 }} />
          <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ ...inputStyle, width: 190 }}><option value="">All statuses</option>{STATUSES.map((value) => <option key={value} value={value}>{display(value)}</option>)}</select>
          <button type="button" onClick={() => void loadTickets()} style={buttonStyle}>Refresh queue</button>
        </div>
        {error ? <div role="alert" style={{ padding: 42, textAlign: 'center', color: 'var(--text-secondary)' }}><AlertCircle size={21} style={{ color: '#ad493c' }} /><p>{error}</p><button type="button" onClick={() => void loadTickets()} style={primaryStyle}>Retry</button></div>
          : loading ? <div style={{ padding: 36, color: 'var(--text-muted)', fontSize: 13 }}>Loading assigned tickets…</div>
            : filtered.length === 0 ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}><LifeBuoy size={23} style={{ color: '#8170af' }} /><p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 650 }}>No assigned tickets</p><p style={{ fontSize: 12 }}>Tickets assigned to OPS will appear here.</p></div>
              : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 850, borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead><tr style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase' }}>{['Ticket', 'Tenant', 'Title', 'Category', 'Priority', 'Assigned Team', 'Updated', 'Status', ''].map((head) => <th key={head} style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>{head}</th>)}</tr></thead>
                <tbody>{filtered.map((ticket) => <tr key={ticket.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: 12, color: '#5d3ab6', fontSize: 11, fontWeight: 700 }}>{ticket.ticketNumber}</td>
                  <td style={{ padding: 12, color: 'var(--text-secondary)', fontSize: 11 }}>{ticket.tenant?.name || ticket.tenantId}</td>
                  <td style={{ padding: 12, maxWidth: 250 }}><div style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 650 }}>{ticket.subject}</div><div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 3 }}>{ticket.employee?.fullName || '—'}</div></td>
                  <td style={{ padding: 12, color: 'var(--text-secondary)', fontSize: 11 }}>{display(ticket.category)}</td>
                  <td style={{ padding: 12, color: 'var(--text-secondary)', fontSize: 11 }}>{display(ticket.priority)}</td>
                  <td style={{ padding: 12, color: 'var(--text-secondary)', fontSize: 11 }}>{ticket.assignedTeam || 'Individual assignment'}</td>
                  <td style={{ padding: 12, color: 'var(--text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(ticket.updatedAt).toLocaleString()}</td>
                  <td style={{ padding: 12 }}><span style={{ padding: '4px 8px', borderRadius: 5, background: '#f1efff', color: '#5d3ab6', fontSize: 10, fontWeight: 700 }}>{display(ticket.status)}</span></td>
                  <td style={{ padding: 12 }}><button type="button" onClick={() => void openTicket(ticket)} title="View ticket" aria-label={`View ${ticket.ticketNumber}`} style={{ ...buttonStyle, minHeight: 30, padding: 6, display: 'inline-flex' }}><Eye size={14} /></button></td>
                </tr>)}</tbody>
              </table></div>}
      </section>

      {selected && <div onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end', background: 'rgba(15,23,42,.4)' }}>
        <aside role="dialog" aria-modal="true" aria-labelledby="ops-ticket-title" style={{ width: 'min(620px,100vw)', height: '100%', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', boxShadow: '-12px 0 34px rgba(0,0,0,.12)' }}>
          <header style={{ padding: '20px 22px 16px', display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--border-subtle)' }}><div><div style={{ color: '#5d3ab6', fontSize: 10, fontWeight: 700 }}>{selected.ticketNumber} · {selected.tenant?.name || selected.tenantId}</div><h2 id="ops-ticket-title" style={{ color: 'var(--text-primary)', fontSize: 19, margin: '6px 0 0' }}>{selected.subject}</h2></div><button type="button" aria-label="Close" onClick={() => setSelected(null)} style={buttonStyle}><X size={15} /></button></header>
          <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
            <h3 style={subheading}>Issue details</h3><div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 8 }}>{display(selected.category)} · {display(selected.priority)} priority</div><p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6 }}>{selected.description}</p>
            {!!selected.attachments?.length && <section style={{ padding: '12px 0', borderTop: '1px solid var(--border-subtle)' }}><h3 style={subheading}>Attachments</h3><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{selected.attachments.map((file) => <a key={file.id} href={file.url} target="_blank" rel="noreferrer"><img src={file.url} alt={file.fileName} style={{ width: 92, height: 70, objectFit: 'cover', borderRadius: 6 }} /></a>)}</div></section>}
            <section style={{ padding: '14px 0', borderTop: '1px solid var(--border-subtle)' }}><h3 style={subheading}>Operational activity</h3>{[...(selected.activities ?? []).map((item) => ({ id: item.id, text: item.description, createdAt: item.createdAt, internal: item.visibility === 'INTERNAL' })), ...(selected.comments ?? []).map((item) => ({ id: item.id, text: item.message, createdAt: item.createdAt, internal: item.visibility === 'INTERNAL' }))].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((item) => <div key={item.id} style={{ display: 'flex', gap: 8, padding: '6px 0' }}><span style={{ color: item.internal ? '#9a6400' : '#5d3ab6' }}>{item.internal ? <Shield size={13} /> : <MessageSquareText size={13} />}</span><div><div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{item.text} {item.internal && <b style={{ color: '#9a6400' }}>· Internal</b>}</div><div style={{ color: 'var(--text-muted)', fontSize: 9, marginTop: 3 }}>{new Date(item.createdAt).toLocaleString()}</div></div></div>)}</section>
            <section style={{ padding: '14px 0', borderTop: '1px solid var(--border-subtle)' }}><h3 style={subheading}>Progress and resolution</h3><label style={smallLabel}>Update status</label><select value={status} onChange={(event) => setStatus(event.target.value as OpsSupportTicketStatus)} style={inputStyle}>{STATUSES.filter((value) => value !== 'ASSIGNED' || selected.status === 'ASSIGNED').map((value) => <option key={value} value={value}>{display(value)}</option>)}</select>{status === 'RESOLVED' && <textarea maxLength={1000} rows={3} value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="Resolution details (required for resolving)" style={{ ...inputStyle, marginTop: 8, resize: 'vertical' }} />}<button type="button" disabled={saving || status === selected.status || (status === 'RESOLVED' && !resolution.trim())} onClick={() => void saveStatus()} style={{ ...primaryStyle, marginTop: 8 }}>Save progress</button></section>
            <form onSubmit={sendUpdate} style={{ padding: '14px 0', borderTop: '1px solid var(--border-subtle)' }}><h3 style={{ ...subheading, display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={13} /> Internal update to Admin</h3><textarea maxLength={1000} value={updateText} onChange={(event) => setUpdateText(event.target.value)} rows={3} placeholder="Operational progress or notes (visible to Admin/OPS only)" style={{ ...inputStyle, resize: 'vertical' }} /><button disabled={saving || !updateText.trim()} type="submit" style={{ ...primaryStyle, marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Send size={13} /> Send update</button></form>
          </div>
        </aside>
      </div>}
    </div>
  );
}

const subheading: React.CSSProperties = { color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, margin: '0 0 9px' };
const smallLabel: React.CSSProperties = { display: 'block', marginBottom: 4, color: 'var(--text-muted)', fontSize: 10 };

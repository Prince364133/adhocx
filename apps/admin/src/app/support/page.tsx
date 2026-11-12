'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Eye, Headphones, MessageSquareText, Search, Send, Shield, X } from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import type { CorporateSupportTicket, CorporateTicketPriority, CorporateTicketStatus, UserListItem } from '../../lib/api/types';

const STATUSES: CorporateTicketStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CORPORATE', 'RESOLVED', 'CLOSED', 'REOPENED'];
const PRIORITIES: CorporateTicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const CATEGORIES = ['TECHNICAL_ISSUE', 'EMPLOYEE_MANAGEMENT', 'ROUTE_MANAGEMENT', 'TRANSPORT_OPERATIONS', 'BILLING_PAYMENTS', 'ACCOUNT_ACCESS', 'GENERAL_SUPPORT', 'OTHER'];
const TEAMS = ['OPS', 'SUPPORT', 'BILLING', 'TECHNICAL', 'TRANSPORT'];
const PAGE_SIZE = 10;

const inputStyle: React.CSSProperties = { minHeight: 38, width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, boxSizing: 'border-box' };
const buttonStyle: React.CSSProperties = { minHeight: 34, padding: '0 11px', borderRadius: 7, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const primaryStyle: React.CSSProperties = { ...buttonStyle, border: 0, background: '#5d3ab6', color: '#fff' };

function display(value?: string | null) {
  return value ? value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : '—';
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function Badge({ status }: { status: string }) {
  const color = ['RESOLVED', 'CLOSED'].includes(status) ? '#27784a' : status === 'WAITING_FOR_CORPORATE' ? '#9a6400' : ['OPEN', 'REOPENED'].includes(status) ? '#5d5a66' : '#5d3ab6';
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 5, background: `${color}12`, color, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}><span style={{ width: 6, height: 6, borderRadius: 9, background: 'currentColor' }} />{display(status)}</span>;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<CorporateSupportTicket[]>([]);
  const [summary, setSummary] = useState<{ total: number; open: number; unassigned: number; inProgress: number; waitingForCorporate: number; resolved: number; closed: number } | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CorporateSupportTicket | null>(null);
  const [team, setTeam] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<CorporateTicketPriority>('MEDIUM');
  const [status, setStatus] = useState<CorporateTicketStatus>('OPEN');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [response, setResponse] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [savingAction, setSavingAction] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [result, counts] = await Promise.all([
        adminApi.listCorporateSupportTickets({ limit: 200 }),
        adminApi.getCorporateSupportTicketSummary(),
      ]);
      setTickets(Array.isArray(result) ? result : []);
      setSummary(counts);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load support tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
    const timer = window.setInterval(() => void loadTickets(), 30000);
    void Promise.all([
      adminApi.getUsers({ role: 'ADMIN', status: 'ACTIVE', limit: 100 }),
      adminApi.getUsers({ role: 'OPS', status: 'ACTIVE', limit: 100 }),
    ]).then(([admins, ops]) => setUsers([...admins, ...ops].filter((user) => ['ADMIN', 'OPS'].includes(user.role)))).catch(() => setUsers([]));
    return () => window.clearInterval(timer);
  }, [loadTickets]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesSearch = !needle || [ticket.ticketNumber, ticket.subject, ticket.tenant?.name, ticket.employee?.fullName, ticket.description]
        .some((value) => value?.toLowerCase().includes(needle));
      const created = new Date(ticket.createdAt).getTime();
      return matchesSearch
        && (!statusFilter || ticket.status === statusFilter)
        && (!priorityFilter || ticket.priority === priorityFilter)
        && (!categoryFilter || ticket.category === categoryFilter)
        && (!fromDate || created >= new Date(`${fromDate}T00:00:00`).getTime())
        && (!toDate || created <= new Date(`${toDate}T23:59:59`).getTime());
    });
  }, [tickets, query, statusFilter, priorityFilter, categoryFilter, fromDate, toDate]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [query, statusFilter, priorityFilter, categoryFilter, fromDate, toDate]);

  const metrics = useMemo(() => ({
    total: summary?.total ?? tickets.length,
    open: summary?.open ?? tickets.filter((ticket) => ['OPEN', 'REOPENED'].includes(ticket.status)).length,
    unassigned: summary?.unassigned ?? tickets.filter((ticket) => !ticket.assignedTeam && !ticket.assignedToUserId).length,
    progress: summary?.inProgress ?? tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
    waiting: summary?.waitingForCorporate ?? tickets.filter((ticket) => ticket.status === 'WAITING_FOR_CORPORATE').length,
    resolved: summary?.resolved ?? tickets.filter((ticket) => ticket.status === 'RESOLVED').length,
    closed: summary?.closed ?? tickets.filter((ticket) => ticket.status === 'CLOSED').length,
  }), [tickets, summary]);

  const openDetails = async (ticket: CorporateSupportTicket) => {
    try {
      const detail = await adminApi.getCorporateSupportTicket(ticket.id);
      setSelected(detail);
      setTeam(detail.assignedTeam || '');
      setAssignee(detail.assignedToUserId || '');
      setPriority(detail.priority);
      setStatus(detail.status);
      setResolutionNotes(detail.resolutionNotes || '');
      setResponse('');
      setInternalNote('');
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Unable to load ticket details.');
    }
  };

  const refreshSelected = async (ticketId: string) => {
    const detail = await adminApi.getCorporateSupportTicket(ticketId);
    setSelected(detail);
    await loadTickets();
  };

  const saveAssignment = async () => {
    if (!selected) return;
    setAssignmentSaving(true);
    try {
      await adminApi.assignCorporateSupportTicket(selected.id, { team: team || null, userId: assignee || null });
      setNotice('Ticket assignment updated.');
      await refreshSelected(selected.id);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Unable to update assignment.');
    } finally {
      setAssignmentSaving(false);
    }
  };

  const savePriority = async () => {
    if (!selected) return;
    setSavingAction(true);
    try {
      await adminApi.updateCorporateSupportTicketPriority(selected.id, priority);
      setNotice('Ticket priority updated.');
      await refreshSelected(selected.id);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Unable to update priority.');
    } finally {
      setSavingAction(false);
    }
  };

  const saveStatus = async () => {
    if (!selected) return;
    setSavingAction(true);
    try {
      await adminApi.updateCorporateSupportTicketStatus(selected.id, status, status === 'RESOLVED' ? resolutionNotes : undefined);
      setNotice(`Ticket status changed to ${display(status)}.`);
      await refreshSelected(selected.id);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Status change was not allowed.');
    } finally {
      setSavingAction(false);
    }
  };

  const submitMessage = async (kind: 'public' | 'internal') => {
    if (!selected) return;
    const message = kind === 'public' ? response.trim() : internalNote.trim();
    if (!message) return;
    setSavingAction(true);
    try {
      if (kind === 'public') await adminApi.addCorporateSupportComment(selected.id, message);
      else await adminApi.addCorporateSupportInternalNote(selected.id, message);
      setNotice(kind === 'public' ? 'Public response sent.' : 'Internal note added.');
      if (kind === 'public') setResponse('');
      else setInternalNote('');
      await refreshSelected(selected.id);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : 'Unable to save ticket update.');
    } finally {
      setSavingAction(false);
    }
  };

  const resetFilters = () => {
    setQuery('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setFromDate('');
    setToDate('');
  };

  const cards = [
    { title: 'Total Tickets', value: metrics.total, icon: <Headphones size={17} />, color: '#5d3ab6' },
    { title: 'Open Tickets', value: metrics.open, icon: <AlertCircle size={17} />, color: '#a76a0b' },
    { title: 'Unassigned', value: metrics.unassigned, icon: <Clock3 size={17} />, color: '#b04a3f' },
    { title: 'In Progress', value: metrics.progress, icon: <Clock3 size={17} />, color: '#5d3ab6' },
    { title: 'Waiting for Corporate', value: metrics.waiting, icon: <MessageSquareText size={17} />, color: '#9a6400' },
    { title: 'Resolved', value: metrics.resolved, icon: <CheckCircle2 size={17} />, color: '#27784a' },
    { title: 'Closed', value: metrics.closed, icon: <CheckCircle2 size={17} />, color: '#64748b' },
  ];

  return (
    <div style={{ maxWidth: 1500, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div><h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.4rem', fontWeight: 750 }}>Corporate Support</h1><p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Manage tenant tickets, assignments, responses, and operational updates.</p></div>
        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Shared queue · auto-refreshes every 30 seconds</span>
      </header>
      {notice && <div role="status" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 7, background: '#f1effb', color: '#523697', fontSize: 12 }}>{notice}<button type="button" aria-label="Dismiss" onClick={() => setNotice('')} style={{ border: 0, background: 'none', color: 'inherit', cursor: 'pointer' }}><X size={14} /></button></div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {cards.map((card) => <article key={card.title} style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-surface)', padding: '13px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{card.title}</div><div style={{ marginTop: 6, color: 'var(--text-primary)', fontSize: 22, fontWeight: 700 }}>{card.value}</div></div><span style={{ color: card.color }}>{card.icon}</span></article>)}
      </div>
      <section style={{ border: '1px solid var(--border-subtle)', borderRadius: 9, background: 'var(--bg-surface)', overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><h2 style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)' }}>Ticket queue</h2><button type="button" onClick={() => void loadTickets()} style={buttonStyle}>Refresh</button></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 8 }}>
            <label style={{ position: 'relative' }}><Search size={14} style={{ position: 'absolute', top: 12, left: 9, color: 'var(--text-muted)' }} /><input aria-label="Search tickets" placeholder="Search ticket, company, employee…" value={query} onChange={(event) => setQuery(event.target.value)} style={{ ...inputStyle, paddingLeft: 29 }} /></label>
            <select aria-label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={inputStyle}><option value="">All statuses</option>{STATUSES.map((value) => <option key={value} value={value}>{display(value)}</option>)}</select>
            <select aria-label="Priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} style={inputStyle}><option value="">All priorities</option>{PRIORITIES.map((value) => <option key={value} value={value}>{display(value)}</option>)}</select>
            <select aria-label="Category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} style={inputStyle}><option value="">All categories</option>{CATEGORIES.map((value) => <option key={value} value={value}>{display(value)}</option>)}</select>
            <input aria-label="Created from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} style={inputStyle} />
            <div style={{ display: 'flex', gap: 7 }}><input aria-label="Created to" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} style={inputStyle} /><button type="button" onClick={resetFilters} title="Clear filters" style={buttonStyle}>Clear</button></div>
          </div>
        </div>
        {error ? <div role="alert" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}><p>{error}</p><button type="button" onClick={() => void loadTickets()} style={primaryStyle}>Retry</button></div>
          : loading ? <div style={{ padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>Loading ticket queue…</div>
            : currentPage.length === 0 ? <div style={{ padding: 42, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No tickets match the selected filters.</div>
              : <div style={{ overflowX: 'auto' }}><table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1120, textAlign: 'left' }}>
                <thead><tr style={{ background: 'var(--bg-surface-muted)', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{['Ticket ID', 'Company / Tenant', 'Raised By', 'Title & Category', 'Priority', 'Created', 'Assigned Team / Person', 'Status', ''].map((head) => <th key={head} style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontWeight: 700 }}>{head}</th>)}</tr></thead>
                <tbody>{currentPage.map((ticket) => <tr key={ticket.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px', color: '#5d3ab6', fontSize: 11, fontWeight: 700 }}>{ticket.ticketNumber}</td>
                  <td style={{ padding: '12px', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}>{ticket.tenant?.name || ticket.tenantId}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: 12 }}>{ticket.employee?.fullName || '—'}</td>
                  <td style={{ padding: '12px', maxWidth: 250 }}><div style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</div><div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 3 }}>{display(ticket.category)}</div></td>
                  <td style={{ padding: '12px', color: ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH' ? '#a13f38' : 'var(--text-secondary)', fontSize: 11, fontWeight: 650 }}>{display(ticket.priority)}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>{dateLabel(ticket.createdAt)}</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: 11 }}>{ticket.assignedTeam || 'Unassigned'}{ticket.assignedToUserId ? <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{users.find((user) => user.id === ticket.assignedToUserId)?.fullName || ticket.assignedToUserId}</div> : null}</td>
                  <td style={{ padding: '12px' }}><Badge status={ticket.status} /></td>
                  <td style={{ padding: '12px' }}><button type="button" title="View ticket" aria-label={`View ${ticket.ticketNumber}`} onClick={() => void openDetails(ticket)} style={{ ...buttonStyle, display: 'inline-flex', alignItems: 'center', padding: 7 }}><Eye size={14} /></button></td>
                </tr>)}</tbody>
              </table></div>}
        {!loading && !error && filtered.length > 0 && <footer style={{ padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: 11 }}><span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} tickets</span><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span>Page {page} of {pageCount}</span><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} style={buttonStyle}>Previous</button><button type="button" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)} style={buttonStyle}>Next</button></div></footer>}
      </section>

      {selected && <div onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end', background: 'rgba(15,23,42,.4)' }}>
        <aside role="dialog" aria-modal="true" aria-labelledby="admin-ticket-title" style={{ width: 'min(650px, 100vw)', height: '100%', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', boxShadow: '-12px 0 34px rgba(0,0,0,.12)' }}>
          <header style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', gap: 14 }}><div><div style={{ color: '#5d3ab6', fontSize: 10, letterSpacing: '.08em', fontWeight: 700 }}>{selected.ticketNumber} · {selected.tenant?.name || selected.tenantId}</div><h2 id="admin-ticket-title" style={{ color: 'var(--text-primary)', fontSize: 19, margin: '6px 0 8px' }}>{selected.subject}</h2><Badge status={selected.status} /></div><button type="button" aria-label="Close" onClick={() => setSelected(null)} style={{ ...buttonStyle, padding: 6, minHeight: 30 }}><X size={16} /></button></header>
          <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
            <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}><div style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>DESCRIPTION</div><p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6, margin: 0 }}>{selected.description}</p></div>
            {!!selected.attachments?.length && <div style={{ padding: '15px 0', borderBottom: '1px solid var(--border-subtle)' }}><h3 style={subheading}>Attachments</h3><div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>{selected.attachments.map((file) => <a key={file.id} href={file.url} target="_blank" rel="noreferrer"><img src={file.url} alt={file.fileName} style={{ width: 90, height: 70, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-subtle)' }} /></a>)}</div></div>}
            <section style={{ padding: '15px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={subheading}>Assignment</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><select aria-label="Assigned team" value={team} onChange={(event) => setTeam(event.target.value)} style={inputStyle}><option value="">Unassigned team</option>{TEAMS.map((value) => <option key={value} value={value}>{value}</option>)}</select><select aria-label="Assigned person" value={assignee} onChange={(event) => setAssignee(event.target.value)} style={inputStyle}><option value="">No assigned person</option>{users.map((user) => <option key={user.id} value={user.id}>{user.fullName} · {user.role}</option>)}</select></div>
              <button type="button" disabled={assignmentSaving} onClick={() => void saveAssignment()} style={{ ...primaryStyle, marginTop: 8 }}>{assignmentSaving ? 'Saving…' : 'Save assignment'}</button>
            </section>
            <section style={{ padding: '15px 0', borderBottom: '1px solid var(--border-subtle)' }}><h3 style={subheading}>Priority and status</h3><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><div><label style={smallLabel}>Priority</label><select value={priority} onChange={(event) => setPriority(event.target.value as CorporateTicketPriority)} style={inputStyle}>{PRIORITIES.map((value) => <option key={value} value={value}>{display(value)}</option>)}</select><button type="button" disabled={savingAction} onClick={() => void savePriority()} style={{ ...buttonStyle, marginTop: 7 }}>Update priority</button></div><div><label style={smallLabel}>Status</label><select value={status} onChange={(event) => setStatus(event.target.value as CorporateTicketStatus)} style={inputStyle}>{STATUSES.map((value) => <option key={value} value={value}>{display(value)}</option>)}</select><button type="button" disabled={savingAction || (status === 'RESOLVED' && !resolutionNotes.trim()) || status === selected.status} onClick={() => void saveStatus()} style={{ ...buttonStyle, marginTop: 7 }}>Update status</button></div></div>{status === 'RESOLVED' && <textarea maxLength={1000} rows={3} value={resolutionNotes} onChange={(event) => setResolutionNotes(event.target.value)} placeholder="Resolution details (required)" style={{ ...inputStyle, marginTop: 9, resize: 'vertical' }} />}</section>
            <section style={{ padding: '15px 0', borderBottom: '1px solid var(--border-subtle)' }}><h3 style={subheading}>Activity timeline</h3>{[...(selected.activities ?? []).map((item) => ({ id: item.id, text: item.description, createdAt: item.createdAt, internal: item.visibility === 'INTERNAL' })), ...(selected.comments ?? []).map((item) => ({ id: item.id, text: item.message, createdAt: item.createdAt, internal: item.visibility === 'INTERNAL' }))].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((item) => <div key={item.id} style={{ display: 'flex', gap: 8, padding: '6px 0' }}><span style={{ color: item.internal ? '#9b6500' : '#5d3ab6' }}>{item.internal ? <Shield size={13} /> : <MessageSquareText size={13} />}</span><div><div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{item.text} {item.internal && <b style={{ color: '#9b6500' }}>· Internal</b>}</div><div style={{ color: 'var(--text-muted)', fontSize: 9, marginTop: 3 }}>{dateLabel(item.createdAt)}</div></div></div>)}{selected.resolutionNotes && <p style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Resolution: {selected.resolutionNotes}</p>}</section>
            <section style={{ padding: '15px 0' }}><h3 style={subheading}>Public response</h3><textarea maxLength={1000} rows={3} value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Visible to the corporate requester (1,000 characters max)" style={{ ...inputStyle, resize: 'vertical' }} /><button type="button" disabled={savingAction || !response.trim()} onClick={() => void submitMessage('public')} style={{ ...primaryStyle, marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Send size={13} /> Send response</button></section>
            <section style={{ padding: '14px 0', borderTop: '1px solid var(--border-subtle)' }}><h3 style={{ ...subheading, display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={13} /> Internal note <span style={{ color: '#9b6500', fontSize: 9, fontWeight: 500 }}>Admin/OPS only</span></h3><textarea maxLength={1000} rows={3} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} placeholder="Private note for authorized staff only" style={{ ...inputStyle, resize: 'vertical' }} /><button type="button" disabled={savingAction || !internalNote.trim()} onClick={() => void submitMessage('internal')} style={{ ...buttonStyle, marginTop: 7 }}>Add internal note</button></section>
          </div>
        </aside>
      </div>}
    </div>
  );
}

const subheading: React.CSSProperties = { margin: '0 0 9px', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700 };
const smallLabel: React.CSSProperties = { display: 'block', marginBottom: 4, color: 'var(--text-muted)', fontSize: 10 };

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Car,
  User,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  XCircle,
  FileText,
  History,
  Route,
  ArrowRight,
} from 'lucide-react';
import { tripsApi } from '../../../lib/api/corporate';
import type { BookingRequestItem } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

function BookingDetailsContent() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId;

  const searchParams = useSearchParams();
  const bookingId = searchParams.get('id');

  const [booking, setBooking] = useState<BookingRequestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!activeTenantId) {
      setBooking(null);
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setBooking(null);
    tripsApi
      .requests({ tenantId: activeTenantId })
      .then((res) => {
        const items = res?.items || [];
        const match = bookingId ? items.find((item) => item.id === bookingId) : items[0];
        setBooking(match ?? null);
      })
      .catch((err) => {
        console.warn('Failed to load booking details:', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load booking details.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeTenantId, bookingId]);

  const handleCancel = async () => {
    if (!activeTenantId || !booking?.employee?.id) {
      setActionError('This booking is missing the employee record required to cancel it.');
      return;
    }
    if (!window.confirm(`Cancel request ${booking.id.slice(0, 8)}?`)) return;

    setCancelling(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await tripsApi.rescheduleOrCancel(booking.id, {
        employeeId: booking.employee.id,
        action: 'CANCEL',
      });
      setActionMessage('Cancellation request submitted.');
      try {
        const refreshed = await tripsApi.requests({ tenantId: activeTenantId });
        const updatedBooking = refreshed.items.find((item) => item.id === booking.id);
        if (updatedBooking) setBooking(updatedBooking);
      } catch (err) {
        setActionError(
          `Cancellation was submitted, but the booking status could not be refreshed: ${
            err instanceof Error ? err.message : 'unknown error'
          }`,
        );
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel booking request.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="surface-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading booking details...
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="surface-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
        {loadError ? <span role="alert">{loadError}</span> : 'Booking request not found.'}
      </div>
    );
  }

  const empName = booking.employee?.fullName || '—';
  const empCode = booking.employee?.employeeCode || '—';
  const officeName = booking.roster?.office?.name || '—';
  const reqShortId = booking.id.slice(0, 8);
  const initials = empName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Booking Details — {reqShortId}
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: booking.status === 'COMPLETED' ? 'var(--color-success-bg)' : 'var(--color-blue-bg)',
                color: booking.status === 'COMPLETED' ? 'var(--color-success)' : 'var(--brand-primary)',
                border: '1px solid currentColor',
              }}
            >
              {booking.status}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Complete booking request and vehicle allocation details
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => void handleCancel()}
            disabled={cancelling || Boolean(actionMessage) || booking.status === 'CANCELLED'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--color-danger-bg)',
              color: '#DC2626',
              border: '1px solid var(--color-danger-border)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: cancelling || actionMessage || booking.status === 'CANCELLED' ? 'not-allowed' : 'pointer',
            }}
          >
            <XCircle size={14} />
            <span>{cancelling ? 'Cancelling…' : booking.status === 'CANCELLED' ? 'Cancelled' : 'Cancel Request'}</span>
          </button>
        </div>
      </div>
      {(actionError || actionMessage) && (
        <div
          role={actionError ? 'alert' : 'status'}
          className="surface-card"
          style={{ padding: 12, color: actionError ? '#B91C1C' : '#15803D' }}
        >
          {actionError || actionMessage}
        </div>
      )}

      {/* Main 2-Column Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Left: Employee Profile & Booking Request Info */}
        <div className="surface-card" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: 'var(--brand-action)', color: '#FFFFFF', fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{empName}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{empCode}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Destination Office</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{officeName}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Assigned Shift</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{booking.scheduledDate} {booking.shiftTime}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Direction</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', backgroundColor: 'var(--color-blue-bg)', padding: '2px 8px', borderRadius: 4 }}>
                {booking.direction === 'LOGIN' ? 'Login Pickup' : 'Logout Drop'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Department</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {booking.employee?.department || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Trip Assignment & Live Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="surface-card" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Fulfillment Status
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {booking.status}
              </span>
            </div>

            {/* Progress Step Bar */}
            <div style={{ backgroundColor: 'var(--bg-surface-muted)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Request Logged</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>System Processed</div>
                  </div>
                </div>

                <div style={{ height: 2, flex: 1, backgroundColor: 'var(--brand-action)', margin: '0 12px' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--color-blue-bg)', color: 'var(--brand-action)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Car size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-primary)' }}>Routed</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Vehicle Assigned</div>
                  </div>
                </div>

                <div style={{ height: 2, flex: 1, backgroundColor: 'var(--border-color)', margin: '0 12px' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                    <MapPin size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{officeName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Destination</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingDetailsPage() {
  return (
    <Suspense fallback={<div className="surface-card" style={{ padding: 40, textAlign: 'center' }}>Loading booking details...</div>}>
      <BookingDetailsContent />
    </Suspense>
  );
}

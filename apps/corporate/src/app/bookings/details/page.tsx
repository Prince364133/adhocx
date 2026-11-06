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
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const searchParams = useSearchParams();
  const bookingId = searchParams.get('id');

  const [booking, setBooking] = useState<BookingRequestItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    tripsApi
      .requests({ tenantId: activeTenantId })
      .then((res) => {
        const items = res?.items || [];
        if (items.length > 0) {
          const match = bookingId ? items.find((i) => i.id === bookingId) : null;
          setBooking(match || items[0]);
        }
      })
      .catch((err) => {
        console.warn('Failed to load booking details:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeTenantId, bookingId]);

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
        Booking request not found.
      </div>
    );
  }

  const empName = booking.employee?.fullName || 'Enterprise Employee';
  const empCode = booking.employee?.employeeCode || '—';
  const officeName = booking.roster?.office?.name || 'Main Campus';
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
                backgroundColor: booking.status === 'COMPLETED' ? '#DCFCE7' : '#EFF6FF',
                color: booking.status === 'COMPLETED' ? '#16A34A' : '#5728B2',
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
            onClick={() => alert(`Cancel request for ${reqShortId}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              border: '1px solid #FCA5A5',
              borderRadius: 'var(--radius-md)',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <XCircle size={14} />
            <span>Cancel Request</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Left: Employee Profile & Booking Request Info */}
        <div className="surface-card" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#5728B2', color: '#FFFFFF', fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#5728B2', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: 4 }}>
                {booking.direction === 'LOGIN' ? 'Login Pickup' : 'Logout Drop'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Department</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {booking.employee?.department || 'Operations'}
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
              <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {booking.status}
              </span>
            </div>

            {/* Progress Step Bar */}
            <div style={{ backgroundColor: 'var(--bg-surface-muted)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Request Logged</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>System Processed</div>
                  </div>
                </div>

                <div style={{ height: 2, flex: 1, backgroundColor: '#5728B2', margin: '0 12px' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Car size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#5728B2' }}>Routed</div>
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

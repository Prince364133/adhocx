'use client';

import React, { useState } from 'react';
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
import { MiniLiveMap } from '../../../components/maps/MiniLiveMap';

export default function BookingDetailsPage() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'related'>('timeline');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
              Booking Details — REQ-78654
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: '#DCFCE7',
                color: '#16A34A',
                border: '1px solid #86EFAC',
              }}
            >
              Confirmed
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Complete booking information and trip assignment details
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => alert('Editing booking')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#EFF6FF',
              color: '#5728B2',
              border: '1px solid #BFDBFE',
              borderRadius: 'var(--radius-md)',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Edit2 size={14} />
            <span>Edit Request</span>
          </button>
          <button
            onClick={() => alert('Cancel request confirmation')}
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
        <div className="surface-card" style={{ padding: '24px', backgroundColor: '#FFFFFF', flex: '1 1 35%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#1E293B', color: '#FFFFFF', fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              PS
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Priya Sharma</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>EMP02467 · Product Team</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Destination Office</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>HiTEC City</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Assigned Shift</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>General (08:00 AM - 05:00 PM)</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Request Type</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#5728B2', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: 4 }}>
                Roster (Auto)
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Requested On</span>
              <span style={{ fontSize: '12px', color: '#475569' }}>08 Dec 2026, 10:24 AM</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Pickup Nodal Address</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', maxWidth: 180, textAlign: 'right' }}>
                Kondapur, Bus Stop Near Metro
              </span>
            </div>
          </div>
        </div>

        {/* Right: Trip Assignment & Live Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '1 1 65%' }}>
          <div className="surface-card" style={{ padding: '24px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Trip Assignment
              </h3>
              <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="pulse-green" />
                Live In Transit
              </span>
            </div>

            {/* Cab, Driver, Route details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '18px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Assigned Cab</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#5728B2' }}>TS09UB7845</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Driver</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Suresh R</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Vehicle Model</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Maruti Ertiga</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Route Corridor</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Kondapur → HiTEC City</div>
              </div>
            </div>

            {/* Progress Step Bar */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>07:42 AM</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Boarded</div>
                  </div>
                </div>

                <div style={{ height: 2, flex: 1, backgroundColor: '#5728B2', margin: '0 12px' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Car size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#5728B2' }}>In Transit</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>ETA 08:35 AM</div>
                  </div>
                </div>

                <div style={{ height: 2, flex: 1, backgroundColor: '#CBD5E1', margin: '0 12px' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>HiTEC Office</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>ETA 08:50 AM</div>
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


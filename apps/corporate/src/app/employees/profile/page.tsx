'use client';

import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  MapPin,
  Calendar,
  Car,
  Clock,
  Edit2,
  MoreVertical,
  CheckCircle2,
  FileText,
  Activity,
  History,
  ShieldCheck,
} from 'lucide-react';
import { MiniLiveMap } from '../../../components/maps/MiniLiveMap';

export default function EmployeeProfilePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'transport' | 'history' | 'roster' | 'documents' | 'activity'>('overview');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Employee Profile
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Complete employee information, transport details and trip history
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => alert('Editing profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#1167EE',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(17,103,238,0.25)',
            }}
          >
            <Edit2 size={14} />
            <span>Edit Profile</span>
          </button>
          <button
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <MoreVertical size={16} color="#64748B" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Profile Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Left Column: User Card & Sub-navigation Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '1 1 28%' }}>
          {/* User ID Card */}
          <div className="surface-card" style={{ padding: '24px', textAlign: 'center', backgroundColor: '#FFFFFF' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                backgroundColor: '#1E293B',
                color: '#FFFFFF',
                fontSize: '24px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}
            >
              PS
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
              Priya Sharma
            </h2>
            <div style={{ marginTop: '4px', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  border: '1px solid #86EFAC',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                }}
              >
                Transport Eligible
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>EMP02467</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Product Team · HiTEC City</div>
          </div>

          {/* Subnav Tabs Menu */}
          <div className="surface-card" style={{ padding: '8px', backgroundColor: '#FFFFFF' }}>
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: activeTab === 'overview' ? '#EFF6FF' : 'transparent',
                color: activeTab === 'overview' ? '#1167EE' : '#475569',
                fontSize: '13px',
                fontWeight: activeTab === 'overview' ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <User size={16} />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('transport')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: activeTab === 'transport' ? '#EFF6FF' : 'transparent',
                color: activeTab === 'transport' ? '#1167EE' : '#475569',
                fontSize: '13px',
                fontWeight: activeTab === 'transport' ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Car size={16} />
              <span>Transport Details</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: activeTab === 'history' ? '#EFF6FF' : 'transparent',
                color: activeTab === 'history' ? '#1167EE' : '#475569',
                fontSize: '13px',
                fontWeight: activeTab === 'history' ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <History size={16} />
              <span>Trip History</span>
            </button>

            <button
              onClick={() => setActiveTab('roster')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: activeTab === 'roster' ? '#EFF6FF' : 'transparent',
                color: activeTab === 'roster' ? '#1167EE' : '#475569',
                fontSize: '13px',
                fontWeight: activeTab === 'roster' ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Calendar size={16} />
              <span>Roster & Shifts</span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: activeTab === 'documents' ? '#EFF6FF' : 'transparent',
                color: activeTab === 'documents' ? '#1167EE' : '#475569',
                fontSize: '13px',
                fontWeight: activeTab === 'documents' ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <FileText size={16} />
              <span>Documents</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: activeTab === 'activity' ? '#EFF6FF' : 'transparent',
                color: activeTab === 'activity' ? '#1167EE' : '#475569',
                fontSize: '13px',
                fontWeight: activeTab === 'activity' ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Activity size={16} />
              <span>Activity Log</span>
            </button>
          </div>
        </div>

        {/* Right Main Content: Information Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '1 1 70%' }}>
          {/* Card 1: Basic Information */}
          <div className="surface-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
              Basic Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#1167EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Employee ID</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>EMP02467</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#1167EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Work Email</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>priya.sharma@hitec.com</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#1167EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Phone</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>+91 98765 43210</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#1167EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Department</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Product</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#1167EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Office / Building</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>HiTEC City</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#1167EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Employment Type</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Full-Time</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Transport Information & Geo Mini Map */}
          <div className="surface-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
              Transport Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Eligibility Status</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#16A34A', marginTop: '2px' }}>
                    Eligible (Compliant with Corporate Cab Policy)
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Geocoded Pickup Location</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    Kondapur, Bus Stop Near Metro
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Lat: 17.4699, Lng: 78.3578</div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Geocoded Drop Location</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    HiTEC Office, Main Gate
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Lat: 17.4474, Lng: 78.3762</div>
                </div>
              </div>

              {/* Mini Map */}
              <div style={{ height: 160, borderRadius: 8, overflow: 'hidden' }}>
                <MiniLiveMap
                  height={160}
                  activeVehiclePlate="Kondapur Pickup"
                  activeEta="Assigned Node"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Current Assignment */}
          <div className="surface-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
              Current Assignment
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Active Shift</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                  Login (8:00 AM)
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Active Roster</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                  Week 50 (Dec 08 - Dec 14)
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Today&apos;s Trip</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1167EE', marginTop: '2px' }}>
                  TS09UB7845 (Pickup 7:42 AM)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


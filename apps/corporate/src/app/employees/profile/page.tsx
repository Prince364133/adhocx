'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { employeeApi } from '../../../lib/api/corporate';
import type { CorporateEmployee } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

function EmployeeProfileContent() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const searchParams = useSearchParams();
  const employeeId = searchParams.get('id');

  const [employee, setEmployee] = useState<CorporateEmployee | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'transport' | 'history' | 'roster' | 'documents' | 'activity'>('overview');

  useEffect(() => {
    setLoading(true);
    const fetchEmployee = async () => {
      try {
        let emp: CorporateEmployee | null = null;
        if (employeeId) {
          emp = await employeeApi.get(activeTenantId, employeeId);
        } else {
          const listRes = await employeeApi.list(activeTenantId, { limit: 1 });
          const items = listRes?.items || (listRes as any)?.data || [];
          if (items.length > 0) {
            emp = items[0];
          }
        }
        setEmployee(emp);

        if (emp?.id) {
          const reqs = await employeeApi.requests(activeTenantId, emp.id).catch(() => []);
          setRequests(reqs as any[]);
        }
      } catch (err) {
        console.warn('Failed to fetch employee details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [activeTenantId, employeeId]);

  if (loading) {
    return (
      <div className="surface-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading employee profile...
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="surface-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Employee not found. Please select an employee from the directory.
      </div>
    );
  }

  const fullName = employee.fullName || 'Enterprise Employee';
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const code = employee.employeeCode || `EMP-${employee.id.slice(0, 6)}`;
  const department = typeof employee.department === 'string' ? employee.department : (employee.department as any)?.name || 'Operations';
  const officeName = employee.office?.name || 'Main Office Hub';
  const email = employee.email || '—';
  const phone = employee.phoneNumber || '—';
  const defaultLoc = employee.locations?.find((l) => l.isDefault) || employee.locations?.[0];
  const homeAddress = defaultLoc?.addressText || 'Pickup Point Configured';
  const pickupLat = defaultLoc?.latitude ? Number(defaultLoc.latitude).toFixed(4) : '17.4485';
  const pickupLng = defaultLoc?.longitude ? Number(defaultLoc.longitude).toFixed(4) : '78.3741';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Employee Profile
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Complete employee information, transport details and trip history
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => alert(`Editing profile for ${fullName}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#5728B2',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(87, 40, 178,0.25)',
            }}
          >
            <Edit2 size={14} />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Profile Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Left Column: User Card & Sub-navigation Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '1 1 28%' }}>
          {/* User ID Card */}
          <div className="surface-card" style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-surface)' }}>
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
              {initials}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {fullName}
            </h2>
            <div style={{ marginTop: '4px', marginBottom: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: employee.isActive !== false ? '#DCFCE7' : '#F1F5F9',
                  color: employee.isActive !== false ? '#16A34A' : '#64748B',
                  border: `1px solid ${employee.isActive !== false ? '#86EFAC' : '#CBD5E1'}`,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                }}
              >
                {employee.isActive !== false ? 'Transport Eligible' : 'Inactive'}
              </span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{code}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{department} · {officeName}</div>
          </div>

          {/* Subnav Tabs Menu */}
          <div className="surface-card" style={{ padding: '8px', backgroundColor: 'var(--bg-surface)' }}>
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
                color: activeTab === 'overview' ? '#5728B2' : '#475569',
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
                color: activeTab === 'transport' ? '#5728B2' : '#475569',
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
                color: activeTab === 'history' ? '#5728B2' : '#475569',
                fontSize: '13px',
                fontWeight: activeTab === 'history' ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <History size={16} />
              <span>Trip Requests ({requests.length})</span>
            </button>
          </div>
        </div>

        {/* Right Main Content: Information Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '1 1 70%' }}>
          {/* Card 1: Basic Information */}
          <div className="surface-card" style={{ padding: '20px', backgroundColor: 'var(--bg-surface)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Basic Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Employee Code</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{code}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Work Email</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Phone</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{phone}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Department</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{department}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Office / Building</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{officeName}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Gender</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {employee.gender || 'Not specified'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Transport Information & Geo Mini Map */}
          <div className="surface-card" style={{ padding: '20px', backgroundColor: 'var(--bg-surface)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Transport Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Eligibility Status</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: employee.isActive !== false ? '#16A34A' : '#64748B', marginTop: '2px' }}>
                    {employee.isActive !== false ? 'Eligible for Corporate Transport' : 'Not Eligible'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Home / Geocoded Pickup Location</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {homeAddress}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Lat: {pickupLat}, Lng: {pickupLng}</div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Assigned Office Hub</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {officeName}
                  </div>
                </div>
              </div>

              {/* Mini Map */}
              <div style={{ height: 160, borderRadius: 8, overflow: 'hidden' }}>
                <MiniLiveMap
                  height={160}
                  activeVehiclePlate={`${code} Node`}
                  activeEta="Assigned Stop"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Recent Requests / Trip History */}
          <div className="surface-card" style={{ padding: '20px', backgroundColor: 'var(--bg-surface)' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Transport Requests ({requests.length})
            </h3>

            {requests.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No active or past transport requests found for this employee.
              </div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Type</th>
                      <th>Scheduled Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r: any) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700 }}>{r.id.slice(0, 8)}</td>
                        <td>{r.type || 'COMMUTE'}</td>
                        <td>{r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString() : '—'}</td>
                        <td>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: r.status === 'SERVED' ? '#16A34A' : '#D97706',
                              backgroundColor: r.status === 'SERVED' ? '#DCFCE7' : '#FEF3C7',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeProfilePage() {
  return (
    <Suspense fallback={<div className="surface-card" style={{ padding: '40px', textAlign: 'center' }}>Loading profile...</div>}>
      <EmployeeProfileContent />
    </Suspense>
  );
}

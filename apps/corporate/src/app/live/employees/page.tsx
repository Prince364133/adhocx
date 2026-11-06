'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  User,
  Clock,
  MapPin,
  Building2,
  CheckCircle2,
  Circle,
  Car,
  Phone,
  Radio,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { FilterBar } from '../../../components/common/FilterBar';
import { MiniLiveMap } from '../../../components/maps/MiniLiveMap';
import { employeeApi, routesApi } from '../../../lib/api/corporate';
import type { CorporateEmployee, CorporateRoute } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

interface FormattedTrackedEmployee {
  id: string;
  fullName: string;
  employeeCode: string;
  department: string;
  office: string;
  shift: string;
  status: string;
  pickupLocation: string;
  dropLocation: string;
  driverName: string;
  vehicleModel: string;
  cabNumber: string;
  seatNumber: string;
  lastGpsUpdate: string;
  eta: string;
  timeline: {
    title: string;
    time: string;
    status: 'completed' | 'current' | 'pending';
    note?: string;
  }[];
}

export default function EmployeeLiveTrackingPage() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const [employees, setEmployees] = useState<CorporateEmployee[]>([]);
  const [activeRoutes, setActiveRoutes] = useState<CorporateRoute[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      employeeApi.list(activeTenantId, { limit: 50 }).catch(() => ({ items: [], total: 0 })),
      routesApi.list(activeTenantId, {}).catch(() => []),
    ])
      .then(([empRes, routes]) => {
        const empList = empRes.items || [];
        setEmployees(empList);
        setActiveRoutes(routes);
        if (empList.length > 0 && !selectedId) {
          setSelectedId(empList[0].id);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeTenantId]);

  const searchResults = employees.filter((emp) => {
    const q = searchQuery.toLowerCase();
    const name = (emp.fullName || '').toLowerCase();
    const code = (emp.employeeCode || '').toLowerCase();
    const dept = typeof emp.department === 'string' ? emp.department.toLowerCase() : ((emp.department as any)?.name || '').toLowerCase();
    return name.includes(q) || code.includes(q) || dept.includes(q);
  });

  const rawSelected = employees.find((e) => e.id === selectedId) || employees[0];

  // Map employee and matching route info
  const selectedEmployee: FormattedTrackedEmployee | null = rawSelected
    ? (() => {
        const fullName = rawSelected.fullName || 'Enterprise Employee';
        // Check if there is an active route
        const activeRoute = activeRoutes.find((r) => r.status === 'IN_PROGRESS') || activeRoutes[0];

        const isOnTrip = activeRoute && activeRoute.status === 'IN_PROGRESS';
        const status = isOnTrip ? 'In Transit' : rawSelected.status || 'Active';

        const pickup = rawSelected.locations?.find((l) => l.isDefault)?.addressText || rawSelected.locations?.[0]?.addressText || 'Pickup Point';
        const officeName = rawSelected.office?.name || 'Office Headquarters';

        return {
          id: rawSelected.id,
          fullName,
          employeeCode: rawSelected.employeeCode || 'EMP-000',
          department: rawSelected.department || 'Operations',
          office: officeName,
          shift: rawSelected.shiftSchedule || 'General Shift (09:00 - 18:00)',
          status,
          pickupLocation: pickup,
          dropLocation: officeName,
          driverName: activeRoute?.driver?.fullName || activeRoute?.driver?.name || 'Assigned Driver',
          vehicleModel: activeRoute?.vehicle?.model || 'Fleet Vehicle',
          cabNumber: activeRoute?.vehicle?.registrationNumber || activeRoute?.vehicle?.licensePlate || (activeRoute?.id ? `RT-${activeRoute.id.slice(0, 6)}` : 'CAB-001'),
          seatNumber: 'Seat 2B',
          lastGpsUpdate: 'Just now',
          eta: '12 mins',
          timeline: [
            {
              title: 'Trip Initiated',
              time: activeRoute?.actualStartTime || activeRoute?.shiftTime || '08:00 AM',
              status: 'completed',
              note: 'Cab dispatched and en route to pickup point',
            },
            {
              title: isOnTrip ? 'In Transit' : 'Scheduled Pickup',
              time: '08:20 AM',
              status: isOnTrip ? 'current' : 'pending',
              note: isOnTrip ? 'Vehicle moving towards destination' : 'Scheduled pickup time',
            },
            {
              title: 'Office Drop-off',
              time: '08:45 AM',
              status: 'pending',
              note: `Arrival at ${officeName}`,
            },
          ],
        };
      })()
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Filter Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Employee Tracking
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Search an employee and monitor their current trip, location and status
          </p>
        </div>

        <FilterBar
          showOffices={true}
          showDateRange={false}
          showTripTypes={false}
          liveStatusText="Live Location Active"
        />
      </div>

      {/* Omnisearch Bar with Quick Result Pill */}
      <div className="surface-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee by name, ID or department..."
              style={{
                width: '100%',
                height: 40,
                paddingLeft: 38,
                paddingRight: 14,
                backgroundColor: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-strong)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Search Results ({searchResults.length}):
            </span>
            {searchResults.slice(0, 4).map((emp) => {
              const name = emp.fullName || 'Enterprise Employee';
              const isSelected = selectedId === emp.id;
              return (
                <div
                  key={emp.id}
                  onClick={() => setSelectedId(emp.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: isSelected ? '#EFF6FF' : '#F1F5F9',
                    border: `1px solid ${isSelected ? '#5728B2' : '#CBD5E1'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#5728B2', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {name} ({emp.employeeCode})
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#16A34A', backgroundColor: '#DCFCE7', padding: '1px 6px', borderRadius: '4px' }}>
                    {emp.status || 'Active'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="surface-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading employee live tracking data...
        </div>
      ) : !selectedEmployee ? (
        <div className="surface-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No employees found. Add employees in the Directory to start live tracking.
        </div>
      ) : (
        <>
          {/* Selected Employee Profile Summary Ribbon */}
          <div
            className="surface-card"
            style={{
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  backgroundColor: '#1E293B',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 800,
                }}
              >
                {selectedEmployee.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selectedEmployee.fullName}
                  </h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {selectedEmployee.employeeCode}
                  </span>
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
                    {selectedEmployee.status}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {selectedEmployee.department} · {selectedEmployee.office}
                </div>
              </div>
            </div>

            {/* Pickup & Shift Metadata Chips */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Office Hub
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedEmployee.office}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Shift
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedEmployee.shift}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Pickup Point
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedEmployee.pickupLocation}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Drop Destination
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedEmployee.dropLocation}
                </div>
              </div>
            </div>
          </div>

          {/* 3-Section Live Tracking Cockpit */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Left: Trip Progress Timeline */}
            <div className="surface-card" style={{ padding: '20px', flex: '1 1 25%' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                Trip Progress
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative' }}>
                {selectedEmployee.timeline.map((step) => {
                  const isCompleted = step.status === 'completed';
                  const isCurrent = step.status === 'current';
                  return (
                    <div key={step.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: isCompleted ? '#DCFCE7' : isCurrent ? '#EFF6FF' : '#F1F5F9',
                          color: isCompleted ? '#16A34A' : isCurrent ? '#5728B2' : '#94A3B8',
                          border: `2px solid ${isCompleted ? '#16A34A' : isCurrent ? '#5728B2' : '#CBD5E1'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        {isCompleted ? <CheckCircle2 size={14} /> : <Circle size={10} fill={isCurrent ? '#5728B2' : 'none'} />}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#5728B2' : '#0F172A' }}>
                            {step.title}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {step.time}
                          </span>
                        </div>
                        {step.note && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {step.note}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Center: Live GPS Map */}
            <div className="surface-card" style={{ padding: '20px', flex: '1 1 45%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Live Commute Radar
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="pulse-green" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A' }}>
                    Streaming GPS
                  </span>
                </div>
              </div>

              <MiniLiveMap
                height={340}
                activeVehiclePlate={selectedEmployee.cabNumber}
                activeEta={selectedEmployee.eta}
              />
            </div>

            {/* Right: Assigned Driver & Cab Panel */}
            <div className="surface-card" style={{ padding: '20px', flex: '1 1 30%' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
                Trip & Vehicle Info
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Assigned Driver</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedEmployee.driverName}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#F3E8FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Car size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Vehicle Model</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {selectedEmployee.vehicleModel} ({selectedEmployee.cabNumber})
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Seat Assignment</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedEmployee.seatNumber}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Radio size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>GPS Telemetry</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#16A34A' }}>
                      Updated {selectedEmployee.lastGpsUpdate}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '6px' }}>
                  <button
                    onClick={() => alert(`Contacting driver dispatch for ${selectedEmployee.fullName}`)}
                    style={{
                      width: '100%',
                      height: 36,
                      backgroundColor: '#EFF6FF',
                      color: '#5728B2',
                      border: '1px solid #BFDBFE',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Phone size={14} />
                    <span>Contact Driver / Escalation</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

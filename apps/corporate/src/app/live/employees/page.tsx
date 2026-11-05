'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { FilterBar } from '../../../components/common/FilterBar';
import { MiniLiveMap } from '../../../components/maps/MiniLiveMap';
import { mockTrackedEmployees, TrackedEmployee } from '../../../lib/mock/corporateMockData';

export default function EmployeeLiveTrackingPage() {
  const [searchQuery, setSearchQuery] = useState('Priya Sharma');
  const [selectedEmployee, setSelectedEmployee] = useState<TrackedEmployee>(mockTrackedEmployees[0]);

  const searchResults = mockTrackedEmployees.filter((emp) =>
    emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Filter Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Employee Tracking
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
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
      <div className="surface-card" style={{ padding: '16px 20px', backgroundColor: '#FFFFFF' }}>
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
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#0F172A',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              Search Results ({searchResults.length}):
            </span>
            {searchResults.map((emp) => (
              <div
                key={emp.id}
                onClick={() => setSelectedEmployee(emp)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: selectedEmployee.id === emp.id ? '#EFF6FF' : '#F1F5F9',
                  border: `1px solid ${selectedEmployee.id === emp.id ? '#5728B2' : '#CBD5E1'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#5728B2', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                  {emp.fullName.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                  {emp.fullName} ({emp.employeeCode})
                </span>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#16A34A', backgroundColor: '#DCFCE7', padding: '1px 6px', borderRadius: '4px' }}>
                  {emp.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
          backgroundColor: '#FFFFFF',
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
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                {selectedEmployee.fullName}
              </h2>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
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
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              {selectedEmployee.department} · {selectedEmployee.office}
            </div>
          </div>
        </div>

        {/* Pickup & Shift Metadata Chips */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
              Office Hub
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
              {selectedEmployee.office}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
              Shift
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
              {selectedEmployee.shift}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
              Pickup Point
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
              {selectedEmployee.pickupLocation}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
              Drop Destination
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
              {selectedEmployee.dropLocation}
            </div>
          </div>
        </div>
      </div>

      {/* 3-Section Live Tracking Cockpit */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Left: Trip Progress Timeline */}
        <div className="surface-card" style={{ padding: '20px', flex: '1 1 25%' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
            Trip Progress
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative' }}>
            {selectedEmployee.timeline.map((step, idx) => {
              const isCompleted = step.status === 'completed';
              const isCurrent = step.status === 'current';
              return (
                <div key={step.title} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  {/* Step icon */}
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

                  {/* Step details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#5728B2' : '#0F172A' }}>
                        {step.title}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                        {step.time}
                      </span>
                    </div>
                    {step.note && (
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
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
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
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
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>
            Trip & Vehicle Info
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={18} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Assigned Driver</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{selectedEmployee.driverName}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#F3E8FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Car size={18} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Vehicle Model</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  {selectedEmployee.vehicleModel} ({selectedEmployee.cabNumber})
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Seat Assignment</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{selectedEmployee.seatNumber}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Radio size={18} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>GPS Telemetry</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#16A34A' }}>
                  Updated {selectedEmployee.lastGpsUpdate}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px', marginTop: '6px' }}>
              <button
                onClick={() => alert(`Calling emergency support for ${selectedEmployee.fullName}`)}
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
    </div>
  );
}


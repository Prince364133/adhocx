'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarClock,
  Clock,
  Users,
  Repeat,
  Plus,
  Settings,
  Edit2,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { schedulingApi } from '../../../lib/api/corporate';
import { useSession } from '../../../lib/auth/SessionContext';

interface ShiftTemplateItem {
  id: string;
  name: string;
  iconColor: string;
  type: 'Fixed' | 'Rotating';
  loginTime: string;
  logoutTime: string;
  duration: string;
  assignedEmployees: number;
  status: 'Active' | 'Inactive';
}

export default function ShiftManagementPage() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const [shifts, setShifts] = useState<ShiftTemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadShifts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await schedulingApi.shiftTemplates(activeTenantId);
      if (Array.isArray(res)) {
        setShifts(
          res.map((s, idx) => ({
            id: s.id,
            name: s.name,
            iconColor: ['#3B82F6', '#F59E0B', '#8B5CF6', '#10B981', '#06B6D4'][idx % 5],
            type: ((s as any).type === 'Rotating' ? 'Rotating' : 'Fixed') as 'Fixed' | 'Rotating',
            loginTime: s.loginTime || '09:00 AM',
            logoutTime: s.logoutTime || '06:00 PM',
            duration: (s as any).duration || '9 hr',
            assignedEmployees: (s as any).assignedEmployees || 0,
            status: s.isActive !== false ? 'Active' : 'Inactive',
          })),
        );
      } else {
        setShifts([]);
      }
    } catch (err) {
      console.warn('Failed to load shifts:', err);
      setShifts([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Buttons Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Shift Management
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Create and manage shift templates, timings and transport policies
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => loadShifts()}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => alert('New Shift Template: Connects to POST /corporate/scheduling/shift-templates')}
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
            <Plus size={16} />
            <span>Create Shift Template</span>
          </button>
        </div>
      </div>

      {/* Shift Templates List */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Active Shift Schedules ({shifts.length})
          </h2>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '10px', color: 'var(--text-secondary)' }}>
            <Loader2 size={20} className="spin" />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Loading shift templates...</span>
          </div>
        ) : shifts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            <CalendarClock size={40} color="#94A3B8" style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>No shift templates created</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 16 }}>
              Define login and logout windows for your facility to begin roster assignment.
            </p>
            <button
              onClick={() => alert('Create shift template modal')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#5728B2',
                color: '#FFFFFF',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus size={15} />
              <span>Create Shift Template</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {shifts.map((shift) => (
              <div
                key={shift.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                  flexWrap: 'wrap',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 200 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '8px',
                      backgroundColor: `${shift.iconColor}15`,
                      color: shift.iconColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Clock size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {shift.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {shift.loginTime} — {shift.logoutTime}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Shift Duration</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{shift.duration}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Assigned Headcount</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#5728B2' }}>
                      {shift.assignedEmployees > 0 ? `${shift.assignedEmployees.toLocaleString()} employees` : 'General Pool'}
                    </div>
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: shift.status === 'Active' ? '#DCFCE7' : '#F1F5F9',
                        color: shift.status === 'Active' ? '#16A34A' : '#64748B',
                        border: `1px solid ${shift.status === 'Active' ? '#86EFAC' : '#CBD5E1'}`,
                      }}
                    >
                      {shift.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => alert(`Edit shift ${shift.name}`)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-strong)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

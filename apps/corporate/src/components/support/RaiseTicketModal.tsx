'use client';

import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { supportApi, employeeApi, routesApi } from '../../lib/api/corporate';
import type { Employee, SupportTicket, RouteListItem } from '../../lib/api/types';

export interface RaiseTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onSuccess?: (ticket: SupportTicket) => void;
}

const CATEGORIES = [
  { value: 'CAB_DELAY', label: 'Cab Delay' },
  { value: 'DRIVER_BEHAVIOR', label: 'Driver Behavior / Conduct' },
  { value: 'ROUTE_ISSUE', label: 'Route Deviation / Inaccurate Stop' },
  { value: 'BILLING', label: 'Billing & Fare Dispute' },
  { value: 'LOST_ITEM', label: 'Lost & Found Item' },
  { value: 'VEHICLE_CONDITION', label: 'Vehicle Condition & Cleanliness' },
  { value: 'SAFETY_CONCERN', label: 'Safety & Security Concern' },
  { value: 'OTHER', label: 'General Operational Inquiry' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low - Informational' },
  { value: 'MEDIUM', label: 'Medium - Standard SLA' },
  { value: 'HIGH', label: 'High - Urgent Intervention' },
  { value: 'CRITICAL', label: 'Critical - Severe Safety / Blocker' },
];

export const RaiseTicketModal: React.FC<RaiseTicketModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  onSuccess,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [routes, setRoutes] = useState<RouteListItem[]>([]);

  const [employeeId, setEmployeeId] = useState('');
  const [customEmployeeId, setCustomEmployeeId] = useState('');
  const [category, setCategory] = useState('CAB_DELAY');
  const [priority, setPriority] = useState('MEDIUM');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [routeId, setRouteId] = useState('');
  const [customRouteId, setCustomRouteId] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && tenantId) {
      setEmployeesLoading(true);
      setError(null);
      employeeApi
        .list(tenantId, { limit: 100 })
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.items || [];
          setEmployees(list);
          if (list.length > 0 && !employeeId) {
            setEmployeeId(list[0].id);
          }
        })
        .catch(() => {
          setEmployees([]);
        })
        .finally(() => {
          setEmployeesLoading(false);
        });

      routesApi
        .list(tenantId, { limit: 20 })
        .then((res) => {
          const list = Array.isArray(res) ? res : [];
          setRoutes(list);
        })
        .catch(() => {
          setRoutes([]);
        });
    }
  }, [isOpen, tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalEmployeeId = employeeId === 'CUSTOM' ? customEmployeeId.trim() : employeeId;
    const finalRouteId = routeId === 'CUSTOM' ? customRouteId.trim() : routeId.trim();

    if (!finalEmployeeId) {
      setError('Please select or provide an employee.');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await supportApi.create(tenantId, {
        employeeId: finalEmployeeId,
        category,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        routeId: finalRouteId || undefined,
      });

      // Reset form
      setSubject('');
      setDescription('');
      setRouteId('');
      setCustomRouteId('');
      if (onSuccess) {
        onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit support ticket. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Raise Corporate Support Ticket"
      subtitle="Submit an employee complaint or operational incident to AdhocX Helpdesk"
      width="560px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 6,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#DC2626',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Affected Employee */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Affected Employee <span style={{ color: '#DC2626' }}>*</span>
          </label>
          {employees.length > 0 ? (
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.employeeCode || 'No Code'}) {emp.phoneNumber ? `• ${emp.phoneNumber}` : ''}
                </option>
              ))}
              <option value="CUSTOM">-- Manual Employee UUID Entry --</option>
            </select>
          ) : (
            <input
              type="text"
              value={customEmployeeId}
              onChange={(e) => {
                setCustomEmployeeId(e.target.value);
                setEmployeeId('CUSTOM');
              }}
              placeholder="Enter Employee UUID..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            />
          )}

          {employeeId === 'CUSTOM' && employees.length > 0 && (
            <input
              type="text"
              value={customEmployeeId}
              onChange={(e) => setCustomEmployeeId(e.target.value)}
              placeholder="Enter Employee UUID..."
              style={{
                width: '100%',
                marginTop: 6,
                padding: '8px 12px',
                borderRadius: 6,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            />
          )}
        </div>

        {/* Category & Priority in a grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              Category <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              Priority Level
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Subject */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Subject / Issue Summary <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Cab delayed by 25 mins on Route #RT-104"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: 13,
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Detailed Description <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what occurred, driver remarks, or employee feedback..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: 13,
              resize: 'vertical',
            }}
          />
        </div>

        {/* Linked Route / Driver */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Linked Route & Driver <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>(Optional)</span>
          </label>
          {routes.length > 0 ? (
            <select
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            >
              <option value="">-- No Linked Route (General Issue) --</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.routeNumber || r.id.slice(0, 8)} • Shift {r.shiftTime || ''} ({r.direction})
                  {r.driver?.fullName || r.driverName ? ` • Driver: ${r.driver?.fullName || r.driverName}` : ''}
                  {r.vehiclePlate ? ` • ${r.vehiclePlate}` : ''}
                </option>
              ))}
              <option value="CUSTOM">-- Manual Route UUID Entry --</option>
            </select>
          ) : (
            <input
              type="text"
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              placeholder="e.g. 8fa12bc0-... (Route UUID)"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            />
          )}

          {routeId === 'CUSTOM' && routes.length > 0 && (
            <input
              type="text"
              value={customRouteId}
              onChange={(e) => setCustomRouteId(e.target.value)}
              placeholder="Enter Route UUID..."
              style={{
                width: '100%',
                marginTop: 6,
                padding: '8px 12px',
                borderRadius: 6,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: 13,
              }}
            />
          )}
        </div>

        {/* Form Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#5728B2',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus size={15} />
            {submitting ? 'Submitting...' : 'Submit Support Ticket'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

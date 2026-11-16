'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Users, UserCheck, Route, CheckCircle2 } from 'lucide-react';
import { analyticsApi, employeeApi } from '../../../lib/api/corporate';
import type { AttendancePage, Employee } from '../../../lib/api/types';
import MetricCard from '../../../components/common/MetricCard';
import { DonutChart } from '../../../components/charts/DonutChart';
import { useSession } from '../../../lib/auth/SessionContext';

const chartColors = ['#5728B2', '#38BDF8', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899'];

export default function EmployeeUsageReportPage() {
  const { tenantId } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeTotal, setEmployeeTotal] = useState(0);
  const [attendance, setAttendance] = useState<AttendancePage | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setEmployees([]);
      setEmployeeTotal(0);
      setAttendance(null);
      setLoading(false);
      return;
    }

    let active = true;
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setLoading(true);
    setError(null);
    Promise.all([
      employeeApi.list(tenantId, { limit: 100 }),
      analyticsApi.attendance({ tenantId, from, to, pageSize: 100 }),
    ])
      .then(([employeeResult, attendanceResult]) => {
        if (!active) return;
        setEmployees(employeeResult.items);
        setEmployeeTotal(employeeResult.pagination.total);
        setAttendance(attendanceResult);
      })
      .catch((err) => {
        console.error('Failed to load employee usage data:', err);
        if (active) setError('Unable to load employee usage data. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tenantId]);

  const activeEmployees = employees.filter((employee) => employee.isActive).length;
  const scheduledRides = attendance?.items.reduce((sum, item) => sum + item.scheduledRides, 0) ?? 0;
  const boardedRides = attendance?.items.reduce((sum, item) => sum + item.boarded, 0) ?? 0;

  const departmentUsage = useMemo(() => {
    const ridesByEmployee = new Map((attendance?.items ?? []).map((item) => [item.employeeId, item]));
    const counts = new Map<string, { employees: number; scheduled: number; boarded: number }>();
    for (const employee of employees) {
      const department = employee.department || 'Unassigned';
      const value = counts.get(department) ?? { employees: 0, scheduled: 0, boarded: 0 };
      const rides = ridesByEmployee.get(employee.id);
      value.employees += 1;
      value.scheduled += rides?.scheduledRides ?? 0;
      value.boarded += rides?.boarded ?? 0;
      counts.set(department, value);
    }
    return Array.from(counts.entries()).map(([department, values]) => ({ department, ...values }));
  }, [employees, attendance]);

  const chartData = departmentUsage.slice(0, 6).map((item, index) => ({
    label: item.department,
    count: item.employees,
    pct: employeeTotal > 0 ? Math.round((item.employees / employeeTotal) * 100) : 0,
    color: chartColors[index % chartColors.length],
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Employee Usage Report
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Tenant employee and attendance records for the last 30 days
          </p>
        </div>
        <button
          type="button"
          disabled={!tenantId}
          onClick={() => tenantId && analyticsApi.downloadReport({ tenantId, type: 'attendance', format: 'csv' })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid var(--border-color)', borderRadius: 6 }}
        >
          <Download size={14} /> Export attendance CSV
        </button>
      </div>

      {error && <div role="alert" className="surface-card" style={{ padding: 14, color: '#B91C1C' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard label="Registered employees" value={loading ? '...' : employeeTotal.toLocaleString()} icon={<Users size={20} />} category="primary" />
        <MetricCard label="Active employees loaded" value={loading ? '...' : activeEmployees.toLocaleString()} icon={<UserCheck size={20} />} category="success" />
        <MetricCard label="Scheduled rides (30 days)" value={loading ? '...' : attendance ? scheduledRides.toLocaleString() : '—'} icon={<Route size={20} />} category="info" />
        <MetricCard label="Boarded rides (30 days)" value={loading ? '...' : attendance ? boardedRides.toLocaleString() : '—'} icon={<CheckCircle2 size={20} />} category="warning" />
      </div>

      {attendance && attendance.total > attendance.items.length && (
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 12 }}>
          Showing attendance for {attendance.items.length} of {attendance.total} employees; request additional pages for a complete breakdown.
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        <section className="surface-card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0 }}>Employee distribution by department</h2>
          {chartData.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No employee department data is available.</p>
          ) : (
            <DonutChart segments={chartData} totalValue={employeeTotal} totalLabel="Employees" size={180} />
          )}
        </section>

        <section className="surface-card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0 }}>Department usage</h2>
          {departmentUsage.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No department records are available.</p>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr><th>Department</th><th>Employees</th><th>Scheduled rides</th><th>Boarded rides</th></tr>
                </thead>
                <tbody>
                  {departmentUsage.map((item) => (
                    <tr key={item.department}>
                      <td>{item.department}</td>
                      <td>{item.employees}</td>
                      <td>{item.scheduled}</td>
                      <td>{item.boarded}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

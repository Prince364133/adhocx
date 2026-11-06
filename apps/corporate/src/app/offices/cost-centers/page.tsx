'use client';

import React, { useState, useEffect } from 'react';
import {
  Network,
  DollarSign,
  Users,
  TrendingUp,
  Plus,
  Download,
  PieChart,
} from 'lucide-react';
import { tenantApi } from '../../../lib/api/corporate';
import { useSession } from '../../../lib/auth/SessionContext';
import MetricCard from '../../../components/common/MetricCard';

interface CostCenterItem {
  id: string;
  code: string;
  name: string;
  headDepartment: string;
  managerName: string;
  activeEmployees: number;
  budgetAllocatedLakhs: number;
  budgetSpentLakhs: number;
  costPerCommuteInr: number;
  status: 'Within Budget' | 'Near Cap' | 'Exceeded';
}

export default function CostCentersOrgPage() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const [costCenters, setCostCenters] = useState<CostCenterItem[]>([]);
  const [selectedDept, setSelectedDept] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    tenantApi
      .costCenters(activeTenantId)
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          const items: CostCenterItem[] = data.map((cc) => ({
            id: cc.id,
            code: cc.code,
            name: cc.name,
            headDepartment: cc.department || cc.name,
            managerName: cc.managerName || 'Operations Lead',
            activeEmployees: cc._count?.employees || 0,
            budgetAllocatedLakhs: cc.budgetAllocated ? cc.budgetAllocated / 100000 : 15.0,
            budgetSpentLakhs: cc.budgetSpent ? cc.budgetSpent / 100000 : 0.0,
            costPerCommuteInr: 65.0,
            status: 'Within Budget',
          }));
          setCostCenters(items);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch cost centers:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeTenantId]);

  const filteredCostCenters = costCenters.filter((cc) => {
    return selectedDept === 'All' || cc.headDepartment === selectedDept;
  });

  const totalBudget = costCenters.reduce((sum, cc) => sum + cc.budgetAllocatedLakhs, 0);
  const totalSpent = costCenters.reduce((sum, cc) => sum + cc.budgetSpentLakhs, 0);
  const totalCommuters = costCenters.reduce((sum, cc) => sum + cc.activeEmployees, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Organization Structure & Cost Centers
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Map transport budgets, department billing codes and cost-per-commute efficiency
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => alert('Exporting cost report...')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} /> Export Cost Report
          </button>
          <button
            type="button"
            onClick={() => alert('Create cost center: Connects to POST /corporate/tenants/:id/cost-centers')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: '#5728B2',
              color: '#FFFFFF',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} /> New Cost Center
          </button>
        </div>
      </div>

      {/* High-Level Financial KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <MetricCard
          label="Total Monthly Transport Budget"
          value={totalBudget > 0 ? `₹${totalBudget.toFixed(1)} Lakhs` : 'Configurable'}
          delta="Approved Q4 Budget"
          deltaType="neutral"
          icon={<DollarSign size={20} />}
          category="primary"
        />
        <MetricCard
          label="Total Spent (Month-to-Date)"
          value={totalSpent > 0 ? `₹${totalSpent.toFixed(1)} Lakhs` : '₹0.00'}
          delta={totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}% utilized` : 'Active'}
          deltaType="positive"
          icon={<TrendingUp size={20} />}
          category="warning"
        />
        <MetricCard
          label="Assigned Commuters"
          value={totalCommuters.toLocaleString()}
          delta="Cost-Center Mapped"
          deltaType="positive"
          icon={<Users size={20} />}
          category="success"
        />
        <MetricCard
          label="Avg Cost per Employee Commute"
          value="Standard Rate"
          delta="Per Distance Slab"
          deltaType="positive"
          icon={<PieChart size={20} />}
          category="info"
        />
      </div>

      {/* Cost Center Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Department Cost Centers & Budget Allocation
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Monthly quota tracking and billing code assignments
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading cost centers...
          </div>
        ) : filteredCostCenters.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No cost centers configured for this tenant. Create your first cost center to track departmental commute spend.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Code</th>
                  <th style={{ padding: '12px 16px' }}>Cost Center & Department</th>
                  <th style={{ padding: '12px 16px' }}>Cost Center Manager</th>
                  <th style={{ padding: '12px 16px' }}>Commuters</th>
                  <th style={{ padding: '12px 16px' }}>Budget Utilization</th>
                  <th style={{ padding: '12px 16px' }}>Cost / Trip</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCostCenters.map((cc) => {
                  const utilPct = cc.budgetAllocatedLakhs > 0 ? Math.round((cc.budgetSpentLakhs / cc.budgetAllocatedLakhs) * 100) : 0;
                  return (
                    <tr key={cc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            backgroundColor: 'var(--bg-surface-hover)',
                            borderRadius: 4,
                            fontSize: 12,
                            fontFamily: 'monospace',
                          }}
                        >
                          {cc.code}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cc.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dept: {cc.headDepartment}</div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {cc.managerName}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {cc.activeEmployees}
                      </td>
                      <td style={{ padding: '14px 16px', minWidth: 160 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>₹{cc.budgetSpentLakhs}L / ₹{cc.budgetAllocatedLakhs}L</span>
                          <span style={{ color: utilPct > 90 ? '#DC2626' : 'var(--text-muted)' }}>{utilPct}%</span>
                        </div>
                        <div style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(utilPct, 100)}%`,
                              backgroundColor: utilPct > 90 ? '#DC2626' : utilPct > 80 ? '#F59E0B' : '#16A34A',
                              borderRadius: 3,
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        ₹{cc.costPerCommuteInr.toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            backgroundColor:
                              cc.status === 'Within Budget'
                                ? '#DCFCE7'
                                : cc.status === 'Near Cap'
                                ? '#FEF3C7'
                                : '#FEE2E2',
                            color:
                              cc.status === 'Within Budget'
                                ? '#15803D'
                                : cc.status === 'Near Cap'
                                ? '#B45309'
                                : '#DC2626',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {cc.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

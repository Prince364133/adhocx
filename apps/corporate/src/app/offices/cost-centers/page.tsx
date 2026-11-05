'use client';

import React, { useState } from 'react';
import {
  Network,
  DollarSign,
  Users,
  TrendingUp,
  AlertCircle,
  Plus,
  Download,
  CheckCircle2,
  PieChart,
} from 'lucide-react';
import { mockCostCenters } from '../../../lib/mock/corporateMockData';
import MetricCard from '../../../components/common/MetricCard';

export default function CostCentersOrgPage() {
  const [selectedDept, setSelectedDept] = useState('All');

  const filteredCostCenters = mockCostCenters.filter((cc) => {
    return selectedDept === 'All' || cc.headDepartment === selectedDept;
  });

  const totalBudget = mockCostCenters.reduce((sum, cc) => sum + cc.budgetAllocatedLakhs, 0);
  const totalSpent = mockCostCenters.reduce((sum, cc) => sum + cc.budgetSpentLakhs, 0);
  const totalCommuters = mockCostCenters.reduce((sum, cc) => sum + cc.activeEmployees, 0);

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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: 'var(--corporate-blue)',
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
          value={`â‚¹${totalBudget.toFixed(1)} Lakhs`}
          delta="Approved Q4 Budget"
          deltaType="neutral"
          icon={<DollarSign size={20} />}
          category="primary"
        />
        <MetricCard
          label="Total Spent (Month-to-Date)"
          value={`â‚¹${totalSpent.toFixed(1)} Lakhs`}
          delta={`${((totalSpent / totalBudget) * 100).toFixed(1)}% utilized`}
          deltaType="positive"
          icon={<TrendingUp size={20} />}
          category="warning"
        />
        <MetricCard
          label="Assigned Commuters"
          value={totalCommuters.toLocaleString()}
          delta="100% Cost-Center Mapped"
          deltaType="positive"
          icon={<Users size={20} />}
          category="success"
        />
        <MetricCard
          label="Avg Cost per Employee Commute"
          value="â‚¹63.40"
          delta="-â‚¹2.80 vs last month"
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

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <option value="All">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Product">Product</option>
            <option value="Operations">Operations</option>
            <option value="HR">HR</option>
            <option value="Design">Design</option>
          </select>
        </div>

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
                const utilPct = Math.round((cc.budgetSpentLakhs / cc.budgetAllocatedLakhs) * 100);
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
                        <span style={{ fontWeight: 600 }}>â‚¹{cc.budgetSpentLakhs}L / â‚¹{cc.budgetAllocatedLakhs}L</span>
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
                      â‚¹{cc.costPerCommuteInr.toFixed(2)}
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
      </div>
    </div>
  );
}


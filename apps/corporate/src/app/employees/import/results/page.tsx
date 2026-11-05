'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  AlertOctagon,
  Copy,
  AlertTriangle,
  Download,
  Upload,
  Search,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';

interface ValidationRow {
  row: number;
  empId: string;
  name: string;
  issue: string;
  details: string;
  status: 'Valid' | 'Error' | 'Duplicate' | 'Warning';
}

const MOCK_VALIDATION_ROWS: ValidationRow[] = [
  { row: 12, empId: 'EMP03124', name: 'Neha Verma', issue: 'Duplicate', details: 'Employee ID already exists in system', status: 'Duplicate' },
  { row: 27, empId: 'EMP04011', name: 'Vikram Reddy', issue: 'Invalid Office', details: 'Office "HiTEC2" not found in tenant master', status: 'Error' },
  { row: 45, empId: 'EMP04109', name: 'Sanya Mehta', issue: 'Missing Field', details: 'Department is required for roster billing', status: 'Error' },
  { row: 78, empId: 'EMP02467', name: 'Priya Sharma', issue: '—', details: 'Valid record', status: 'Valid' },
  { row: 102, empId: 'EMP03376', name: 'Anjali Rao', issue: 'Format Warning', details: 'Phone number format is not standard (missing +91)', status: 'Warning' },
  { row: 115, empId: 'EMP05102', name: 'Kiran Deep', issue: '—', details: 'Valid record', status: 'Valid' },
  { row: 142, empId: 'EMP05230', name: 'Rahul Joshi', issue: 'Invalid Geocode', details: 'Pickup address geocode outside Hyderabad city boundary', status: 'Error' },
];

export default function ImportValidationResultsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'errors' | 'duplicates' | 'warnings'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRows = MOCK_VALIDATION_ROWS.filter((r) => {
    if (activeTab === 'errors' && r.status !== 'Error') return false;
    if (activeTab === 'duplicates' && r.status !== 'Duplicate') return false;
    if (activeTab === 'warnings' && r.status !== 'Warning') return false;
    return (
      r.empId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.details.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getStatusBadge = (status: ValidationRow['status']) => {
    switch (status) {
      case 'Valid':
        return { bg: '#DCFCE7', color: '#16A34A', border: '#86EFAC' };
      case 'Error':
        return { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5' };
      case 'Duplicate':
        return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
      case 'Warning':
        return { bg: '#EFF6FF', color: '#5728B2', border: '#BFDBFE' };
    }
  };

  const handleImportValid = () => {
    alert('Importing 2,720 valid records into AdhocX employee directory!');
    router.push('/employees');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Buttons Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Import Validation Results
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Review the import summary, fix issues and proceed with a clean import
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => alert('Downloading Error Rows Spreadsheet')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: 'var(--radius-md)',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Download size={15} />
            <span>Download Error Rows</span>
          </button>

          <button
            onClick={handleImportValid}
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
            <Upload size={15} />
            <span>Import Valid Records (2,720)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div
        className="surface-card"
        style={{
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '14px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#F1F5F9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileSpreadsheet size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>2,846</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Total Records</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#16A34A' }}>2,720</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Valid Records</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertOctagon size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#DC2626' }}>86</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Errors</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Copy size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#D97706' }}>24</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Duplicates</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#5728B2' }}>16</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Warnings</div>
          </div>
        </div>
      </div>

      {/* Table Section with Filter Tabs & Search */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          {/* Segmented Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'all' ? '#5728B2' : '#F1F5F9',
                color: activeTab === 'all' ? '#FFFFFF' : '#475569',
              }}
            >
              All Records (2,846)
            </button>
            <button
              onClick={() => setActiveTab('errors')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'errors' ? '#DC2626' : '#FEE2E2',
                color: activeTab === 'errors' ? '#FFFFFF' : '#DC2626',
              }}
            >
              Errors (86)
            </button>
            <button
              onClick={() => setActiveTab('duplicates')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'duplicates' ? '#D97706' : '#FEF3C7',
                color: activeTab === 'duplicates' ? '#FFFFFF' : '#D97706',
              }}
            >
              Duplicates (24)
            </button>
            <button
              onClick={() => setActiveTab('warnings')}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'warnings' ? '#5728B2' : '#EFF6FF',
                color: activeTab === 'warnings' ? '#FFFFFF' : '#5728B2',
              }}
            >
              Warnings (16)
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: 280 }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Employee ID or Name..."
              style={{
                width: '100%',
                height: 34,
                paddingLeft: 32,
                paddingRight: 10,
                fontSize: 12,
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                outline: 'none',
                backgroundColor: '#F8FAFC',
              }}
            />
          </div>
        </div>

        {/* Validation Issues Table */}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Row</th>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Issue</th>
                <th>Details</th>
                <th style={{ textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => {
                const badge = getStatusBadge(r.status);
                return (
                  <tr key={r.row}>
                    <td style={{ fontWeight: 600, color: '#64748B' }}>{r.row}</td>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>{r.empId}</td>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>{r.name}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {r.issue}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#475569' }}>{r.details}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {r.status}
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


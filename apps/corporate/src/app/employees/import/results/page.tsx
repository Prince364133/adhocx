'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertOctagon,
  Copy,
  AlertTriangle,
  Download,
  Upload,
  Search,
  FileSpreadsheet,
  UploadCloud,
} from 'lucide-react';

interface ValidationRow {
  row: number;
  empId: string;
  name: string;
  issue: string;
  details: string;
  status: 'Valid' | 'Error' | 'Duplicate' | 'Warning';
}

export default function ImportValidationResultsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ValidationRow[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'errors' | 'duplicates' | 'warnings'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const totalRecords = rows.length;
  const validRecords = rows.filter((r) => r.status === 'Valid').length;
  const errorRecords = rows.filter((r) => r.status === 'Error').length;
  const duplicateRecords = rows.filter((r) => r.status === 'Duplicate').length;
  const warningRecords = rows.filter((r) => r.status === 'Warning').length;

  const filteredRows = rows.filter((r) => {
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
    if (validRecords === 0) return;
    alert(`Importing ${validRecords.toLocaleString()} valid records into AdhocX employee directory!`);
    router.push('/employees');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Action Buttons Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Import Validation Results
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Review the import summary, fix issues and proceed with a clean import
          </p>
        </div>

        {totalRecords > 0 && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => alert('Downloading Error Rows Spreadsheet')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-strong)',
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
              disabled={validRecords === 0}
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
                cursor: validRecords > 0 ? 'pointer' : 'not-allowed',
                boxShadow: '0 2px 4px rgba(87, 40, 178,0.25)',
              }}
            >
              <Upload size={15} />
              <span>Import Valid Records ({validRecords.toLocaleString()})</span>
            </button>
          </div>
        )}
      </div>

      {totalRecords === 0 ? (
        <div className="surface-card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <FileSpreadsheet size={48} color="#94A3B8" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
            No Uploaded File In Progress
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 20px auto' }}>
            Please select and upload an employee spreadsheet (.xlsx or .csv) through the wizard to preview and validate records.
          </p>
          <Link
            href="/employees/import"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: '#5728B2',
              color: '#FFFFFF',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <UploadCloud size={16} />
            <span>Go to Upload Wizard</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div
            className="surface-card"
            style={{
              padding: '16px 20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '14px',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalRecords.toLocaleString()}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Records</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#16A34A' }}>{validRecords.toLocaleString()}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Valid Records</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertOctagon size={18} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#DC2626' }}>{errorRecords.toLocaleString()}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Errors</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Copy size={18} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#D97706' }}>{duplicateRecords.toLocaleString()}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Duplicates</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={18} />
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#5728B2' }}>{warningRecords.toLocaleString()}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Warnings</div>
              </div>
            </div>
          </div>

          {/* Table Section with Filter Tabs & Search */}
          <div className="surface-card" style={{ padding: '20px', backgroundColor: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
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
                  All Records ({totalRecords})
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
                  Errors ({errorRecords})
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
                  Duplicates ({duplicateRecords})
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
                  Warnings ({warningRecords})
                </button>
              </div>

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
                    border: '1px solid var(--border-strong)',
                    borderRadius: '6px',
                    outline: 'none',
                    backgroundColor: 'var(--bg-surface-muted)',
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
                        <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.row}</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.empId}</td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</td>
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
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.details}</td>
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
        </>
      )}
    </div>
  );
}

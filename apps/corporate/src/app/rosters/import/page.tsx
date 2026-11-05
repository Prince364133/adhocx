'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Info,
  Calendar,
} from 'lucide-react';

const MOCK_PREVIEW_ROWS = [
  { empId: 'EMP02467', name: 'Priya Sharma', shift: 'Day', shiftColor: '#1167EE', office: 'HiTEC City', date: '08 Dec 2026' },
  { empId: 'EMP02911', name: 'Rohit Singh', shift: 'Night', shiftColor: '#7C3AED', office: 'Kondapur', date: '08 Dec 2026' },
  { empId: 'EMP03124', name: 'Neha Verma', shift: 'Evening', shiftColor: '#D97706', office: 'Gachibowli', date: '08 Dec 2026' },
  { empId: 'EMP01893', name: 'Amit Kumar', shift: 'Day', shiftColor: '#1167EE', office: 'HiTEC City', date: '08 Dec 2026' },
  { empId: 'EMP03376', name: 'Anjali Rao', shift: 'Day', shiftColor: '#1167EE', office: 'Madhapur', date: '08 Dec 2026' },
];

export default function RosterImportPreviewPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
    records: number;
  } | null>({
    name: 'HiTEC_Roster_Dec2026.xlsx',
    size: '3.4 MB',
    records: 2846,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
          Roster Import & Preview
        </h1>
        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
          Bulk import employee rosters from Excel (XLSX) or CSV and validate before publishing
        </p>
      </div>

      {/* 4-Step Stepper Header */}
      <div className="surface-card" style={{ padding: '16px 24px', backgroundColor: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#1167EE', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              1
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1167EE' }}>Upload File</span>
          </div>

          <div style={{ height: 2, flex: 1, backgroundColor: '#CBD5E1', margin: '0 12px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#1167EE', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              2
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1167EE' }}>Map Columns</span>
          </div>

          <div style={{ height: 2, flex: 1, backgroundColor: '#CBD5E1', margin: '0 12px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#1167EE', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              3
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1167EE' }}>Preview & Validate</span>
          </div>

          <div style={{ height: 2, flex: 1, backgroundColor: '#CBD5E1', margin: '0 12px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              4
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Import</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload Area + First 5 Rows Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Left: Upload Box */}
        <div className="surface-card" style={{ padding: '24px', backgroundColor: '#FFFFFF', flex: '1 1 45%' }}>
          <div
            style={{
              border: '2px dashed #93C5FD',
              borderRadius: '12px',
              backgroundColor: '#F8FAFC',
              padding: '36px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <FileSpreadsheet size={24} />
            </div>

            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              Drag & drop your roster file here
            </div>
            <div style={{ fontSize: '13px', color: '#1167EE', fontWeight: 600, marginTop: '2px' }}>
              or click to browse
            </div>

            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '10px' }}>
              Supported formats: .xlsx, .csv · Max size: 20 MB
            </div>
          </div>

          {selectedFile && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #BFDBFE',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileSpreadsheet size={18} color="#16A34A" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    {selectedFile.size} · <strong>{selectedFile.records.toLocaleString()} rows detected</strong>
                  </div>
                </div>
              </div>

              <Trash2 size={14} color="#DC2626" style={{ cursor: 'pointer' }} onClick={() => setSelectedFile(null)} />
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => alert('Downloading Roster Template')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#F8FAFC',
                color: '#475569',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Download size={13} />
              <span>Download Template</span>
            </button>

            <button
              onClick={() => router.push('/rosters/approve')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#1167EE',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(17,103,238,0.25)',
              }}
            >
              <span>Validate & Review</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Right: First 5 Rows Preview Table */}
        <div className="surface-card" style={{ padding: '20px', backgroundColor: '#FFFFFF', flex: '1 1 55%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                Import Preview (First 5 Rows)
              </h3>
              <p style={{ fontSize: '11px', color: '#64748B' }}>
                Column mapping verified against tenant shifts
              </p>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '4px' }}>
              ✓ All Columns Matched
            </span>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>Shift</th>
                  <th>Office</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_PREVIEW_ROWS.map((row) => (
                  <tr key={row.empId}>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>{row.empId}</td>
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>{row.name}</td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: `${row.shiftColor}18`,
                          color: row.shiftColor,
                        }}
                      >
                        {row.shift}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#475569' }}>{row.office}</td>
                    <td style={{ fontSize: '12px', color: '#64748B' }}>{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


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
  Check,
} from 'lucide-react';

export default function EmployeeImportWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
    records: number;
  } | null>({
    name: 'HiTEC_Employees_Dec.xlsx',
    size: '2.4 MB',
    records: 2846,
  });

  const handleNext = () => {
    router.push('/employees/import/results');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Import Employees
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Bulk add or update employee records using an Excel (XLSX) or CSV file
        </p>
      </div>

      {/* 4-Step Stepper Header */}
      <div className="surface-card" style={{ padding: '16px 24px', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 720, margin: '0 auto', position: 'relative' }}>
          {/* Step 1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: '#5728B2', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
              1
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#5728B2' }}>Upload File</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Add your data file</div>
            </div>
          </div>

          <div style={{ height: 2, flex: 1, backgroundColor: '#CBD5E1', margin: '0 12px' }} />

          {/* Step 2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
              2
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Map Fields</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Match file columns</div>
            </div>
          </div>

          <div style={{ height: 2, flex: 1, backgroundColor: '#CBD5E1', margin: '0 12px' }} />

          {/* Step 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
              3
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Preview Data</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Review records</div>
            </div>
          </div>

          <div style={{ height: 2, flex: 1, backgroundColor: '#CBD5E1', margin: '0 12px' }} />

          {/* Step 4 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
              4
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Import</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Add to system</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload Dropzone + Guidelines Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Left: Drag and Drop Upload Area */}
        <div className="surface-card" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', flex: '1 1 65%' }}>
          <div
            style={{
              border: '2px dashed #93C5FD',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-surface-muted)',
              padding: '40px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileSpreadsheet size={24} />
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UploadCloud size={24} />
              </div>
            </div>

            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Drag and drop your file here
            </div>
            <div style={{ fontSize: '13px', color: '#5728B2', fontWeight: 600, marginTop: '2px' }}>
              or click to browse
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px' }}>
              Supported formats: .xlsx, .csv Â· Max file size: 10 MB
            </div>
          </div>

          {/* Selected File Chip */}
          {selectedFile && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #BFDBFE',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileSpreadsheet size={20} color="#16A34A" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {selectedFile.size} Â· <strong>{selectedFile.records.toLocaleString()} records detected</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedFile(null)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  border: '1px solid var(--border-strong)',
                  backgroundColor: 'var(--bg-surface)',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}

          {/* Next Button */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleNext}
              disabled={!selectedFile}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#5728B2',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: selectedFile ? 'pointer' : 'not-allowed',
                boxShadow: '0 2px 4px rgba(87, 40, 178,0.25)',
              }}
            >
              <span>Next: Map Fields</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {/* Right: Import Guidelines Card */}
        <div className="surface-card" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', flex: '1 1 35%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Info size={18} color="#5728B2" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Import Guidelines
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={14} color="#16A34A" style={{ marginTop: 3, flexShrink: 0 }} />
              <span>Use the provided template for best results and column recognition.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={14} color="#16A34A" style={{ marginTop: 3, flexShrink: 0 }} />
              <span><strong>Required fields:</strong> Employee ID, Name, Department.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={14} color="#16A34A" style={{ marginTop: 3, flexShrink: 0 }} />
              <span><strong>Optional:</strong> Office, Pickup Location, Eligibility, Shift.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Check size={14} color="#16A34A" style={{ marginTop: 3, flexShrink: 0 }} />
              <span>Maximum 10,000 records per upload batch.</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '20px', paddingTop: '16px' }}>
            <button
              onClick={() => alert('Downloading Excel Template: AdhocX_Employee_Import_Template.xlsx')}
              style={{
                width: '100%',
                height: 38,
                backgroundColor: 'var(--bg-surface-muted)',
                color: '#5728B2',
                border: '1px solid #BFDBFE',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Download size={14} />
              <span>Download Template (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


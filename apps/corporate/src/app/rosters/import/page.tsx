'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Download,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { ContentLoadingSkeleton } from '@adhocx/ui/page-loading';
import { rosterApi } from '../../../lib/api/corporate';
import type { RosterValidationResult } from '../../../lib/api/types';
import LazyScrollSentinel from '../../../components/common/LazyScrollSentinel';
import { useLazySlice } from '../../../lib/hooks/useInfiniteScroll';
import { useSession } from '../../../lib/auth/SessionContext';

export default function RosterImportPreviewPage() {
  const router = useRouter();
  const { tenantId } = useSession();
  const activeTenantId = tenantId;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<{
    file: File;
    name: string;
    size: string;
  } | null>(null);
  const [validation, setValidation] = useState<RosterValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { visibleItems: visibleErrors, hasMore, sentinelRef } = useLazySlice(
    validation?.errors ?? [],
    validation?.totalRows ?? 0,
    20,
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (!activeTenantId) {
        setValidation(null);
        setError('No tenant is selected for roster import.');
        setIsValidating(false);
        return;
      }
      const file = e.target.files[0];
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setSelectedFile({
        file,
        name: file.name,
        size: `${sizeMb} MB`,
      });

      setValidation(null);
      setError(null);
      setIsValidating(true);
      try {
        const res = await rosterApi.validate(activeTenantId, file);
        setValidation(res);
      } catch (err) {
        console.error('Roster validation failed:', err);
        setError('Unable to validate this roster file. Check its format and try again.');
      } finally {
        setIsValidating(false);
      }
    }
  };

  const downloadTemplate = async () => {
    setError(null);
    try {
      await rosterApi.downloadTemplate();
    } catch (err) {
      console.error('Failed to download roster template:', err);
      setError('Unable to download the roster template. Please try again.');
    }
  };

  const uploadDraft = async () => {
    if (!activeTenantId || !selectedFile || !validation?.isValid) return;
    setIsUploading(true);
    setError(null);
    try {
      await rosterApi.upload(activeTenantId, selectedFile.file, 'draft');
      router.push('/rosters/approve');
    } catch (err) {
      console.error('Roster draft upload failed:', err);
      setError('Unable to save this roster as a draft. Please retry.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Roster Import & Preview
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Bulk import employee rosters from Excel (XLSX) or CSV and validate before publishing
        </p>
      </div>

      {/* 4-Step Stepper Header */}
      <div className="surface-card" style={{ padding: '16px 24px', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#5728B2', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              1
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#5728B2' }}>Upload File</span>
          </div>

          <div style={{ height: 2, flex: 1, backgroundColor: '#CBD5E1', margin: '0 12px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#5728B2', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              2
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#5728B2' }}>Map Columns</span>
          </div>

          <div style={{ height: 2, flex: 1, backgroundColor: '#CBD5E1', margin: '0 12px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: selectedFile ? '#5728B2' : 'var(--bg-surface-hover)', color: selectedFile ? '#FFFFFF' : 'var(--text-secondary)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              3
            </div>
            <span style={{ fontSize: '13px', fontWeight: selectedFile ? 700 : 500, color: selectedFile ? '#5728B2' : 'var(--text-secondary)' }}>Preview & Validate</span>
          </div>

          <div style={{ height: 2, flex: 1, backgroundColor: '#CBD5E1', margin: '0 12px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
              4
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Publish</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload Area + First 5 Rows Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Left: Upload Box */}
        <div className="surface-card" style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', flex: '1 1 45%' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".xlsx,.csv"
            style={{ display: 'none' }}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #93C5FD',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-surface-muted)',
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

            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Drag & drop your roster file here
            </div>
            <div style={{ fontSize: '13px', color: '#5728B2', fontWeight: 600, marginTop: '2px' }}>
              or click to browse
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
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
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {selectedFile.size} · {isValidating ? 'Validating file...' : validation ? 'Validation complete' : 'Not validated'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                aria-label="Remove selected roster file"
                onClick={() => {
                  setSelectedFile(null);
                  setValidation(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                style={{ border: 0, background: 'transparent', cursor: 'pointer' }}
              >
                <Trash2 size={14} color="#DC2626" />
              </button>
            </div>
          )}

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => void downloadTemplate()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--bg-surface-muted)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-strong)',
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
              type="button"
              onClick={() => void uploadDraft()}
              disabled={!selectedFile || !validation?.isValid || isValidating || isUploading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: selectedFile ? '#5728B2' : '#CBD5E1',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: selectedFile ? 'pointer' : 'not-allowed',
                boxShadow: selectedFile ? '0 2px 4px rgba(87, 40, 178,0.25)' : 'none',
              }}
            >
              <span>{isUploading ? 'Saving draft...' : 'Save draft & review'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Right: Preview Table */}
        <div className="surface-card" style={{ padding: '20px', backgroundColor: 'var(--bg-surface)', flex: '1 1 55%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Import Preview
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Validation results returned by the roster API
              </p>
            </div>
            {validation && <span>{validation.isValid ? 'Valid' : 'Invalid'}</span>}
          </div>

          {error && <div role="alert" style={{ marginBottom: 12, color: '#B91C1C' }}>{error}</div>}
          {isValidating ? (
            <ContentLoadingSkeleton kind="table" count={4} label="Validating roster file…" />
          ) : !validation ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
              Select a roster spreadsheet to validate its rows.
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                <span>Total rows: {validation.totalRows}</span>
                <span>Valid rows: {validation.validRows}</span>
                <span>Invalid rows: {validation.invalidRows}</span>
                <span>Login requests: {validation.loginRequestsCount}</span>
                <span>Logout requests: {validation.logoutRequestsCount}</span>
              </div>
              {validation.errors.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No validation errors returned.</p>
              ) : (
                <>
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead><tr><th>Row</th><th>Field</th><th>Value</th><th>Issue</th></tr></thead>
                      <tbody>
                        {visibleErrors.map((item, index) => (
                          <tr key={`${item.rowNumber}-${item.field}-${index}`}>
                            <td>{item.rowNumber}</td>
                            <td>{item.field}</td>
                            <td>{String(item.invalidValue ?? '—')}</td>
                            <td>{item.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <LazyScrollSentinel sentinelRef={sentinelRef} hasMore={hasMore} label="Loading more validation rows…" />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

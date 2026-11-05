'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Save,
  Download,
  Settings,
} from 'lucide-react';
import { mockImportMappings } from '../../../lib/mock/corporateMockData';

export default function ImportMappingEnginePage() {
  const [mappings, setMappings] = useState(mockImportMappings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Import Schema & Field Mapping Engine
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Map corporate HRMS / CSV columns to AdhocX employee schema, validation regex and cost centers
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleSave}
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
            <Save size={15} /> {savedSuccess ? 'Mapping Saved!' : 'Save Mapping Template'}
          </button>
        </div>
      </div>

      {/* Mapping Configuration Table */}
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
          }}
        >
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Active Schema Field Mappings ({mappings.length})
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Transform source file headers to enterprise data fields
            </p>
          </div>
          <span style={{ fontSize: 12, color: 'var(--corporate-blue)', fontWeight: 600 }}>
            Template: Workday_Standard_v3.0
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Source Column (CSV/API)</th>
                <th style={{ padding: '12px 16px' }}></th>
                <th style={{ padding: '12px 16px' }}>AdhocX Target Field</th>
                <th style={{ padding: '12px 16px' }}>Sample Value</th>
                <th style={{ padding: '12px 16px' }}>Validation Rule</th>
                <th style={{ padding: '12px 16px' }}>Requirement</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((field, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: 'var(--bg-surface-hover)',
                        borderRadius: 4,
                        fontSize: 12,
                        fontFamily: 'monospace',
                      }}
                    >
                      {field.sourceColumn}
                    </span>
                  </td>
                  <td style={{ padding: '14px 8px', color: 'var(--text-muted)' }}>
                    <ArrowRight size={14} />
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--corporate-blue)' }}>
                    {field.adhocxField}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {field.sampleValue}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                    {field.validationRule}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        backgroundColor: field.isRequired ? '#EFF6FF' : '#F8FAFC',
                        color: field.isRequired ? 'var(--corporate-blue)' : 'var(--text-muted)',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {field.isRequired ? 'Required' : 'Optional'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={12} /> {field.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


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

interface SchemaFieldMapping {
  sourceColumn: string;
  adhocxField: string;
  sampleValue: string;
  validationRule: string;
  isRequired: boolean;
  status: 'Mapped' | 'Custom';
}

const DEFAULT_MAPPINGS: SchemaFieldMapping[] = [
  { sourceColumn: 'Emp_ID / Worker_ID', adhocxField: 'employeeCode', sampleValue: 'EMP-9021', validationRule: '^[A-Z0-9_-]{3,20}$', isRequired: true, status: 'Mapped' },
  { sourceColumn: 'Full_Name / Legal_Name', adhocxField: 'fullName', sampleValue: 'Ananya Deshmukh', validationRule: 'String (min 2 chars)', isRequired: true, status: 'Mapped' },
  { sourceColumn: 'Gender / Sex', adhocxField: 'gender', sampleValue: 'FEMALE', validationRule: 'MALE | FEMALE | OTHER', isRequired: true, status: 'Mapped' },
  { sourceColumn: 'Work_Email', adhocxField: 'workEmail', sampleValue: 'ananya.d@company.com', validationRule: 'Valid RFC-5322 Email', isRequired: false, status: 'Mapped' },
  { sourceColumn: 'Contact_No / Mobile', adhocxField: 'phoneNumber', sampleValue: '+91 9876543210', validationRule: 'E.164 / 10-digit Indian Phone', isRequired: true, status: 'Mapped' },
  { sourceColumn: 'Primary_Office_Code', adhocxField: 'officeCode', sampleValue: 'OFF-HYD-01', validationRule: 'Valid Tenant Office Code', isRequired: true, status: 'Mapped' },
  { sourceColumn: 'Cost_Center_Code', adhocxField: 'costCenterCode', sampleValue: 'CC-ENG-04', validationRule: 'Valid Cost Center Code', isRequired: false, status: 'Mapped' },
  { sourceColumn: 'Residential_Address', adhocxField: 'pickupAddress', sampleValue: 'Flat 402, Gachibowli, Hyd', validationRule: 'Geocodable address string', isRequired: true, status: 'Mapped' },
  { sourceColumn: 'Home_Latitude', adhocxField: 'pickupLatitude', sampleValue: '17.440081', validationRule: 'Numeric Float (-90 to +90)', isRequired: true, status: 'Mapped' },
  { sourceColumn: 'Home_Longitude', adhocxField: 'pickupLongitude', sampleValue: '78.348915', validationRule: 'Numeric Float (-180 to +180)', isRequired: true, status: 'Mapped' },
];

export default function ImportMappingEnginePage() {
  const [mappings, setMappings] = useState<SchemaFieldMapping[]>(DEFAULT_MAPPINGS);
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
              backgroundColor: '#5728B2',
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
          <span style={{ fontSize: 12, color: '#5728B2', fontWeight: 600 }}>
            Active Canonical Template v2.4
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
                        backgroundColor: 'var(--bg-surface-muted)',
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
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#5728B2' }}>
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
                        backgroundColor: field.isRequired ? '#EFF6FF' : 'var(--bg-surface-muted)',
                        color: field.isRequired ? '#5728B2' : 'var(--text-muted)',
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

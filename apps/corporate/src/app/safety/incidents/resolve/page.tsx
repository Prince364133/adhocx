'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ArrowLeft,
  Clock,
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { mockSafetyIncidents } from '../../../../lib/mock/corporateMockData';

export default function IncidentResolutionTimelinePage() {
  const incident = mockSafetyIncidents[0]; // INC-801
  const [resolutionCategory, setResolutionCategory] = useState('Traffic Diversion');
  const [rcaNotes, setRcaNotes] = useState(
    'Driver took bypass service lane to navigate around overturned cement mixer on main flyover. No security hazard. Commuter confirmed safe. Safety escort completed until office drop.'
  );
  const [isClosed, setIsClosed] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/safety/incidents/details"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <ArrowLeft size={14} /> Back to Dossier
          </Link>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Incident Resolution & Investigation Audit
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Chronological action log, root-cause analysis (RCA) and compliance closure
            </p>
          </div>
        </div>

        {isClosed && (
          <span
            style={{
              padding: '4px 12px',
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <CheckCircle2 size={15} /> Incident Successfully Closed
          </span>
        )}
      </div>

      {/* Two-Column Grid: Timeline on Left, Closure Form on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        {/* Left Column: Chronological Action Timeline */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Chronological Investigation Timeline ({incident.incidentNumber})
            </h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Total elapsed: 6 min to first contact
            </span>
          </div>

          {/* Stepper Timeline Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
            {incident.resolutionTimeline.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                {/* Time Indicator & Dot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      backgroundColor: idx === 0 ? '#DC2626' : 'var(--corporate-blue)',
                      border: '2px solid #FFFFFF',
                      boxShadow: '0 0 0 2px rgba(87, 40, 178, 0.2)',
                    }}
                  />
                  {idx < incident.resolutionTimeline.length - 1 && (
                    <div style={{ width: 2, height: 48, backgroundColor: '#E2E8F0', marginTop: 4 }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, backgroundColor: 'var(--bg-surface-muted)', padding: '12px 14px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {item.action}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {item.time}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--corporate-blue)', fontWeight: 600, marginBottom: 4 }}>
                    Actor: {item.actor}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {item.notes}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Resolution & Sign-Off Form */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Resolution & Formal Sign-Off
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Authorized Safety Officer sign-off for corporate audit compliance
            </p>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Resolution Classification
              </label>
              <select
                value={resolutionCategory}
                onChange={(e) => setResolutionCategory(e.target.value)}
                disabled={isClosed}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  fontSize: 13,
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <option value="Traffic Diversion">Traffic Diversion (Verified Non-Threat)</option>
                <option value="Accidental / Inadvertent SOS">Accidental / Inadvertent SOS</option>
                <option value="Mechanical Breakdown Backup">Mechanical Breakdown Backup</option>
                <option value="Driver Disciplinary Action">Driver Disciplinary Action</option>
                <option value="Emergency Medical Response">Emergency Medical Response</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                Root Cause Analysis (RCA) & Summary Notes
              </label>
              <textarea
                value={rcaNotes}
                onChange={(e) => setRcaNotes(e.target.value)}
                disabled={isClosed}
                rows={5}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  backgroundColor: 'var(--bg-surface)',
                  resize: 'none',
                }}
              />
            </div>

            <div style={{ padding: '10px 12px', backgroundColor: 'var(--bg-surface-muted)', borderRadius: 6, border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Officer Sign-Off Identity
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                Rohan Deshmukh (Certified Lead Safety Officer)
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>AdhocX Central Command Desk â€¢ ID: SF-HYD-04</div>
            </div>
          </div>

          {/* Submit Button */}
          {!isClosed ? (
            <button
              type="button"
              onClick={() => setIsClosed(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '10px 16px',
                backgroundColor: 'var(--corporate-blue)',
                color: '#FFFFFF',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <ShieldCheck size={16} /> Complete Investigation & Close Case
            </button>
          ) : (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#15803D', fontWeight: 600 }}>
              Case resolved. Recorded into immutable corporate compliance ledger.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


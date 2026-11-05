'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ArrowLeft,
  PhoneCall,
  Volume2,
  AlertTriangle,
  MapPin,
  Clock,
  Car,
  User,
  Radio,
  FileCheck,
  ChevronRight,
  Share2,
} from 'lucide-react';
import { mockSafetyIncidents } from '../../../../lib/mock/corporateMockData';
import MiniLiveMap from '../../../../components/maps/MiniLiveMap';

export default function IncidentDetailsDossierPage() {
  const [selectedIncId, setSelectedIncId] = useState('INC-801');
  const incident = mockSafetyIncidents.find((i) => i.id === selectedIncId) || mockSafetyIncidents[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/safety"
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
              backgroundColor: '#FFFFFF',
            }}
          >
            <ArrowLeft size={14} /> Back to Safety Overview
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Incident Dossier — {incident.incidentNumber}
              </h1>
              <span
                style={{
                  padding: '2px 8px',
                  backgroundColor: incident.severity === 'Critical' ? '#FEE2E2' : '#FFEDD5',
                  color: incident.severity === 'Critical' ? '#DC2626' : '#C2410C',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {incident.severity}
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  backgroundColor: '#FEF3C7',
                  color: '#B45309',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {incident.status}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              {incident.title} • Reported {incident.reportedAt}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="/safety/incidents/resolve"
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
              textDecoration: 'none',
            }}
          >
            <FileCheck size={14} /> Resolution Timeline <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Emergency Banner Alert if Critical */}
      {incident.severity === 'Critical' && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Radio size={20} style={{ color: '#DC2626' }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#991B1B' }}>
                Active Emergency Protocol in Progress
              </div>
              <div style={{ fontSize: 12, color: '#B91C1C' }}>
                SOS signal initiated from Commuter Mobile App. Telemetry line open. Quick Response Team (QRT-02) staged.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              style={{
                padding: '6px 12px',
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <PhoneCall size={14} /> Call Driver (Suresh R)
            </button>
            <button
              type="button"
              style={{
                padding: '6px 12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #DC2626',
                color: '#DC2626',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <PhoneCall size={14} /> Call Commuter (Priya)
            </button>
          </div>
        </div>
      )}

      {/* Two-Column Grid: Incident Metadata & Map Telemetry */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 16 }}>
        {/* Left Column: Dossier Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Metadata Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
              Incident Particulars
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Incident Type:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{incident.incidentType}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Triggered Via:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{incident.sosTriggeredBy}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Commuter:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {incident.employeeName} ({incident.employeeId})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Driver & Vehicle:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {incident.driverName} • {incident.vehicleNumber}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Corridor / Trip:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{incident.tripId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Location:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
                  {incident.location}
                </span>
              </div>
            </div>

            {/* Description Box */}
            <div style={{ marginTop: 16, padding: '12px 14px', backgroundColor: '#F8FAFC', borderRadius: 6, border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                Description & Telemetry Notes
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                {incident.description}
              </p>
            </div>

            {/* Audio Recording Player Pill if Available */}
            {incident.audioRecordingAvailable && (
              <div
                style={{
                  marginTop: 16,
                  padding: '12px 14px',
                  backgroundColor: '#EFF6FF',
                  borderRadius: 6,
                  border: '1px solid #BFDBFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Volume2 size={18} style={{ color: 'var(--corporate-blue)' }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                      In-Cab Audio Stream Recording (32s)
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Captured automatically upon SOS trigger</div>
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    padding: '4px 10px',
                    backgroundColor: 'var(--corporate-blue)',
                    color: '#FFFFFF',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Play Audio
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Incident Telemetry Map */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Incident Location & Corridor Deviation Map
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Coordinates: 17.4582° N, 78.3690° E
            </span>
          </div>

          <MiniLiveMap height={400} routeName="SOS Telemetry Incident Zone" />

          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#F8FAFC',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              fontSize: 12,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong>Planned Route:</strong> Kondapur → HiTEC Cyber Gateway
            </div>
            <div style={{ color: '#DC2626', fontWeight: 600 }}>
              Corridor Deviation: 1.2 km off buffer
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


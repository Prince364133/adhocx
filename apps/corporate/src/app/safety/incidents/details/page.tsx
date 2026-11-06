'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ShieldAlert,
  ArrowLeft,
  PhoneCall,
  AlertTriangle,
  Clock,
  Car,
  User,
  CheckCircle2,
} from 'lucide-react';
import { safetyApi } from '../../../../lib/api/corporate';
import type { SafetyIncident } from '../../../../lib/api/types';
import { useSession } from '../../../../lib/auth/SessionContext';
import MiniLiveMap from '../../../../components/maps/MiniLiveMap';

function IncidentDetailsDossierContent() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const searchParams = useSearchParams();
  const incId = searchParams.get('id');

  const [incident, setIncident] = useState<SafetyIncident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (incId) {
      safetyApi
        .incident(incId)
        .then((res) => {
          setIncident(res);
        })
        .catch(() => {
          // If single fetch fails, try list
          safetyApi.incidents(activeTenantId, {}).then((list) => {
            setIncident(list.find((i) => i.id === incId) || list[0] || null);
          });
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      safetyApi
        .incidents(activeTenantId, {})
        .then((list) => {
          setIncident(list[0] || null);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [activeTenantId, incId]);

  if (loading) {
    return (
      <div className="surface-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading incident dossier...
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="surface-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
        Incident not found.
      </div>
    );
  }

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
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <ArrowLeft size={14} /> Back to Safety Overview
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Incident Dossier — {incident.id.slice(0, 8)}
              </h1>
              <span
                style={{
                  padding: '2px 8px',
                  backgroundColor: incident.severity === 'CRITICAL' ? '#FEE2E2' : '#FEF3C7',
                  color: incident.severity === 'CRITICAL' ? '#DC2626' : '#C2410C',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {incident.severity}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Detailed event timeline, employee details and emergency action log
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link
            href={`/safety/incidents/resolve?id=${incident.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              backgroundColor: '#16A34A',
              color: '#FFFFFF',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <CheckCircle2 size={15} /> Resolve Incident
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.4fr) minmax(300px, 1fr)', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="surface-card" style={{ padding: 16, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <MiniLiveMap height={320} routeName="Incident Telemetry Pin" />
          </div>

          <div className="surface-card" style={{ padding: 20, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              Event Description & Root Cause
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {incident.description || incident.title}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="surface-card" style={{ padding: 20, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
              Incident Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Status</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{incident.status}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Logged At</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {new Date(incident.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Emergency Contact Action</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>Escorted & Verified</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IncidentDetailsDossierPage() {
  return (
    <Suspense fallback={<div className="surface-card" style={{ padding: 40, textAlign: 'center' }}>Loading dossier...</div>}>
      <IncidentDetailsDossierContent />
    </Suspense>
  );
}

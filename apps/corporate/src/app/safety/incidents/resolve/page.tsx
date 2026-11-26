'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ContentLoadingSkeleton, PageLoadingSkeleton } from '@adhocx/ui/page-loading';
import { safetyApi } from '../../../../lib/api/corporate';
import type { SafetyIncident } from '../../../../lib/api/types';

function IncidentResolutionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const incidentId = searchParams.get('id');
  const [incident, setIncident] = useState<SafetyIncident | null>(null);
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!incidentId) {
      setIncident(null);
      setError('No incident was selected.');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    safetyApi.incident(incidentId)
      .then((data) => {
        if (active) setIncident(data);
      })
      .catch((err) => {
        console.error('Failed to load incident for resolution:', err);
        if (active) setError('Unable to load this incident. Verify the incident ID and try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [incidentId]);

  const handleResolve = async () => {
    if (!incidentId || !category || !notes.trim()) {
      setError('Select a resolution category and enter closure notes.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await safetyApi.resolveIncident(incidentId, {
        reason: category,
        resolutionNotes: notes.trim(),
        falsePositive: category === 'False Positive',
      });
      router.push('/safety');
    } catch (err) {
      console.error('Incident resolution failed:', err);
      setError('The incident could not be resolved. No changes were confirmed; please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Link href="/safety" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
            <ArrowLeft size={14} /> Back to Safety
          </Link>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: '12px 0 0' }}>
            Resolve Incident
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void handleResolve()}
          disabled={loading || isSubmitting || !incident || incident.status === 'RESOLVED'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#16A34A', color: '#FFFFFF', borderRadius: 6, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}
        >
          <CheckCircle2 size={15} /> {isSubmitting ? 'Saving...' : 'Close incident'}
        </button>
      </div>

      {error && <div role="alert" className="surface-card" style={{ padding: 14, color: '#B91C1C' }}>{error}</div>}
      {loading ? (
        <section className="surface-card" style={{ padding: 24 }}>
          <ContentLoadingSkeleton kind="form" count={4} label="Loading incident details…" />
        </section>
      ) : incident ? (
        <section className="surface-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <strong>Incident ID:</strong> {incident.id}
            <div style={{ marginTop: 6, color: 'var(--text-secondary)' }}>
              {incident.title ?? '—'} · {incident.status}
            </div>
            {incident.description && <p>{incident.description}</p>}
          </div>

          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
            Resolution category
            <select value={category} onChange={(event) => setCategory(event.target.value)} style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
              <option value="">Select a category</option>
              <option value="Resolved">Resolved</option>
              <option value="False Positive">False Positive</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
            Closure notes
            <textarea
              rows={5}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Record the actual actions taken and resolution details."
              style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-color)', fontSize: 13, lineHeight: 1.5 }}
            />
          </label>
        </section>
      ) : null}
    </div>
  );
}

export default function IncidentResolutionTimelinePage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant="detail" />}>
      <IncidentResolutionContent />
    </Suspense>
  );
}

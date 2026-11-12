'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Shield,
  Star,
  UserRound,
} from 'lucide-react';
import { opsApi } from '../../../lib/api/opsClient';
import type {
  OpsDriverCorporateRouteHistory,
  OpsDriverDetail,
  OpsDriverTripHistory,
} from '../../../lib/api/opsTypes';
import '../driver-dashboard.css';

type DriverAction = 'suspend' | 'reactivate' | 'deactivate' | 'activate';

const cardStyle: React.CSSProperties = {
  padding: 16,
  border: '1px solid var(--driver-border)',
  borderRadius: 10,
  background: 'var(--bg-surface)',
};

function formatDate(value?: string | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not recorded'
    : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function readable(value?: string | null) {
  return value ? value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Not available';
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const tone =
    normalized === 'VERIFIED' || normalized === 'AVAILABLE' || normalized === 'ACTIVE' || normalized === 'COMPLETED'
      ? 'var(--driver-green)'
      : normalized === 'SUSPENDED' || normalized === 'DEACTIVATED' || normalized === 'REJECTED' || normalized === 'CANCELLED'
        ? 'var(--driver-red)'
        : 'var(--driver-amber)';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 8px',
      border: `1px solid color-mix(in srgb, ${tone} 28%, transparent)`,
      borderRadius: 999,
      background: `color-mix(in srgb, ${tone} 10%, var(--bg-surface))`,
      color: tone,
      fontSize: 10,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {readable(status)}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <article style={{ minWidth: 0, padding: 12, border: '1px solid var(--driver-border)', borderRadius: 9, background: 'var(--bg-surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: 'var(--driver-faint)', fontSize: 11 }}>
        <span>{label}</span>
        <span style={{ display: 'inline-flex', color: 'var(--driver-accent)' }}>{icon}</span>
      </div>
      <div style={{ marginTop: 8, color: 'var(--driver-text)', fontSize: 21, fontWeight: 600, lineHeight: 1.15 }}>{value}</div>
      <div style={{ marginTop: 5, color: 'var(--driver-faint)', fontSize: 10 }}>{detail}</div>
    </article>
  );
}

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <h2 style={{ margin: 0, color: 'var(--driver-text)', fontSize: 14, fontWeight: 600 }}>{title}</h2>
      {count !== undefined && <span style={{ color: 'var(--driver-faint)', fontSize: 11 }}>{count} records</span>}
    </div>
  );
}

function RouteHistoryRow({ route }: { route: OpsDriverCorporateRouteHistory }) {
  return (
    <Link
      href={`/routes/${encodeURIComponent(route.id)}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(110px, .7fr) minmax(0, 1fr) auto',
        alignItems: 'center',
        gap: 12,
        padding: '11px 0',
        borderTop: '1px solid var(--driver-border)',
        color: 'inherit',
        textDecoration: 'none',
      }}
    >
      <span style={{ color: 'var(--driver-accent)', fontWeight: 600, fontSize: 12 }}>
        {route.id.slice(0, 12).toUpperCase()}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--driver-text)', fontSize: 12 }}>
          {route.tenant?.name || 'Corporate route'} · {route.office?.name || 'Office unavailable'}
        </span>
        <span style={{ display: 'block', marginTop: 3, color: 'var(--driver-faint)', fontSize: 10 }}>
          {formatDate(route.shiftDate)} · {route.shiftTime || 'Shift time unavailable'} · {readable(route.direction)}
        </span>
      </span>
      <StatusPill status={route.status} />
    </Link>
  );
}

function TripHistoryRow({ trip }: { trip: OpsDriverTripHistory }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, .65fr) minmax(0, 1fr) auto', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: '1px solid var(--driver-border)' }}>
      <span style={{ color: 'var(--driver-subtle)', fontSize: 11, fontWeight: 600 }}>{trip.id.slice(0, 12).toUpperCase()}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--driver-text)', fontSize: 11 }}>
          {trip.pickupAddress || 'Pickup unavailable'} → {trip.dropAddress || 'Drop-off unavailable'}
        </span>
        <span style={{ display: 'block', marginTop: 3, color: 'var(--driver-faint)', fontSize: 10 }}>
          {formatDate(trip.completedAt || trip.startedAt || trip.reportingTime || trip.createdAt)}
        </span>
      </span>
      <StatusPill status={trip.status} />
    </div>
  );
}

function EmptyHistory({ label }: { label: string }) {
  return (
    <div style={{ padding: '22px 10px', textAlign: 'center', color: 'var(--driver-faint)', fontSize: 11 }}>
      No {label} are recorded for this driver.
    </div>
  );
}

export default function DriverDetailsPage() {
  const params = useParams<{ id: string }>();
  const driverId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [driver, setDriver] = useState<OpsDriverDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [action, setAction] = useState<DriverAction | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDriver = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setDriver(await opsApi.getDriver(driverId));
    } catch (error) {
      setDriver(null);
      setLoadError(error instanceof Error ? error.message : 'Unable to load this driver.');
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    void loadDriver();
  }, [loadDriver]);

  const metrics = useMemo(() => {
    if (!driver) return null;
    const corporateRoutes = driver.history.corporateRoutes;
    const trips = driver.history.trips;
    const completedRoutes = corporateRoutes.filter((route) => route.status === 'COMPLETED').length;
    const completedTrips = trips.filter((trip) => trip.status === 'COMPLETED').length;
    const cancelledTrips = trips.filter((trip) => trip.status === 'CANCELLED').length;
    const activeRoutes = corporateRoutes.filter((route) => ['ASSIGNED', 'DISPATCHING', 'IN_TRANSIT'].includes(route.status)).length;
    return {
      routeCount: corporateRoutes.length,
      completedRoutes,
      activeRoutes,
      tripCount: trips.length,
      completedTrips,
      cancelledTrips,
    };
  }, [driver]);

  function openAction(nextAction: DriverAction) {
    setReason('');
    setActionError('');
    setActionNotice('');
    setAction(nextAction);
  }

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!driver || !action || submitting) return;
    const needsReason = action === 'suspend' || action === 'deactivate';
    const value = reason.trim();
    if (needsReason && value.length < 5) {
      setActionError('Please enter a reason of at least 5 characters.');
      return;
    }
    setSubmitting(true);
    setActionError('');
    try {
      if (action === 'suspend') await opsApi.suspendDriver(driver.driverId, value);
      if (action === 'reactivate') await opsApi.reactivateDriver(driver.driverId, value);
      if (action === 'deactivate') await opsApi.deactivateDriverAccount(driver.driverId, value);
      if (action === 'activate') await opsApi.activateDriverAccount(driver.driverId, value);
      const notice = {
        suspend: 'Driver suspended. Existing driver sessions have been revoked.',
        reactivate: 'Driver reactivated.',
        deactivate: 'Driver account deactivated. Driver and trip history were preserved.',
        activate: 'Driver account reactivated.',
      }[action];
      setAction(null);
      setActionNotice(notice);
      await loadDriver();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The driver action could not be completed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="driverDashboard" style={{ padding: 24, color: 'var(--driver-faint)' }}>Loading driver profile…</div>;
  }

  if (!driver) {
    return (
      <div className="driverDashboard">
        <Link href="/drivers" className="driverRouteLink" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <ArrowLeft size={14} /> Back to drivers
        </Link>
        <div role="alert" style={{ ...cardStyle, color: 'var(--color-danger)', borderColor: 'var(--color-danger-border)' }}>
          {loadError || 'Driver not found.'}
          <button type="button" onClick={() => void loadDriver()} style={{ marginLeft: 12, color: 'inherit', border: 0, background: 'transparent', font: 'inherit', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { profile, trustScore, verificationDocuments, history } = driver;
  const offerCount = trustScore.acceptedOffers + trustScore.declinedOffers;
  const acceptanceRate = offerCount > 0 ? trustScore.acceptanceRate : null;
  const actionConfig = action
    ? {
        suspend: { title: 'Suspend driver', description: 'This blocks the driver from using their driver account. Enter a reason for the audit record.', confirm: 'Suspend driver', needsReason: true, danger: true },
        reactivate: { title: 'Unsuspend driver', description: 'Restore the driver’s verified status and account access.', confirm: 'Unsuspend driver', needsReason: false, danger: false },
        deactivate: { title: 'Deactivate driver account', description: 'This is reversible and preserves the driver profile and ride history. The driver will be signed out.', confirm: 'Deactivate account', needsReason: true, danger: true },
        activate: { title: 'Reactivate driver account', description: 'Restore access to this deactivated driver account.', confirm: 'Reactivate account', needsReason: false, danger: false },
      }[action]
    : null;

  return (
    <div className="driverDashboard">
      <div style={{ marginBottom: 14 }}>
        <Link href="/drivers" className="driverRouteLink" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} /> Back to drivers
        </Link>
      </div>

      <section className="driverCard" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, minWidth: 0 }}>
            <div aria-hidden="true" style={{ width: 48, height: 48, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 12, background: 'color-mix(in srgb, var(--driver-accent) 10%, var(--bg-surface))', color: 'var(--driver-accent)' }}>
              <UserRound size={23} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, color: 'var(--driver-text)', fontSize: 20, fontWeight: 600 }}>
                {profile.fullName || 'Unnamed driver'}
              </h1>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 14px', marginTop: 7, color: 'var(--driver-subtle)', fontSize: 11 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Phone size={12} />{profile.phone || 'Phone unavailable'}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Mail size={12} />{profile.email || 'Email unavailable'}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
                <StatusPill status={profile.verificationStatus} />
                <StatusPill status={profile.availabilityStatus} />
                <StatusPill status={profile.userStatus || 'UNKNOWN'} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {profile.verificationStatus === 'VERIFIED' && (
              <button type="button" onClick={() => openAction('suspend')} style={actionButtonStyle('danger')}>Suspend</button>
            )}
            {profile.verificationStatus === 'SUSPENDED' && (
              <button type="button" onClick={() => openAction('reactivate')} style={actionButtonStyle('primary')}>Unsuspend</button>
            )}
            {profile.userStatus === 'DEACTIVATED' ? (
              <button type="button" onClick={() => openAction('activate')} style={actionButtonStyle('secondary')}>Reactivate account</button>
            ) : profile.userStatus === 'ACTIVE' ? (
              <button type="button" onClick={() => openAction('deactivate')} style={actionButtonStyle('secondary')}>Deactivate account</button>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--driver-border)' }}>
          <ProfileFact icon={<CarFront size={14} />} label="Vehicle" value={[profile.vehicleModel, profile.vehicleType].filter(Boolean).join(' · ') || 'Not provided'} />
          <ProfileFact icon={<CarFront size={14} />} label="Registration" value={profile.vehiclePlate || 'Not provided'} />
          <ProfileFact icon={<CalendarDays size={14} />} label="Joined" value={formatDate(profile.createdAt)} />
          <ProfileFact icon={<Clock3 size={14} />} label="Profile updated" value={formatDate(profile.updatedAt)} />
        </div>
      </section>

      {(actionNotice || actionError) && (
        <div role={actionError ? 'alert' : 'status'} style={{ marginBottom: 14, padding: '10px 12px', border: `1px solid ${actionError ? 'var(--color-danger-border)' : 'var(--color-success-border)'}`, borderRadius: 8, background: actionError ? 'var(--color-danger-bg)' : 'var(--color-success-bg)', color: actionError ? 'var(--color-danger)' : 'var(--color-success)' }}>
          {actionError || actionNotice}
        </div>
      )}

      <div className="driverSplit">
        <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
          <section className="driverCard" style={{ padding: 16 }}>
            <SectionHeading title="Corporate route history" count={history.corporateRoutes.length} />
            {history.corporateRoutes.length ? history.corporateRoutes.map((route) => <RouteHistoryRow key={route.id} route={route} />) : <EmptyHistory label="corporate routes" />}
            {history.corporateRoutes.length >= 50 && (
              <p style={{ margin: '10px 0 0', color: 'var(--driver-faint)', fontSize: 10 }}>Showing the latest 50 routes.</p>
            )}
          </section>

          <section className="driverCard" style={{ padding: 16 }}>
            <SectionHeading title="Trip history" count={history.trips.length} />
            {history.trips.length ? history.trips.map((trip) => <TripHistoryRow key={trip.id} trip={trip} />) : <EmptyHistory label="trips" />}
            {history.trips.length >= 50 && (
              <p style={{ margin: '10px 0 0', color: 'var(--driver-faint)', fontSize: 10 }}>Showing the latest 50 trips.</p>
            )}
          </section>
        </div>

        <aside style={{ display: 'grid', gap: 14, minWidth: 0 }}>
          <section className="driverCard" style={{ padding: 16 }}>
            <SectionHeading title="Driver metrics" />
            <div className="driverMetricGrid">
              <Metric label="Trust score" value={trustScore.score === null ? '—' : `${Math.round(trustScore.score)}`} detail="Platform driver score" icon={<Shield size={14} />} />
              <Metric label="Average rating" value={trustScore.ratingCount && trustScore.averageRating !== null ? trustScore.averageRating.toFixed(1) : '—'} detail={`${trustScore.ratingCount} ratings`} icon={<Star size={14} />} />
              <Metric label="Recent routes" value={String(metrics?.routeCount ?? 0)} detail={`${metrics?.completedRoutes ?? 0} completed · ${metrics?.activeRoutes ?? 0} active`} icon={<MapPin size={14} />} />
              <Metric label="Recent trip records" value={String(metrics?.tripCount ?? 0)} detail={`${metrics?.completedTrips ?? 0} completed · ${metrics?.cancelledTrips ?? 0} cancelled`} icon={<CarFront size={14} />} />
            </div>
            <p style={{ margin: '8px 0 0', color: 'var(--driver-faint)', fontSize: 10 }}>
              Route and trip history shows the latest 50 records of each type.
            </p>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--driver-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6, color: 'var(--driver-subtle)', fontSize: 11 }}>
                <span>Offer acceptance</span>
                <strong style={{ color: 'var(--driver-text)' }}>
                  {offerCount === 0
                    ? 'No offer data'
                    : acceptanceRate === null
                      ? 'Unavailable'
                      : `${acceptanceRate.toFixed(1)}%`}
                </strong>
              </div>
              {acceptanceRate !== null && (
                <div role="progressbar" aria-label="Offer acceptance rate" aria-valuenow={Math.max(0, Math.min(100, acceptanceRate))} aria-valuemin={0} aria-valuemax={100} style={{ height: 6, overflow: 'hidden', borderRadius: 999, background: 'var(--driver-muted)' }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, acceptanceRate))}%`, height: '100%', borderRadius: 999, background: 'var(--driver-accent)' }} />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 6, color: 'var(--driver-faint)', fontSize: 10 }}>
                <span>{trustScore.acceptedOffers} accepted</span>
                <span>{trustScore.declinedOffers} declined</span>
              </div>
            </div>
          </section>

          <section className="driverCard" style={{ padding: 16 }}>
            <SectionHeading title="Verification checklist" count={verificationDocuments.length} />
            <div className="driverDocumentGrid">
              {verificationDocuments.map((document) => (
                <div key={document.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 10px', border: '1px solid var(--driver-border)', borderRadius: 8 }}>
                  <span style={{ minWidth: 0, color: 'var(--driver-subtle)', fontSize: 10 }}>
                    {readable(document.type)}
                    <span style={{ display: 'block', marginTop: 3, color: 'var(--driver-faint)' }}>{document.uploaded ? 'Uploaded' : 'Not uploaded'}</span>
                  </span>
                  {document.status === 'VERIFIED' ? <CheckCircle2 size={15} color="var(--driver-green)" aria-label="Verified" /> : <StatusPill status={document.status} />}
                </div>
              ))}
            </div>
            <p style={{ margin: '10px 0 0', color: 'var(--driver-faint)', fontSize: 10 }}>
              Document contents are intentionally not shown in this Ops dashboard.
            </p>
          </section>
        </aside>
      </div>

      {actionConfig && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) setAction(null);
          }}
          style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15, 23, 42, .48)' }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="driver-action-title"
            onSubmit={submitAction}
            style={{ width: 'min(100%, 440px)', padding: 20, border: '1px solid var(--driver-border)', borderRadius: 12, background: 'var(--bg-surface)', boxShadow: 'var(--shadow-elevated)' }}
          >
            <h2 id="driver-action-title" style={{ margin: 0, color: 'var(--driver-text)', fontSize: 17 }}>{actionConfig.title}</h2>
            <p style={{ margin: '8px 0 14px', color: 'var(--driver-subtle)', fontSize: 12, lineHeight: 1.55 }}>{actionConfig.description}</p>
            {actionConfig.needsReason && (
              <label style={{ display: 'block', color: 'var(--driver-subtle)', fontSize: 11 }}>
                Reason <span aria-hidden="true">*</span>
                <textarea
                  autoFocus
                  required
                  minLength={5}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Add a short reason for the audit record"
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: 10, border: '1px solid var(--driver-border)', borderRadius: 8, background: 'var(--bg-input)', color: 'var(--driver-text)', font: 'inherit', resize: 'vertical' }}
                />
              </label>
            )}
            {!actionConfig.needsReason && (
              <label style={{ display: 'block', color: 'var(--driver-subtle)', fontSize: 11 }}>
                Note (optional)
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={500}
                  style={{ display: 'block', width: '100%', height: 36, marginTop: 6, padding: '0 10px', border: '1px solid var(--driver-border)', borderRadius: 8, background: 'var(--bg-input)', color: 'var(--driver-text)', font: 'inherit' }}
                />
              </label>
            )}
            {actionError && <p role="alert" style={{ margin: '10px 0 0', color: 'var(--color-danger)', fontSize: 11 }}>{actionError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button type="button" disabled={submitting} onClick={() => setAction(null)} style={actionButtonStyle('secondary')}>Cancel</button>
              <button type="submit" disabled={submitting} style={actionButtonStyle(actionConfig.danger ? 'danger' : 'primary')}>
                {submitting ? 'Saving…' : actionConfig.confirm}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ProfileFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>
      <span style={{ display: 'inline-flex', marginTop: 1, color: 'var(--driver-accent)' }}>{icon}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', color: 'var(--driver-faint)', fontSize: 10 }}>{label}</span>
        <span style={{ display: 'block', marginTop: 3, overflowWrap: 'anywhere', color: 'var(--driver-subtle)', fontSize: 11 }}>{value}</span>
      </span>
    </div>
  );
}

function actionButtonStyle(tone: 'primary' | 'secondary' | 'danger'): React.CSSProperties {
  const colors = {
    primary: { background: 'var(--brand-blue-500)', color: '#fff', border: 'var(--brand-blue-500)' },
    secondary: { background: 'var(--bg-surface)', color: 'var(--driver-subtle)', border: 'var(--driver-border)' },
    danger: { background: 'var(--color-danger)', color: '#fff', border: 'var(--color-danger)' },
  }[tone];
  return {
    minHeight: 34,
    padding: '0 11px',
    border: `1px solid ${colors.border}`,
    borderRadius: 7,
    background: colors.background,
    color: colors.color,
    font: 'inherit',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  };
}

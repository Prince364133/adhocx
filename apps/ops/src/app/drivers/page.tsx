'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CarFront, ChevronLeft, ChevronRight, Search, ShieldCheck, Star, Users } from 'lucide-react';
import { opsApi } from '../../lib/api/opsClient';
import type { OpsDriverListItem, OpsDriverListResponse } from '../../lib/api/opsTypes';
import './driver-dashboard.css';

const PAGE_SIZE = 20;
const STATUS_FILTERS = [
  { id: 'ALL', label: 'All drivers' },
  { id: 'VERIFIED', label: 'Verified' },
  { id: 'UNDER_REVIEW', label: 'Under review' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'SUSPENDED', label: 'Suspended' },
];

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--driver-border)',
  borderRadius: 10,
  background: 'var(--bg-surface)',
};

function StatusPill({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const tone =
    normalized === 'VERIFIED' || normalized === 'AVAILABLE' || normalized === 'ACTIVE'
      ? 'var(--driver-green)'
      : normalized === 'SUSPENDED' || normalized === 'DEACTIVATED' || normalized === 'REJECTED'
        ? 'var(--driver-red)'
        : 'var(--driver-amber)';
  return (
    <span
      style={{
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
      }}
    >
      {normalized.replaceAll('_', ' ')}
    </span>
  );
}

function DriverRow({ driver, onOpen }: { driver: OpsDriverListItem; onOpen: () => void }) {
  const name = driver.profile.fullName?.trim() || 'Unnamed driver';
  return (
    <tr
      role="link"
      tabIndex={0}
      aria-label={`Open ${name}'s driver profile`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      <td>
        <Link
          href={`/drivers/${encodeURIComponent(driver.driverId)}`}
          className="driverRouteLink"
          onClick={(event) => event.stopPropagation()}
        >
          {name} <ArrowRight size={13} style={{ verticalAlign: -2 }} />
        </Link>
        <div style={{ marginTop: 4, color: 'var(--driver-faint)' }}>{driver.profile.phone || 'Phone not provided'}</div>
      </td>
      <td>
        <StatusPill status={driver.profile.verificationStatus} />
        <div style={{ marginTop: 5, color: 'var(--driver-faint)' }}>
          {driver.verificationDocuments.filter((document) => document.status === 'VERIFIED').length}/
          {driver.verificationDocuments.length} documents verified
        </div>
      </td>
      <td>
        <StatusPill status={driver.profile.availabilityStatus} />
      </td>
      <td>
        <div style={{ color: 'var(--driver-text)', fontWeight: 600 }}>
          {driver.profile.vehiclePlate || 'No vehicle'}
        </div>
        <div style={{ marginTop: 4, color: 'var(--driver-faint)' }}>
          {[driver.profile.vehicleModel, driver.profile.vehicleType].filter(Boolean).join(' · ') || 'Vehicle details unavailable'}
        </div>
      </td>
      <td>
        <span style={{ color: 'var(--driver-text)', fontWeight: 600 }}>
          {driver.trustScore.score === null ? '—' : driver.trustScore.score.toFixed(0)}
        </span>
        <div style={{ marginTop: 4, color: 'var(--driver-faint)' }}>
          {driver.trustScore.ratingCount > 0 && driver.trustScore.averageRating !== null
            ? `${driver.trustScore.averageRating.toFixed(1)} rating`
            : 'No ratings'}
        </div>
      </td>
      <td style={{ textAlign: 'right' }}>
        <span style={{ color: 'var(--driver-text)', fontWeight: 600 }}>{driver.trustScore.totalTrips}</span>
      </td>
    </tr>
  );
}

export default function DriversPage() {
  const router = useRouter();
  const [response, setResponse] = useState<OpsDriverListResponse | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [availability, setAvailability] = useState('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      void opsApi.getDrivers({
        page,
        pageSize: PAGE_SIZE,
        search,
        verificationStatus: status,
        availabilityStatus: availability,
      }).then((result) => {
        if (active) setResponse(result);
      }).catch((loadError: unknown) => {
        if (!active) return;
        setResponse(null);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load drivers.');
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, search ? 250 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [availability, page, reload, search, status]);

  function changeFilter(update: () => void) {
    setPage(1);
    update();
  }

  return (
    <div className="driverDashboard">
      <header className="driverHeader">
        <div>
          <h1>Drivers</h1>
          <p>Driver profiles, verification, trust score, and operating history</p>
        </div>
        <button
          type="button"
          onClick={() => setReload((value) => value + 1)}
          style={{
            minHeight: 34,
            padding: '0 12px',
            border: '1px solid var(--driver-border)',
            borderRadius: 8,
            background: 'var(--bg-surface)',
            color: 'var(--driver-subtle)',
            font: 'inherit',
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </header>

      <section style={{ ...cardStyle, marginBottom: 16, overflow: 'hidden' }}>
        <div className="driverFilterBar">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }} aria-label="Filter by verification status">
            {STATUS_FILTERS.map((filter) => {
              const active = status === filter.id;
              return (
                <button
                  type="button"
                  key={filter.id}
                  aria-pressed={active}
                  onClick={() => changeFilter(() => setStatus(filter.id))}
                  style={{
                    padding: '6px 9px',
                    border: `1px solid ${active ? 'color-mix(in srgb, var(--driver-accent) 32%, var(--driver-border))' : 'var(--driver-border)'}`,
                    borderRadius: 999,
                    background: active ? 'color-mix(in srgb, var(--driver-accent) 9%, var(--bg-surface))' : 'transparent',
                    color: active ? 'var(--driver-accent)' : 'var(--driver-subtle)',
                    font: 'inherit',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <label style={{ position: 'relative', width: 'min(100%, 300px)' }}>
            <Search size={14} aria-hidden="true" style={{ position: 'absolute', top: '50%', left: 10, transform: 'translateY(-50%)', color: 'var(--driver-faint)' }} />
            <input
              type="search"
              value={search}
              onChange={(event) => changeFilter(() => setSearch(event.target.value))}
              placeholder="Search name, phone, email, plate..."
              aria-label="Search drivers"
              style={{
                width: '100%',
                height: 34,
                padding: '0 10px 0 30px',
                border: '1px solid var(--driver-border)',
                borderRadius: 8,
                background: 'var(--bg-input)',
                color: 'var(--driver-text)',
                font: 'inherit',
                fontSize: 12,
              }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--driver-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--driver-subtle)', fontSize: 12 }}>
            <Users size={15} color="var(--driver-accent)" />
            {loading ? 'Loading drivers…' : `${response?.total ?? 0} drivers`}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--driver-faint)', fontSize: 11 }}>
            Availability
            <select
              value={availability}
              onChange={(event) => changeFilter(() => setAvailability(event.target.value))}
              style={{ height: 30, padding: '0 8px', border: '1px solid var(--driver-border)', borderRadius: 7, background: 'var(--bg-input)', color: 'var(--driver-subtle)', font: 'inherit' }}
            >
              <option value="ALL">All</option>
              <option value="AVAILABLE">Available</option>
              <option value="BUSY">Busy</option>
              <option value="OFFLINE">Offline</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>
          </label>
        </div>

        {error && (
          <div role="alert" style={{ margin: 14, padding: 12, border: '1px solid var(--color-danger-border)', borderRadius: 8, background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
            <div>{error}</div>
            <button type="button" onClick={() => setReload((value) => value + 1)} style={{ marginTop: 8, border: 0, background: 'transparent', color: 'inherit', font: 'inherit', fontWeight: 600, cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        )}

        <div className="driverTableWrap">
          <table className="driverTable">
            <thead>
              <tr>
                <th scope="col">Driver</th>
                <th scope="col">Verification</th>
                <th scope="col">Availability</th>
                <th scope="col">Vehicle</th>
                <th scope="col">Trust & rating</th>
                <th scope="col" style={{ textAlign: 'right' }}>Trips</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: 'var(--driver-faint)' }}>Loading driver records…</td></tr>
              ) : error ? (
                <tr><td colSpan={6} style={{ padding: 28, textAlign: 'center', color: 'var(--driver-faint)' }}>Driver list could not be loaded.</td></tr>
              ) : response?.items.length ? (
                response.items.map((driver) => (
                  <DriverRow
                    key={driver.driverId}
                    driver={driver}
                    onOpen={() => router.push(`/drivers/${encodeURIComponent(driver.driverId)}`)}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: 36, textAlign: 'center' }}>
                    <CarFront size={22} color="var(--driver-faint)" style={{ marginBottom: 8 }} />
                    <div style={{ color: 'var(--driver-text)', fontWeight: 600 }}>No drivers found</div>
                    <div style={{ marginTop: 4, color: 'var(--driver-faint)' }}>Try a different search or verification filter.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderTop: '1px solid var(--driver-border)', color: 'var(--driver-faint)', fontSize: 11 }}>
          <span>
            {response?.total ? `Page ${response.page} of ${Math.max(response.totalPages, 1)}` : 'No records'}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              aria-label="Previous page"
              disabled={loading || page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 8px', border: '1px solid var(--driver-border)', borderRadius: 7, background: 'var(--bg-surface)', color: 'var(--driver-subtle)', opacity: page <= 1 ? 0.5 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              type="button"
              aria-label="Next page"
              disabled={loading || page >= (response?.totalPages ?? 0)}
              onClick={() => setPage((value) => value + 1)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 8px', border: '1px solid var(--driver-border)', borderRadius: 7, background: 'var(--bg-surface)', color: 'var(--driver-subtle)', opacity: page >= (response?.totalPages ?? 0) ? 0.5 : 1, cursor: page >= (response?.totalPages ?? 0) ? 'not-allowed' : 'pointer' }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </footer>
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, color: 'var(--driver-faint)', fontSize: 11 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><ShieldCheck size={13} />Verification status reflects driver KYC review.</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Star size={13} />Trust score and ratings are provided by the driver record.</span>
      </div>
    </div>
  );
}

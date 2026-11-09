'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { opsApi } from '../../lib/api/opsClient';
import { TripListItem, TripEvent } from '../../lib/api/opsTypes';
import { Button } from '../../components/common/Button';
import { Drawer } from '../../components/common/Drawer';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Column, DataTable, FilterBar, PageHeader } from '../../components/operations/OperationsTable';
import { CorporateRouteManagementSection } from './CorporateRouteManagementSection';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Trips' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'ASSIGNED', label: 'Assigned' },
  { id: 'ARRIVED', label: 'Arrived' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'NO_SHOW', label: 'No Show' },
];

export default function TripsPage() {
  const [activeModule, setActiveModule] = useState<'CORPORATE_ETS' | 'ON_DEMAND'>('CORPORATE_ETS');
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<TripListItem | null>(null);
  const [events, setEvents] = useState<TripEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  useEffect(() => {
    if (activeModule === 'ON_DEMAND') {
      loadTrips(activeTab);
    }
  }, [activeTab, activeModule]);

  async function loadTrips(status: string) {
    setLoading(true);
    setLoadError(null);
    try {
      setTrips(await opsApi.getTrips(status));
    } catch (error) {
      setTrips([]);
      setLoadError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search) return trips;
    const q = search.toLowerCase();
    return trips.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        (t.driverName && t.driverName.toLowerCase().includes(q)) ||
        (t.vehiclePlate && t.vehiclePlate.toLowerCase().includes(q)) ||
        t.pickupAddress.toLowerCase().includes(q) ||
        t.dropAddress.toLowerCase().includes(q)
    );
  }, [trips, search]);

  async function handleOpenTelemetry(trip: TripListItem) {
    setSelectedTrip(trip);
    setEventsLoading(true);
    setEventsError(null);
    try {
      setEvents(await opsApi.getTripEvents(trip.id));
    } catch (error) {
      setEvents([]);
      setEventsError(error instanceof Error ? error.message : String(error));
    } finally {
      setEventsLoading(false);
    }
  }

  const columns: Column<TripListItem>[] = [
    {
      key: 'id',
      label: 'Trip ID',
      sortable: true,
      render: (t) => (
        <div>
          <span className="code-tag">TRP-{t.id.slice(0, 8).toUpperCase()}</span>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Req: REQ-{t.requirementId.slice(0, 8).toUpperCase()}
          </div>
        </div>
      ),
    },
    {
      key: 'driverName',
      label: 'Assigned Driver & Vehicle',
      render: (t) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.driverName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.driverPhone}</div>
          <div style={{ marginTop: '0.2rem' }}>
            <span className="code-tag">{t.vehiclePlate}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'route',
      label: 'Route',
      render: (t) => (
        <div style={{ maxWidth: '300px' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ color: 'var(--color-success)' }}>●</span> {t.pickupAddress}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.15rem' }}>
            <span style={{ color: 'var(--color-danger)' }}>▼</span> {t.dropAddress}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Trip Status',
      sortable: true,
      render: (t) => <StatusBadge status={t.status} size="sm" pulse />,
    },
    {
      key: 'totalDriverEarnings',
      label: 'Earnings',
      sortable: true,
      render: (t) => (
        <div>
          <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
            ₹{Number(t.totalDriverEarnings || t.driverRate || 0).toLocaleString('en-IN')}
          </div>
          {(t.tollCharges || t.parkingCharges) && (
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              +₹{(t.tollCharges || 0) + (t.parkingCharges || 0)} tolls/parking
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Telemetry',
      align: 'right',
      render: (t) => (
        <Button variant="secondary" size="sm" onClick={() => handleOpenTelemetry(t)}>
          Telemetry ↗
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Trips & Corporate Ride Management"
        subtitle="Manage corporate commute routes, autonomous H3 dispatch, manual override, and ride telemetry"
        liveStatus="GPS Fleet Active"
      />

      {/* Module Selector: Corporate ETS vs On-Demand */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle, #334155)',
          paddingBottom: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <button
          onClick={() => setActiveModule('CORPORATE_ETS')}
          style={{
            background: activeModule === 'CORPORATE_ETS' ? 'var(--color-primary, #F59E0B)' : 'transparent',
            color: activeModule === 'CORPORATE_ETS' ? '#0F172A' : 'var(--text-secondary, #94A3B8)',
            border: 'none',
            padding: '0.5rem 1.25rem',
            borderRadius: '0.5rem',
            fontWeight: 800,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>🏢</span> Corporate Commute Routes (ETS)
        </button>

        <button
          onClick={() => setActiveModule('ON_DEMAND')}
          style={{
            background: activeModule === 'ON_DEMAND' ? 'var(--color-primary, #F59E0B)' : 'transparent',
            color: activeModule === 'ON_DEMAND' ? '#0F172A' : 'var(--text-secondary, #94A3B8)',
            border: 'none',
            padding: '0.5rem 1.25rem',
            borderRadius: '0.5rem',
            fontWeight: 800,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>🚕</span> On-Demand Trips & Telemetry
        </button>
      </div>

      {activeModule === 'CORPORATE_ETS' ? (
        <CorporateRouteManagementSection />
      ) : (
        <>
          <FilterBar
            tabs={STATUS_TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search trip ID, driver, vehicle plate, route..."
          />
          {loadError && (
            <p role="alert" style={{ color: 'var(--color-danger)', margin: '0 0 1rem' }}>
              Could not load trips: {loadError}
            </p>
          )}

          <DataTable
            columns={columns}
            data={filtered}
            keyExtractor={(t) => t.id}
            loading={loading}
            emptyTitle="No trips found"
            emptySubtitle={`No trips currently match the filter: "${activeTab}".`}
          />

          {/* Slide-out Telemetry Drawer */}
          <Drawer
            isOpen={!!selectedTrip}
            onClose={() => setSelectedTrip(null)}
            title={selectedTrip ? `Trip Telemetry — TRP-${selectedTrip.id.slice(0, 8).toUpperCase()}` : ''}
            subtitle={selectedTrip ? `Driver: ${selectedTrip.driverName} (${selectedTrip.vehiclePlate})` : ''}
            width="600px"
          >
            {selectedTrip && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status</div>
                    <div style={{ marginTop: '0.25rem' }}>
                      <StatusBadge status={selectedTrip.status} size="sm" pulse />
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Started At</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                      {selectedTrip.startedAt ? new Date(selectedTrip.startedAt).toLocaleTimeString() : 'Pending'}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  GPS Telemetry Events
                </div>

                {eventsError ? (
                  <div role="alert" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-danger)' }}>
                    Could not load trip telemetry: {eventsError}
                  </div>
                ) : eventsLoading ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                    Loading events...
                  </div>
                ) : events.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                    No telemetry events recorded yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {events.map((ev, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-surface)',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{ev.eventType}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{new Date(ev.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {ev.metadata?.description || ev.eventType}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Drawer>
        </>
      )}
    </div>
  );
}

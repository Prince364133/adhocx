'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { adminApi } from '../../lib/api/client';
import { TripListItem, TripEvent } from '../../lib/api/types';
import {
  PageHeader,
  FilterBar,
  DataTable,
  Column,
  StatusBadge,
  Button,
  Drawer,
} from '../../components/common';

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
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<TripListItem | null>(null);
  const [events, setEvents] = useState<TripEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    loadTrips(activeTab);
  }, [activeTab]);

  async function loadTrips(status: string) {
    setLoading(true);
    try {
      const data = await adminApi.getTrips(status).catch(() => [] as TripListItem[]);
      setTrips(data);
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
    try {
      const data = await adminApi.getTripEvents(trip.id).catch(() => [] as TripEvent[]);
      setEvents(data);
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
      render: (t) => <StatusBadge status={t.status} size="sm" showPulse />,
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
        title="Trips & Telemetry Tracking"
        subtitle="Real-time ride execution tracking, GPS breadcrumbs, driver arrival confirmation, and billing breakdown"
        liveStatus="GPS Fleet Active"
      />

      <FilterBar
        tabs={STATUS_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search trip ID, driver, vehicle plate, route..."
      />

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
        footer={
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
            <Button variant="secondary" size="sm" onClick={() => setSelectedTrip(null)}>
              Close
            </Button>
          </div>
        }
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
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                <div style={{ marginTop: '0.35rem' }}>
                  <StatusBadge status={selectedTrip.status} showPulse />
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Driver Earnings</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.2rem' }}>
                  ₹{Number(selectedTrip.totalDriverEarnings || selectedTrip.driverRate).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Route */}
            <div style={{ marginBottom: '1.5rem', background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-success)' }}>● PICKUP</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {selectedTrip.pickupAddress}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-danger)' }}>▼ DROP OFF</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {selectedTrip.dropAddress}
              </div>
            </div>

            {/* Event Telemetry Breadcrumbs */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Live Geospatial Breadcrumbs & Events
              </h4>
              {eventsLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading telemetry breadcrumbs...
                </div>
              ) : events.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)' }}>
                  No GPS breadcrumbs logged for this trip yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      style={{
                        padding: '0.875rem 1rem',
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                          {evt.eventType.replace(/_/g, ' ')}
                        </div>
                        {evt.latitude && evt.longitude && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            Lat: {Number(evt.latitude).toFixed(4)}, Lng: {Number(evt.longitude).toFixed(4)}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(evt.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

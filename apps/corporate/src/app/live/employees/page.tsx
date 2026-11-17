'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Car, MapPin, Radio, Search, User } from 'lucide-react';
import { GoogleRouteMap } from '../../../components/maps/GoogleRouteMap';
import { employeeApi, routesApi } from '../../../lib/api/corporate';
import type { CorporateEmployee, CorporateRoute, RouteTracking } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

export default function EmployeeLiveTrackingPage() {
  const { tenantId } = useSession();
  const [employees, setEmployees] = useState<CorporateEmployee[]>([]);
  const [routes, setRoutes] = useState<CorporateRoute[]>([]);
  const [tracking, setTracking] = useState<RouteTracking | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setEmployees([]);
      setRoutes([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      employeeApi.list(tenantId, { limit: 100 }),
      routesApi.list(tenantId, { status: 'IN_PROGRESS' }),
    ])
      .then(([employeeResult, routeResult]) => {
        if (!active) return;
        const employeeItems = employeeResult.items;
        setEmployees(employeeItems);
        setRoutes(routeResult);
        setSelectedId((current) => employeeItems.some((employee) => employee.id === current)
          ? current
          : employeeItems[0]?.id ?? null);
      })
      .catch((err) => {
        console.error('Failed to load employee tracking data:', err);
        if (active) setError('Unable to load employee and route records. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tenantId]);

  const selectedEmployee = employees.find((employee) => employee.id === selectedId) ?? null;
  const selectedRoute = useMemo(
    () => selectedEmployee
      ? routes.find((route) => route.stops?.some((stop) => stop.employee?.id === selectedEmployee.id)) ?? null
      : null,
    [routes, selectedEmployee],
  );

  useEffect(() => {
    if (!selectedRoute) {
      setTracking(null);
      return;
    }

    let active = true;
    const loadTracking = () => {
      routesApi.tracking(selectedRoute.id)
        .then((data) => {
          if (active) setTracking(data);
        })
        .catch((err) => {
          console.error('Failed to load employee route GPS data:', err);
          if (active) setTracking(null);
        });
    };
    loadTracking();
    const timer = setInterval(loadTracking, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedRoute?.id]);

  const searchResults = employees.filter((employee) => {
    const query = search.trim().toLowerCase();
    return !query || [
      employee.fullName,
      employee.employeeCode,
      employee.department,
    ].some((value) => value?.toLowerCase().includes(query));
  });

  const mapStops = selectedRoute?.stops?.map((stop) => ({
    id: stop.id,
    stopSequence: stop.stopSequence,
    stopType: stop.stopType,
    employeeName: stop.employee?.fullName ?? null,
    employeePhone: stop.employee?.phoneNumber ?? null,
    addressText: stop.addressText ?? stop.address ?? null,
    lat: Number(stop.latitude),
    lng: Number(stop.longitude),
    plannedEta: stop.plannedEta,
    dwellBufferSeconds: stop.dwellBufferSeconds,
    status: stop.status,
  })) ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Employee Tracking
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
          Employee, route, and GPS details from this company&apos;s active transport records
        </p>
      </div>

      <div className="surface-card" style={{ padding: 16 }}>
        <div style={{ position: 'relative', maxWidth: 480 }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employee name, ID, or department..."
            aria-label="Search employees"
            style={{ width: '100%', height: 40, padding: '0 12px 0 38px', border: '1px solid var(--border-strong)', borderRadius: 8 }}
          />
        </div>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading tenant employees and active routes...</p>
        ) : error ? (
          <p role="alert" style={{ color: '#B91C1C' }}>{error}</p>
        ) : searchResults.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No tenant employees match this search.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {searchResults.map((employee) => (
              <button
                type="button"
                key={employee.id}
                onClick={() => setSelectedId(employee.id)}
                aria-pressed={selectedId === employee.id}
                style={{
                  padding: '7px 10px',
                  borderRadius: 6,
                  border: `1px solid ${selectedId === employee.id ? '#5728B2' : 'var(--border-strong)'}`,
                  background: selectedId === employee.id ? '#EFF6FF' : 'var(--bg-surface)',
                  cursor: 'pointer',
                }}
              >
                {employee.fullName} · {employee.employeeCode}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedEmployee && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <section className="surface-card" style={{ padding: 20 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, marginTop: 0 }}>
              <User size={17} /> {selectedEmployee.fullName}
            </h2>
            <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: 0 }}>
              <div><dt>Employee ID</dt><dd>{selectedEmployee.employeeCode}</dd></div>
              <div><dt>Status</dt><dd>{selectedEmployee.isActive ? 'Active' : 'Inactive'}</dd></div>
              <div><dt>Department</dt><dd>{selectedEmployee.department ?? '—'}</dd></div>
              <div><dt>Office</dt><dd>{selectedEmployee.office?.name ?? '—'}</dd></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <dt><MapPin size={13} style={{ verticalAlign: 'middle' }} /> Saved pickup address</dt>
                <dd>{selectedEmployee.locations?.find((location) => location.isDefault)?.addressText ?? selectedEmployee.locations?.[0]?.addressText ?? '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="surface-card" style={{ padding: 20 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, marginTop: 0 }}>
              <Car size={17} /> Active route
            </h2>
            {selectedRoute ? (
              <>
                <p>Route: {selectedRoute.routeNumber ?? selectedRoute.routeCode ?? selectedRoute.id}</p>
                <p>Driver: {selectedRoute.driver?.fullName ?? selectedRoute.driverName ?? '—'}</p>
                <p>Vehicle: {selectedRoute.vehicle?.registrationNumber ?? selectedRoute.vehiclePlate ?? '—'}</p>
                <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Radio size={14} /> GPS: {tracking?.gpsState ?? 'Unavailable'}
                  {tracking?.position && ` · recorded ${new Date(tracking.position.recordedAt).toLocaleString()}`}
                </p>
                <GoogleRouteMap
                  height={340}
                  office={selectedRoute.office?.latitude !== undefined && selectedRoute.office.longitude !== undefined
                    ? {
                        name: selectedRoute.office.name,
                        addressText: selectedRoute.office.addressText,
                        lat: Number(selectedRoute.office.latitude),
                        lng: Number(selectedRoute.office.longitude),
                      }
                    : null}
                  stops={mapStops}
                  livePosition={tracking?.position ? {
                    lat: tracking.position.lat,
                    lng: tracking.position.lng,
                    recordedAt: tracking.position.recordedAt,
                    gpsState: tracking.gpsState,
                  } : null}
                />
              </>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>No active route is linked to this employee.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

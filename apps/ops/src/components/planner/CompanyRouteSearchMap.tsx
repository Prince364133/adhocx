'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  Car,
  Compass,
  ExternalLink,
  Navigation,
  RefreshCw,
  Users,
} from 'lucide-react';
import { CorporateRouteItem, CorporateTenantOption } from '../../lib/api/opsTypes';
import { isOfficeHubStop } from '../../lib/opsHelpers';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { GoogleRouteMap, GoogleRouteMapOffice, GoogleRouteMapStop } from '../maps/GoogleRouteMap';

interface CompanyRouteSearchMapProps {
  selectedRoute: CorporateRouteItem | null;
  selectedRouteDetail: CorporateRouteItem | null;
  company: CorporateTenantOption | undefined;
  detailLoading: boolean;
  filteredCount: number;
  highlightedStopSequence: number | null;
  onSelectStop: (stopSequence: number) => void;
}

export const CompanyRouteSearchMap: React.FC<CompanyRouteSearchMapProps> = ({
  selectedRoute,
  selectedRouteDetail,
  company,
  detailLoading,
  filteredCount,
  highlightedStopSequence,
  onSelectStop,
}) => {
  const activeRoute =
    selectedRouteDetail && selectedRoute && selectedRouteDetail.id === selectedRoute.id
      ? selectedRouteDetail
      : selectedRoute;

  const mapOffice = useMemo<GoogleRouteMapOffice | null>(() => {
    const routeOffice = activeRoute?.office;
    const tenantOffice =
      company?.offices?.find(
        (off) =>
          (activeRoute?.officeId && off.id === activeRoute.officeId) ||
          (routeOffice?.id && off.id === routeOffice.id),
      ) ?? company?.offices?.[0];

    const lat = Number(routeOffice?.latitude ?? tenantOffice?.latitude);
    const lng = Number(routeOffice?.longitude ?? tenantOffice?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
      name: routeOffice?.name || tenantOffice?.name || 'Office Hub',
      addressText: routeOffice?.addressText || tenantOffice?.addressText || '',
      lat,
      lng,
    };
  }, [activeRoute, company]);

  const mapStops = useMemo<GoogleRouteMapStop[]>(() => {
    if (!activeRoute?.stops?.length) return [];
    return activeRoute.stops
      .filter((stop) => !isOfficeHubStop(stop))
      .sort((a, b) => a.stopSequence - b.stopSequence)
      .map((stop) => ({
        id: stop.id,
        stopSequence: stop.stopSequence,
        stopType: stop.stopType,
        employeeName: stop.employee?.fullName || stop.employeeName || 'Employee',
        employeePhone: stop.employee?.phoneNumber || stop.employeePhone || null,
        addressText: stop.addressText,
        lat: Number(stop.latitude),
        lng: Number(stop.longitude),
        plannedEta: stop.plannedEta,
        dwellBufferSeconds: stop.dwellBufferSeconds,
        status: stop.status,
      }));
  }, [activeRoute]);

  const decodedPath = useMemo<Array<{ lat: number; lng: number }> | undefined>(() => {
    if (activeRoute?.directions?.decodedPath?.length) {
      return activeRoute.directions.decodedPath;
    }
    if (activeRoute?.decodedPath?.length) {
      return activeRoute.decodedPath.map(([lat, lng]) => ({ lat, lng }));
    }
    return undefined;
  }, [activeRoute]);

  const distanceKm = activeRoute?.directions?.totalDistanceKm
    ? activeRoute.directions.totalDistanceKm.toFixed(1)
    : activeRoute?.estDistanceMeters
      ? (activeRoute.estDistanceMeters / 1000).toFixed(1)
      : null;

  const durationMin = activeRoute?.directions?.totalDurationMinutes
    ? Math.round(activeRoute.directions.totalDurationMinutes)
    : activeRoute?.estDurationSeconds
      ? Math.round(activeRoute.estDurationSeconds / 60)
      : null;

  if (!activeRoute) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <GoogleRouteMap office={mapOffice} stops={[]} height="100%" />
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 10,
            backgroundColor: 'var(--bg-surface)',
            padding: '14px 16px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
            maxWidth: '340px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Compass size={17} style={{ color: 'var(--brand-blue-500, #5728B2)' }} />
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Company Planned Route Map
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {filteredCount === 0
              ? 'No planned routes match your current search or filters. Clear filters or pick another company to preview routes on Google Maps.'
              : 'Select a matching route on the left to inspect its Google Maps road path, employee pickup stops, and office hub.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <GoogleRouteMap
        office={mapOffice}
        stops={mapStops}
        decodedPath={decodedPath}
        highlightedStopSequence={highlightedStopSequence}
        onSelectStop={onSelectStop}
        height="100%"
      />

      {/* Top Floating Telemetry HUD */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '56px',
          zIndex: 15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          backgroundColor: 'var(--bg-surface)',
          padding: '10px 14px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="code-tag">RT-{activeRoute.id.slice(0, 8).toUpperCase()}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {activeRoute.shiftTime} {activeRoute.direction}
            </span>
            <StatusBadge status={activeRoute.status} size="sm" />
            {detailLoading && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  color: 'var(--brand-blue-500, #5728B2)',
                  fontWeight: 600,
                }}
              >
                <RefreshCw size={11} className="spin" /> Syncing live traffic path...
              </span>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Users size={12} style={{ color: 'var(--brand-blue-500, #5728B2)' }} />
              <strong>{mapStops.length}</strong> Employees
            </span>
            {distanceKm && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Navigation size={12} style={{ color: 'var(--brand-blue-500, #5728B2)' }} />
                <strong>{distanceKm} km</strong>
                {durationMin ? ` (${durationMin} min)` : ''}
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Car size={12} />
              {activeRoute.driver?.fullName || 'Unassigned'}
              {activeRoute.vehicle?.registrationNumber ? ` · ${activeRoute.vehicle.registrationNumber}` : ''}
            </span>
            {mapOffice?.name && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Building2 size={12} style={{ color: '#059669' }} />
                {mapOffice.name}
              </span>
            )}
          </div>
        </div>

        <Link href={`/routes/${activeRoute.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
          <Button type="button" size="sm" variant="primary" rightIcon={<ExternalLink size={12} />}>
            Full Route View
          </Button>
        </Link>
      </div>
    </div>
  );
};

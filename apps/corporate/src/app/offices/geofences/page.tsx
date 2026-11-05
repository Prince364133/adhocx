'use client';

import React, { useState } from 'react';
import {
  MapPin,
  CircleDot,
  Sliders,
  CheckCircle2,
  Plus,
  Compass,
  Radio,
  Search,
  Layers,
} from 'lucide-react';
import { mockGeofencePoints } from '../../../lib/mock/corporateMockData';
import MiniLiveMap from '../../../components/maps/MiniLiveMap';

export default function GeofencesPickupPointsPage() {
  const [selectedZone, setSelectedZone] = useState(mockGeofencePoints[0]);
  const [radiusAdjustment, setRadiusAdjustment] = useState(selectedZone.radiusMeters);

  const handleSelectZone = (zone: typeof mockGeofencePoints[0]) => {
    setSelectedZone(zone);
    setRadiusAdjustment(zone.radiusMeters);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Title & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Campus Geofences & Designated Pickup Points
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Configure GPS perimeter boundaries, automated boarding detection, and security staging bays
          </p>
        </div>
        <button
          type="button"
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
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Create Geofence Zone
        </button>
      </div>

      {/* Main Two-Column Layout: Left Map / Right Zone Configurator */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.4fr) minmax(300px, 1fr)', gap: 16 }}>
        {/* Interactive Map Visualizer */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={16} style={{ color: 'var(--corporate-blue)' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                Live Geofence Boundary Map
              </span>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 8px',
                backgroundColor: '#EFF6FF',
                color: 'var(--corporate-blue)',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <Radio size={12} /> Active Telemetry
            </span>
          </div>

          {/* SVG Canvas Map */}
          <MiniLiveMap height={380} routeName={`${selectedZone.name} Perimeter`} />

          {/* Active Zone Legend */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#F8FAFC',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
            }}
          >
            <div>
              <strong>Current Focus:</strong> {selectedZone.name} ({selectedZone.zoneType})
            </div>
            <div style={{ color: 'var(--corporate-blue)', fontWeight: 600 }}>
              {selectedZone.activeTripsInside} Cabs inside buffer
            </div>
          </div>
        </div>

        {/* Right Column: Zone List & Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Selected Zone Inspector Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <span
                  style={{
                    padding: '2px 8px',
                    backgroundColor: '#EFF6FF',
                    color: 'var(--corporate-blue)',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {selectedZone.zoneType}
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '8px 0 2px 0' }}>
                  {selectedZone.name}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedZone.officeName}</div>
              </div>
            </div>

            {/* Coordinates and Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>GPS Coordinates:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedZone.latitude}° N, {selectedZone.longitude}° E
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)' }}>Auto Boarding / Checkout:</span>
                <span style={{ fontWeight: 600, color: '#15803D' }}>
                  {selectedZone.autoCheckout ? 'Enabled (FastTag/GPS)' : 'Manual Only'}
                </span>
              </div>

              {/* Radius Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Perimeter Buffer Radius:</span>
                  <span style={{ fontWeight: 700, color: 'var(--corporate-blue)' }}>{radiusAdjustment} Meters</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="25"
                  value={radiusAdjustment}
                  onChange={(e) => setRadiusAdjustment(Number(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                  <span>50m (Tight Gate)</span>
                  <span>250m (Campus Wide)</span>
                  <span>500m (Corridor)</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: 'var(--corporate-blue)',
                  color: '#FFFFFF',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Save Perimeter
              </button>
            </div>
          </div>

          {/* All Registered Geofences List */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontSize: 13, fontWeight: 700 }}>
              Active Geofence Zones ({mockGeofencePoints.length})
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {mockGeofencePoints.map((zone) => {
                const isSelected = zone.id === selectedZone.id;
                return (
                  <div
                    key={zone.id}
                    onClick={() => handleSelectZone(zone)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #F1F5F9',
                      backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--corporate-blue)' : 'var(--text-primary)' }}>
                        {zone.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {zone.zoneType} • {zone.radiusMeters}m radius
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '2px 6px',
                        backgroundColor: '#DCFCE7',
                        color: '#15803D',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {zone.activeTripsInside} Cabs
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


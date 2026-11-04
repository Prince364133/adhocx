'use client';

import React, { useState, useEffect } from 'react';
import { opsApi } from '../../lib/api/opsClient';
import { CorporateTenantOption } from '../../lib/api/opsTypes';
import { Button } from '../../components/common/Button';
import {
  Cpu,
  CheckCircle,
  AlertTriangle,
  Play,
  Layers,
  Clock,
  Car,
  Users,
} from 'lucide-react';

function todayIst(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

export default function RouteOptimizerPage() {
  const [tenants, setTenants] = useState<CorporateTenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [shiftDate, setShiftDate] = useState<string>(todayIst());
  const [shiftTime, setShiftTime] = useState<string>('08:00');
  const [direction, setDirection] = useState<'LOGIN' | 'LOGOUT'>('LOGIN');
  const [vehicleCategory, setVehicleCategory] = useState<string>('SEDAN');
  const [maxCapacity, setMaxCapacity] = useState<number>(4);
  const [officeBuffer, setOfficeBuffer] = useState<number>(10);
  const [maxRideTime, setMaxRideTime] = useState<number>(120);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    createdRoutesCount: number;
    assignedPassengers: number;
    unassignedCount: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await opsApi.getTenants({ limit: 100 });
        const items = res?.items ?? [];
        setTenants(items);
        if (items.length > 0) {
          const tenant = items[0];
          setSelectedTenantId(tenant.id);
          if (tenant.offices && tenant.offices.length > 0) {
            setSelectedOfficeId(tenant.offices[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load tenants:', err);
      }
    })();
  }, []);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  const offices = selectedTenant?.offices || [];

  async function handleRunOptimization() {
    if (!selectedTenantId) {
      setErrorMsg('Please select an enterprise client');
      return;
    }

    setRunning(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await opsApi.optimizeShiftRoutes({
        tenantId: selectedTenantId,
        officeId: selectedOfficeId || 'default-office',
        shiftDate,
        shiftTime,
        direction,
        vehicleCategory,
        maxCapacity,
        officeBufferMinutes: officeBuffer,
        maxRideTimeMinutes: maxRideTime,
      });
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Optimization solver failed');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
      {/* Header */}
      <div>
        <h1 className="h1-text" style={{ color: '#F8FAFC' }}>
          CVRPTW Route Optimization Engine
        </h1>
        <p style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: '14px', marginTop: '4px' }}>
          Autonomous heuristic clustering on road travel times. Groups employee login and logout rosters into optimal multi-stop cab itineraries.
        </p>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md, 8px)',
            fontSize: '13px',
            backgroundColor: 'rgba(220, 38, 38, 0.15)',
            border: '1px solid rgba(220, 38, 38, 0.35)',
            color: '#F87171',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {result && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-lg, 10px)',
            backgroundColor: 'rgba(22, 163, 74, 0.15)',
            border: '1px solid rgba(22, 163, 74, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ADE80', fontWeight: 700, fontSize: '15px' }}>
            <CheckCircle size={18} />
            <span>Optimization Solver Completed Successfully</span>
          </div>
          <div style={{ display: 'flex', gap: '24px', marginTop: '4px', fontSize: '13px', color: '#F8FAFC' }}>
            <div>
              Generated Cabs: <strong style={{ color: '#4ADE80' }}>{result.createdRoutesCount}</strong>
            </div>
            <div>
              Assigned Riders: <strong style={{ color: 'var(--brand-blue-400, #5290F9)' }}>{result.assignedPassengers}</strong>
            </div>
            <div>
              Unassigned Remaining: <strong style={{ color: result.unassignedCount > 0 ? '#F87171' : '#4ADE80' }}>{result.unassignedCount}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Solver Configuration Form */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated, #111D3D)',
          borderRadius: 'var(--radius-lg, 10px)',
          border: '1px solid var(--border-subtle, #1E3060)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary, #94A3B8)', textTransform: 'uppercase' }}>
          SOLVER PARAMETERS & BOUNDARIES
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {/* Client Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', marginBottom: '6px' }}>
              ENTERPRISE CLIENT
            </label>
            <select
              value={selectedTenantId}
              onChange={(e) => {
                setSelectedTenantId(e.target.value);
                const t = tenants.find((x) => x.id === e.target.value);
                if (t?.offices && t.offices.length > 0) {
                  setSelectedOfficeId(t.offices[0].id);
                }
              }}
              style={{
                width: '100%',
                height: '38px',
                backgroundColor: 'var(--bg-canvas, #010D2D)',
                border: '1px solid var(--border-strong, #2D4685)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '0 12px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none',
              }}
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </div>

          {/* Shift Date */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', marginBottom: '6px' }}>
              SHIFT DATE
            </label>
            <input
              type="date"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                backgroundColor: 'var(--bg-canvas, #010D2D)',
                border: '1px solid var(--border-strong, #2D4685)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '0 12px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Shift Time */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', marginBottom: '6px' }}>
              SHIFT TIME
            </label>
            <select
              value={shiftTime}
              onChange={(e) => setShiftTime(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                backgroundColor: 'var(--bg-canvas, #010D2D)',
                border: '1px solid var(--border-strong, #2D4685)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '0 12px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none',
              }}
            >
              <option value="08:00">08:00 AM</option>
              <option value="09:00">09:00 AM</option>
              <option value="17:00">05:00 PM</option>
              <option value="18:00">06:00 PM</option>
              <option value="20:00">08:00 PM</option>
              <option value="05:00">05:00 AM</option>
            </select>
          </div>

          {/* Direction */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', marginBottom: '6px' }}>
              DIRECTION
            </label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as any)}
              style={{
                width: '100%',
                height: '38px',
                backgroundColor: 'var(--bg-canvas, #010D2D)',
                border: '1px solid var(--border-strong, #2D4685)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '0 12px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none',
              }}
            >
              <option value="LOGIN">LOGIN (Employee Home &rarr; Office)</option>
              <option value="LOGOUT">LOGOUT (Office &rarr; Employee Home)</option>
            </select>
          </div>

          {/* Vehicle Category */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', marginBottom: '6px' }}>
              VEHICLE CATEGORY & SEAT LIMIT
            </label>
            <select
              value={vehicleCategory}
              onChange={(e) => {
                const cat = e.target.value;
                setVehicleCategory(cat);
                setMaxCapacity(cat === 'SUV' ? 6 : cat === 'TT' ? 12 : 4);
              }}
              style={{
                width: '100%',
                height: '38px',
                backgroundColor: 'var(--bg-canvas, #010D2D)',
                border: '1px solid var(--border-strong, #2D4685)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '0 12px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none',
              }}
            >
              <option value="SEDAN">Sedan (Max 4 Passengers)</option>
              <option value="SUV">SUV (Max 6 Passengers)</option>
              <option value="TT">Tempo Traveler (Max 12 Passengers)</option>
            </select>
          </div>

          {/* Max Ride Time */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)', marginBottom: '6px' }}>
              MAX RIDE TIME LIMIT (MINS)
            </label>
            <input
              type="number"
              min={30}
              max={180}
              value={maxRideTime}
              onChange={(e) => setMaxRideTime(Number(e.target.value))}
              style={{
                width: '100%',
                height: '38px',
                backgroundColor: 'var(--bg-canvas, #010D2D)',
                border: '1px solid var(--border-strong, #2D4685)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '0 12px',
                color: '#F8FAFC',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <Button
            size="lg"
            variant="primary"
            leftIcon={<Cpu size={18} />}
            isLoading={running}
            onClick={handleRunOptimization}
          >
            {running ? 'Running Heuristic Solver...' : 'Execute CVRPTW Optimizer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

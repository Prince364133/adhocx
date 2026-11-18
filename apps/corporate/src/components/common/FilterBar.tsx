'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, RefreshCw } from 'lucide-react';
import { schedulingApi } from '../../lib/api/corporate';
import type { ShiftTemplate } from '../../lib/api/types';
import { useSession } from '../../lib/auth/SessionContext';

export interface FilterBarShiftOption {
  value: string;
  label: string;
}

export interface FilterBarProps {
  showOffices?: boolean;
  showDateRange?: boolean;
  dateRangeLabel?: string;
  showShifts?: boolean;
  shifts?: FilterBarShiftOption[];
  selectedOffice?: string;
  onOfficeChange?: (office: string) => void;
  selectedShift?: string;
  onShiftChange?: (shift: string) => void;
  showTripTypes?: boolean;
  selectedTripType?: string;
  onTripTypeChange?: (tripType: string) => void;
  showExceptionTypes?: boolean;
  selectedExceptionType?: string;
  onExceptionTypeChange?: (exceptionType: string) => void;
  liveStatusText?: string;
  onRefresh?: () => void;
}

function formatCurrentWeekRange(): string {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  const startFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(start);
  const endFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(end);
  return `${startFmt} – ${endFmt}`;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  showOffices = true,
  showDateRange = true,
  dateRangeLabel,
  showShifts = false,
  shifts,
  selectedOffice: controlledOffice,
  onOfficeChange,
  selectedShift: controlledShift,
  onShiftChange,
  showTripTypes = false,
  selectedTripType: controlledTripType,
  onTripTypeChange,
  showExceptionTypes = false,
  selectedExceptionType: controlledExceptionType,
  onExceptionTypeChange,
  liveStatusText,
  onRefresh,
}) => {
  const { tenantId, offices } = useSession();
  const [internalOffice, setInternalOffice] = useState('All Offices');
  const [internalShift, setInternalShift] = useState('All Shifts');
  const [internalTripType, setInternalTripType] = useState('All Trip Types');
  const [internalExceptionType, setInternalExceptionType] = useState('All Exception Types');
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const resolvedDateLabel = useMemo(
    () => dateRangeLabel ?? formatCurrentWeekRange(),
    [dateRangeLabel],
  );

  useEffect(() => {
    if (!showShifts || shifts || !tenantId) return;
    let active = true;
    schedulingApi
      .shiftTemplates(tenantId)
      .then((rows) => {
        if (active && Array.isArray(rows)) setShiftTemplates(rows);
      })
      .catch(() => {
        if (active) setShiftTemplates([]);
      });
    return () => {
      active = false;
    };
  }, [showShifts, shifts, tenantId]);

  const shiftOptions: FilterBarShiftOption[] = useMemo(() => {
    if (shifts) return shifts;
    return shiftTemplates.map((tpl) => ({
      value: tpl.id,
      label: `${tpl.name} (${tpl.loginTime} - ${tpl.logoutTime})`,
    }));
  }, [shifts, shiftTemplates]);

  const activeOffice = controlledOffice ?? internalOffice;
  const activeShift = controlledShift ?? internalShift;
  const activeTripType = controlledTripType ?? internalTripType;
  const activeExceptionType = controlledExceptionType ?? internalExceptionType;

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const selectStyle: React.CSSProperties = {
    appearance: 'none',
    backgroundColor: 'var(--bg-surface, #FFFFFF)',
    border: '1px solid var(--border-subtle, #E2E8F0)',
    borderRadius: 'var(--radius-md, 6px)',
    padding: '7px 32px 7px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary, #475569)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-xs)',
    outline: 'none',
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '10px',
        flexWrap: 'wrap',
      }}
    >
      {/* Live Indicator Pill */}
      {liveStatusText && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            border: '1px solid var(--color-success-border)',
            borderRadius: 'var(--radius-pill)',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          <span className="pulse-green" />
          <span>{liveStatusText}</span>
        </div>
      )}

      {/* Offices Dropdown */}
      {showOffices && (
        <div style={{ position: 'relative' }}>
          <select
            value={activeOffice}
            onChange={(e) => {
              setInternalOffice(e.target.value);
              onOfficeChange?.(e.target.value);
            }}
            style={selectStyle}
          >
            <option value="All Offices">All Offices</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            color="var(--text-muted, #64748B)"
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}

      {/* Date Range Pill */}
      {showDateRange && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-surface, #FFFFFF)',
            border: '1px solid var(--border-subtle, #E2E8F0)',
            borderRadius: 'var(--radius-md, 6px)',
            padding: '7px 12px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary, #475569)',
            boxShadow: 'var(--shadow-xs)',
            transition: 'background-color 0.15s ease, border-color 0.15s ease',
          }}
        >
          <Calendar size={13} color="var(--text-muted, #64748B)" />
          <span>{resolvedDateLabel}</span>
        </div>
      )}

      {/* Shifts Dropdown */}
      {showShifts && (
        <div style={{ position: 'relative' }}>
          <select
            value={activeShift}
            onChange={(e) => {
              setInternalShift(e.target.value);
              onShiftChange?.(e.target.value);
            }}
            style={selectStyle}
          >
            <option value="All Shifts">All Shifts</option>
            {shiftOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            color="var(--text-muted, #64748B)"
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}

      {/* Trip Types Dropdown */}
      {showTripTypes && (
        <div style={{ position: 'relative' }}>
          <select
            value={activeTripType}
            onChange={(e) => {
              setInternalTripType(e.target.value);
              onTripTypeChange?.(e.target.value);
            }}
            style={selectStyle}
          >
            <option value="All Trip Types">All Trip Types</option>
            <option value="LOGIN">Login (Pickup)</option>
            <option value="LOGOUT">Logout (Drop)</option>
          </select>
          <ChevronDown
            size={14}
            color="var(--text-muted, #64748B)"
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}

      {/* Exception Types Dropdown */}
      {showExceptionTypes && (
        <div style={{ position: 'relative' }}>
          <select
            value={activeExceptionType}
            onChange={(e) => {
              setInternalExceptionType(e.target.value);
              onExceptionTypeChange?.(e.target.value);
            }}
            style={selectStyle}
          >
            <option value="All Exception Types">All Exception Types</option>
            <option value="Delayed Pickups">Delayed Pickups</option>
            <option value="Unassigned Trips">Unassigned Trips</option>
            <option value="GPS Stale">GPS Stale (&gt;5m)</option>
            <option value="Route Deviations">Route Deviations</option>
            <option value="Safety Alerts">Safety Alerts</option>
          </select>
          <ChevronDown
            size={14}
            color="var(--text-muted, #64748B)"
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}

      {/* Refresh Button */}
      <button
        type="button"
        onClick={handleRefresh}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'var(--brand-action)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 'var(--radius-md, 6px)',
          padding: '7px 14px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(var(--brand-primary-rgb), 0.2)',
          transition: 'background-color 0.15s ease',
        }}
      >
        <RefreshCw size={12} className={isRefreshing ? 'spin' : ''} />
        <span>Refresh</span>
      </button>
    </div>
  );
};

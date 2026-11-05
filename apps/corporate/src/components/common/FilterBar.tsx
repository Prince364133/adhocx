'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown, RefreshCw, Filter } from 'lucide-react';
import { mockOfficesList } from '../../lib/mock/corporateMockData';

export interface FilterBarProps {
  showOffices?: boolean;
  showDateRange?: boolean;
  dateRangeLabel?: string;
  showShifts?: boolean;
  showTripTypes?: boolean;
  showExceptionTypes?: boolean;
  liveStatusText?: string;
  onRefresh?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  showOffices = true,
  showDateRange = true,
  dateRangeLabel = '08 - 14 Dec 2026',
  showShifts = false,
  showTripTypes = false,
  showExceptionTypes = false,
  liveStatusText,
  onRefresh,
}) => {
  const [selectedOffice, setSelectedOffice] = useState('All Offices');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
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
            backgroundColor: '#DCFCE7',
            color: '#16A34A',
            border: '1px solid #86EFAC',
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
            value={selectedOffice}
            onChange={(e) => setSelectedOffice(e.target.value)}
            style={{
              appearance: 'none',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '7px 32px 7px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-xs)',
              outline: 'none',
            }}
          >
            <option value="All Offices">All Offices</option>
            {mockOfficesList.map((o) => (
              <option key={o.id} value={o.name}>
                {o.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            color="#64748B"
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

      {/* Date Range Dropdown */}
      {showDateRange && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '7px 12px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <Calendar size={13} color="#64748B" />
          <span>{dateRangeLabel}</span>
          <ChevronDown size={14} color="#64748B" />
        </div>
      )}

      {/* Shifts Dropdown */}
      {showShifts && (
        <div style={{ position: 'relative' }}>
          <select
            defaultValue="All Shifts"
            style={{
              appearance: 'none',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '7px 32px 7px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-xs)',
              outline: 'none',
            }}
          >
            <option value="All Shifts">All Shifts</option>
            <option value="General (08:00 AM - 05:00 PM)">General (08:00 AM - 05:00 PM)</option>
            <option value="Shift A (09:00 AM - 06:00 PM)">Shift A (09:00 AM - 06:00 PM)</option>
            <option value="Night (10:00 PM - 07:00 AM)">Night (10:00 PM - 07:00 AM)</option>
          </select>
          <ChevronDown
            size={14}
            color="#64748B"
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
            defaultValue="All Trip Types"
            style={{
              appearance: 'none',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '7px 32px 7px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-xs)',
              outline: 'none',
            }}
          >
            <option value="All Trip Types">All Trip Types</option>
            <option value="Login (Pickup)">Login (Pickup)</option>
            <option value="Logout (Drop)">Logout (Drop)</option>
            <option value="Ad-hoc">Ad-hoc</option>
          </select>
          <ChevronDown
            size={14}
            color="#64748B"
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
            defaultValue="All Exception Types"
            style={{
              appearance: 'none',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '7px 32px 7px 12px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-xs)',
              outline: 'none',
            }}
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
            color="#64748B"
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
        onClick={handleRefresh}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#1167EE',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: '7px 14px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(17,103,238,0.2)',
          transition: 'background-color 0.15s ease',
        }}
      >
        <RefreshCw size={12} className={isRefreshing ? 'spin' : ''} />
        <span>Refresh</span>
      </button>
    </div>
  );
};


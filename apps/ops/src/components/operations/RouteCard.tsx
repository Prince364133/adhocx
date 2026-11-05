import React from 'react';
import { CorporateRouteItem } from '../../lib/api/opsTypes';
import { StatusBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';
import {
  User,
  Clock,
  Send,
  UserCheck,
  XCircle,
  FileText,
  AlertTriangle,
  Radio,
} from 'lucide-react';

export interface RouteCardProps {
  route: CorporateRouteItem;
  onOpenItinerary: (route: CorporateRouteItem) => void;
  onForceDispatch: (routeId: string) => void;
  onReassignDriver: (route: CorporateRouteItem) => void;
  onCancelRoute: (route: CorporateRouteItem) => void;
  isDispatching?: boolean;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  onOpenItinerary,
  onForceDispatch,
  onReassignDriver,
  onCancelRoute,
  isDispatching = false,
}) => {
  const isUnassigned = !route.driverId;
  const isDelayed = route.delayMinutes && route.delayMinutes > 10;
  const isAtRisk = route.isAtRisk || (isUnassigned && route.status === 'DISPATCHING');
  const stopsCount = route.stops?.length ?? route._count?.stops ?? 0;

  const formatTime = (iso?: string) => {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
      hour12: false,
    });
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface-elevated, #111D3D)',
        border: `1px solid ${
          isAtRisk || isDelayed ? 'rgba(238, 152, 17, 0.5)' : 'var(--border-subtle, #1E3060)'
        }`,
        borderRadius: 'var(--radius-lg, 10px)',
        padding: 'var(--space-4, 16px) var(--space-5, 20px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: 'var(--shadow-card)',
        position: 'relative',
        transition: 'border-color 0.2s',
      }}
      className={isAtRisk || isDelayed ? 'pulse-warning' : ''}
    >
      {/* Top Header: Route ID, Direction, Status Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="code-tag">RT-{route.id.slice(0, 8).toUpperCase()}</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--radius-xs, 4px)',
              backgroundColor: route.direction === 'LOGIN' ? 'rgba(87, 40, 178, 0.15)' : 'rgba(238, 152, 17, 0.15)',
              color: route.direction === 'LOGIN' ? 'var(--brand-blue-400, #5290F9)' : 'var(--brand-amber-500, #EE9811)',
              border: `1px solid ${route.direction === 'LOGIN' ? 'rgba(87, 40, 178, 0.3)' : 'rgba(238, 152, 17, 0.3)'}`,
            }}
          >
            {route.direction} · {route.shiftTime}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary, #94A3B8)', fontWeight: 500 }}>
            {route.vehicleCategory} ({route.assignedPassengerCount}/{route.maxCapacity} seats)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {route.liveGps && !route.liveGps.isStale && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#4ADE80',
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-pill, 9999px)',
              }}
            >
              <Radio size={11} className="pulse-warning" />
              GPS Live
            </span>
          )}

          <StatusBadge status={isDelayed ? 'DELAYED' : isAtRisk ? 'AT_RISK' : route.status} />
        </div>
      </div>

      {/* Middle Grid: Assigned Driver & Schedule Execution */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          backgroundColor: 'var(--bg-canvas, #010D2D)',
          padding: '12px 14px',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--border-subtle, #1E3060)',
        }}
      >
        {/* Driver Details */}
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', marginBottom: '3px' }}>
            ASSIGNED CAB & DRIVER
          </div>
          {route.driver ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} color="var(--brand-blue-400, #5290F9)" />
                <span style={{ fontWeight: 700, color: '#F8FAFC' }}>{route.driver.fullName}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94A3B8)', marginTop: '2px' }}>
                {route.driver.phone || 'No phone'} · <span className="code-tag">{route.vehicle?.registrationNumber || 'VEHICLE'}</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FBBF24', fontSize: '13px', fontWeight: 600 }}>
              <AlertTriangle size={15} />
              <span>Unassigned Driver</span>
            </div>
          )}
        </div>

        {/* Schedule Timing */}
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', marginBottom: '3px' }}>
            SCHEDULE & DESTINATION
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="var(--brand-blue-400, #5290F9)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>
              Pickup 1: {formatTime(route.targetPickup1Time)} &rarr; Office: {formatTime(route.targetOfficeArrivalTime)}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94A3B8)', marginTop: '2px' }}>
            {route.office?.name || 'Office Campus'} · {stopsCount} stops ({route.assignedPassengerCount} riders)
          </div>
        </div>
      </div>

      {/* Action Bar: Immediate Operational Interventions (§ 3.2, § 55) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          borderTop: '1px solid var(--border-subtle, #1E3060)',
          paddingTop: '10px',
        }}
      >
        <Button
          size="sm"
          variant="outline"
          leftIcon={<FileText size={14} />}
          onClick={() => onOpenItinerary(route)}
        >
          View Itinerary & Boarding OTP
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isUnassigned && (
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Send size={14} />}
              isLoading={isDispatching}
              onClick={() => onForceDispatch(route.id)}
            >
              Force Dispatch
            </Button>
          )}

          <Button
            size="sm"
            variant="secondary"
            leftIcon={<UserCheck size={14} />}
            onClick={() => onReassignDriver(route)}
          >
            Reassign Driver
          </Button>

          <Button
            size="sm"
            variant="danger"
            leftIcon={<XCircle size={14} />}
            onClick={() => onCancelRoute(route)}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};


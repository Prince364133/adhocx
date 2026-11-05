'use client';

import React, { useState } from 'react';
import { Drawer } from '../common/Drawer';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { CorporateRouteItem, RouteStop } from '../../lib/api/opsTypes';
import { opsApi } from '../../lib/api/opsClient';
import {
  MapPin,
  Phone,
  KeyRound,
  UserX,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export interface StopItineraryDrawerProps {
  route: CorporateRouteItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRouteUpdated: () => void;
}

export const StopItineraryDrawer: React.FC<StopItineraryDrawerProps> = ({
  route,
  isOpen,
  onClose,
  onRouteUpdated,
}) => {
  const [activeStopOverride, setActiveStopOverride] = useState<RouteStop | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [noShowLoadingStopId, setNoShowLoadingStopId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!route) return null;

  const stops = route.stops || [];

  async function handleVerifyOtp(stopId: string) {
    if (!otpInput.trim()) {
      setActionMessage({ type: 'error', text: 'Please enter the 4-digit numeric OTP' });
      return;
    }
    setOverrideLoading(true);
    setActionMessage(null);
    try {
      await opsApi.verifyStopOtp(route!.id, stopId, otpInput.trim());
      setActionMessage({ type: 'success', text: 'Boarding verified successfully. Route advanced.' });
      setActiveStopOverride(null);
      setOtpInput('');
      onRouteUpdated();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'OTP verification failed' });
    } finally {
      setOverrideLoading(false);
    }
  }

  async function handleMarkNoShow(stopId: string) {
    setNoShowLoadingStopId(stopId);
    setActionMessage(null);
    try {
      await opsApi.markStopNoShow(route!.id, stopId, 'Dispatcher manual override: Passenger no-show after 5-min dwell buffer');
      setActionMessage({ type: 'success', text: 'Stop marked as NO-SHOW. Cab proceeding to next stop.' });
      onRouteUpdated();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to mark no-show' });
    } finally {
      setNoShowLoadingStopId(null);
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Route Manifest: RT-${route.id.slice(0, 8).toUpperCase()}`}
      subtitle={`${route.vehicleCategory} · Shift ${route.shiftTime} (${route.direction}) · ${stops.length} Stops`}
      width="560px"
    >
      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md, 8px)',
            marginBottom: '16px',
            fontSize: '13px',
            fontWeight: 500,
            backgroundColor: actionMessage.type === 'success' ? 'rgba(22, 163, 74, 0.15)' : 'rgba(220, 38, 38, 0.15)',
            border: `1px solid ${actionMessage.type === 'success' ? 'rgba(22, 163, 74, 0.35)' : 'rgba(220, 38, 38, 0.35)'}`,
            color: actionMessage.type === 'success' ? '#4ADE80' : '#F87171',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {actionMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Driver & Cab Telemetry Summary */}
      <div
        style={{
          backgroundColor: 'var(--bg-canvas, #010D2D)',
          padding: '14px',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--border-subtle, #1E3060)',
          marginBottom: '20px',
        }}
      >
        <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', marginBottom: '4px' }}>
          ASSIGNED VEHICLE & DRIVER
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#F8FAFC' }}>
              {route.driver?.fullName || 'Unassigned Driver'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94A3B8)' }}>
              {route.driver?.phone || 'No phone'} · <span className="code-tag">{route.vehicle?.registrationNumber || 'NO PLATE'}</span>
            </div>
          </div>
          <StatusBadge status={route.status} />
        </div>
      </div>

      {/* Stops Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #94A3B8)', textTransform: 'uppercase' }}>
          STOP-BY-STOP PASSENGER ITINERARY
        </div>

        {stops.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted, #64748B)' }}>
            No stops loaded for this route.
          </div>
        ) : (
          stops.map((stop, index) => {
            const isOffice = stop.stopType === 'DROPOFF';
            const isBoarded = stop.status === 'BOARDED';
            const isPending = stop.status === 'PENDING' || stop.status === 'ARRIVED';

            return (
              <div
                key={stop.id}
                style={{
                  backgroundColor: 'var(--bg-surface-elevated, #111D3D)',
                  border: `1px solid ${isBoarded ? 'rgba(22, 163, 74, 0.3)' : 'var(--border-subtle, #1E3060)'}`,
                  borderRadius: 'var(--radius-md, 8px)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  position: 'relative',
                }}
              >
                {/* Sequence & Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: isOffice ? 'var(--brand-amber-500, #EE9811)' : 'var(--brand-blue-500, #5728B2)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {index + 1}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#F8FAFC' }}>
                      {isOffice ? 'Office Dropoff Hub' : stop.employee?.fullName || 'Passenger'}
                    </span>
                    {!isOffice && stop.employee?.gender && (
                      <span className="code-tag">{stop.employee.gender}</span>
                    )}
                  </div>

                  <StatusBadge status={stop.status} size="sm" />
                </div>

                {/* Address & ETA */}
                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94A3B8)', display: 'flex', gap: '6px' }}>
                  <MapPin size={14} color="var(--brand-blue-400, #5290F9)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{stop.addressText}</span>
                </div>

                {/* Employee Metadata */}
                {!isOffice && stop.employee && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--bg-canvas, #010D2D)',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm, 6px)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary, #94A3B8)' }}>
                      <Phone size={13} />
                      <span>{stop.employee.phoneNumber || 'N/A'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--text-muted, #64748B)' }}>OTP:</span>
                      <span className="code-tag" style={{ letterSpacing: '0.1em', fontWeight: 700 }}>
                        {stop.boardingOtp || '••••'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Manual Operational Intervention (OTP Override / No-Show) */}
                {isPending && !isOffice && (
                  <div
                    style={{
                      borderTop: '1px solid var(--border-subtle, #1E3060)',
                      paddingTop: '10px',
                      marginTop: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {activeStopOverride?.id === stop.id ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Enter 4-digit OTP"
                          maxLength={6}
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                          style={{
                            flex: 1,
                            height: '32px',
                            backgroundColor: 'var(--bg-canvas, #010D2D)',
                            border: '1px solid var(--border-strong, #2D4685)',
                            borderRadius: 'var(--radius-sm, 6px)',
                            padding: '0 10px',
                            color: '#FFFFFF',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        />
                        <Button
                          size="sm"
                          variant="success"
                          isLoading={overrideLoading}
                          onClick={() => handleVerifyOtp(stop.id)}
                        >
                          Confirm Boarding
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setActiveStopOverride(null);
                            setOtpInput('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<KeyRound size={13} />}
                          onClick={() => {
                            setActiveStopOverride(stop);
                            setOtpInput(stop.boardingOtp || '');
                          }}
                        >
                          Manual OTP Override
                        </Button>

                        <Button
                          size="sm"
                          variant="danger"
                          leftIcon={<UserX size={13} />}
                          isLoading={noShowLoadingStopId === stop.id}
                          onClick={() => handleMarkNoShow(stop.id)}
                        >
                          Mark No-Show
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Drawer>
  );
};


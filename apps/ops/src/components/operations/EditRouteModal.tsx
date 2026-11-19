'use client';

import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { opsApi } from '../../lib/api/opsClient';
import type { CorporateRouteItem, CorporateTenantOption, VehicleCategoryOption } from '../../lib/api/opsTypes';

export interface EditRouteModalProps {
  route: CorporateRouteItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '38px',
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md, 8px)',
  padding: '0 12px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '6px',
};

export const EditRouteModal: React.FC<EditRouteModalProps> = ({
  route,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [shiftDate, setShiftDate] = useState('');
  const [shiftTime, setShiftTime] = useState('');
  const [direction, setDirection] = useState<'LOGIN' | 'LOGOUT'>('LOGIN');
  const [vehicleCategory, setVehicleCategory] = useState('');
  const [maxCapacity, setMaxCapacity] = useState<number>(4);
  const [officeId, setOfficeId] = useState('');
  const [tenant, setTenant] = useState<CorporateTenantOption | null>(null);
  const [categories, setCategories] = useState<VehicleCategoryOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!route || !isOpen) return;
    setShiftDate(String(route.shiftDate).slice(0, 10));
    setShiftTime(route.shiftTime || '09:00');
    setDirection(route.direction === 'LOGOUT' ? 'LOGOUT' : 'LOGIN');
    setVehicleCategory(route.vehicleCategory || 'SEDAN');
    setMaxCapacity(route.maxCapacity || 4);
    setOfficeId(route.officeId || route.office?.id || '');
    setErrorMsg(null);

    if (route.tenantId) {
      void opsApi.getTenant(route.tenantId).then(setTenant).catch(() => setTenant(null));
    }
    void opsApi.getVehicleCategories().then(setCategories).catch(() => setCategories([]));
  }, [route, isOpen]);

  if (!route) return null;

  const offices = tenant?.offices ?? [];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!route) return;
    if (!shiftDate || !shiftTime) {
      setErrorMsg('Shift date and shift time are required.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await opsApi.updateRoute(route.id, {
        shiftDate,
        shiftTime,
        direction,
        vehicleCategory: vehicleCategory.trim() || undefined,
        maxCapacity: Number(maxCapacity) || route.maxCapacity,
        officeId: officeId || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update route.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Corporate Route"
      subtitle={`Route RT-${route.id.slice(0, 8).toUpperCase()} · ${route.tenant?.name || 'Corporate Client'}`}
      width="500px"
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
            }}
          >
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>SHIFT DATE *</label>
            <input
              type="date"
              required
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>SHIFT TIME (IST) *</label>
            <input
              type="time"
              required
              value={shiftTime}
              onChange={(e) => setShiftTime(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>DIRECTION *</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'LOGIN' | 'LOGOUT')}
              style={inputStyle}
            >
              <option value="LOGIN">LOGIN (Home → Office)</option>
              <option value="LOGOUT">LOGOUT (Office → Home)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>MAX CAPACITY *</label>
            <input
              type="number"
              min={Math.max(1, route.assignedPassengerCount)}
              max={50}
              required
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(Number(e.target.value) || 4)}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>VEHICLE CATEGORY</label>
          {categories.length > 0 ? (
            <select
              value={vehicleCategory}
              onChange={(e) => setVehicleCategory(e.target.value)}
              style={inputStyle}
            >
              {!categories.some((c) => c.vehicleType === vehicleCategory) && vehicleCategory && (
                <option value={vehicleCategory}>{vehicleCategory}</option>
              )}
              {categories.map((cat) => (
                <option key={cat.vehicleType} value={cat.vehicleType}>
                  {cat.categoryLabel} ({cat.maxSeats} seats)
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={vehicleCategory}
              onChange={(e) => setVehicleCategory(e.target.value)}
              placeholder="e.g. SEDAN, SUV, TEMPO_TRAVELLER"
              style={inputStyle}
            />
          )}
        </div>

        {offices.length > 0 && (
          <div>
            <label style={labelStyle}>OFFICE HUB</label>
            <select
              value={officeId}
              onChange={(e) => setOfficeId(e.target.value)}
              style={inputStyle}
            >
              {offices.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.name} ({off.code})
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" leftIcon={<Save size={15} />} isLoading={saving}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

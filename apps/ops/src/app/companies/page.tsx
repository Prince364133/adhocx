'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  Clock,
  Cpu,
  ExternalLink,
  KeyRound,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { CorporateRole } from '@adhocx/contracts';
import { opsApi } from '../../lib/api/opsClient';
import { CorporateTenantOption, OnboardCorporateCompanyResponse } from '../../lib/api/opsTypes';
import { Drawer } from '../../components/common/Drawer';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';

interface OnboardFormState {
  name: string;
  code: string;
  legalEntityName: string;
  gstin: string;
  officeCode: string;
  officeName: string;
  officeAddressText: string;
  officeLatitude: string;
  officeLongitude: string;
  adminFullName: string;
  adminEmail: string;
  adminPhone: string;
  adminPassword: string;
  defaultVehicleCategory: 'SEDAN' | 'SUV';
  defaultCapacity: number;
  stopDwellMinutes: number;
  officeArrivalBufferMinutes: number;
  maxRideMinutes: number;
  cancelCutoffHours: number;
  approachLeadMinutes: number;
  dispatchWindowMinutes: number;
  dispatchRetryIntervalMinutes: number;
  searchRadiusKm: number;
  shiftName: string;
  loginTime: string;
  logoutTime: string;
}

const INITIAL_FORM: OnboardFormState = {
  name: '',
  code: '',
  legalEntityName: '',
  gstin: '',
  officeCode: 'HQ-01',
  officeName: 'Main Corporate Campus',
  officeAddressText: '',
  officeLatitude: '',
  officeLongitude: '',
  adminFullName: '',
  adminEmail: '',
  adminPhone: '',
  adminPassword: '',
  defaultVehicleCategory: 'SEDAN',
  defaultCapacity: 4,
  stopDwellMinutes: 10,
  officeArrivalBufferMinutes: 10,
  maxRideMinutes: 120,
  cancelCutoffHours: 9,
  approachLeadMinutes: 30,
  dispatchWindowMinutes: 30,
  dispatchRetryIntervalMinutes: 5,
  searchRadiusKm: 10,
  shiftName: 'General Day Shift',
  loginTime: '09:00',
  logoutTime: '18:00',
};

function suggestTenantCode(companyName: string): string {
  return companyName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 18);
}

export default function CompaniesOnboardingPage() {
  const [companies, setCompanies] = useState<CorporateTenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // SideDrawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<OnboardFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [onboardResult, setOnboardResult] = useState<OnboardCorporateCompanyResponse | null>(null);

  // Inspector Drawer for selected existing company + adding secondary campus
  const [inspectCompany, setInspectCompany] = useState<CorporateTenantOption | null>(null);
  const [officeForm, setOfficeForm] = useState({
    code: '',
    name: '',
    addressText: '',
    latitude: '',
    longitude: '',
  });
  const [officeSaving, setOfficeSaving] = useState(false);
  const [officeMsg, setOfficeMsg] = useState<string | null>(null);

  const loadCompanies = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await opsApi.getTenants({ search: search?.trim() || undefined, limit: 100 });
      setCompanies(res?.items ?? []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load corporate companies.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCompanies(searchQuery);
    }, 220);
    return () => clearTimeout(timer);
  }, [searchQuery, loadCompanies]);

  const filteredCompanies = useMemo(() => {
    if (statusFilter === 'ALL') return companies;
    return companies.filter((c) => (c.status || 'ACTIVE').toUpperCase() === statusFilter);
  }, [companies, statusFilter]);

  const totals = useMemo(() => {
    return companies.reduce(
      (acc, c) => {
        acc.offices += c._count?.offices ?? c.offices?.length ?? 0;
        acc.employees += c._count?.employees ?? 0;
        acc.routes += c._count?.routes ?? 0;
        return acc;
      },
      { offices: 0, employees: 0, routes: 0 },
    );
  }, [companies]);

  function openOnboardDrawer() {
    setForm(INITIAL_FORM);
    setFormError(null);
    setOnboardResult(null);
    setDrawerOpen(true);
  }

  function generateSecurePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#';
    let pwd = 'Adx!';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((prev) => ({ ...prev, adminPassword: pwd }));
  }

  async function handleSubmitOnboard(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim() || !form.code.trim() || !form.legalEntityName.trim()) {
      setFormError('Company Name, Tenant Code, and Legal Entity Name are required.');
      return;
    }
    if (!form.officeCode.trim() || !form.officeName.trim() || !form.officeAddressText.trim()) {
      setFormError('Primary Office Code, Name, and Full Address are required.');
      return;
    }
    if (!form.adminFullName.trim() || !form.adminEmail.trim() || !form.adminPhone.trim()) {
      setFormError('Corporate Admin Full Name, Email, and Mobile Number are required.');
      return;
    }
    if (!form.adminPassword || form.adminPassword.trim().length < 6) {
      setFormError('Initial Corporate Portal password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const latNum = form.officeLatitude.trim() ? Number(form.officeLatitude.trim()) : undefined;
      const lngNum = form.officeLongitude.trim() ? Number(form.officeLongitude.trim()) : undefined;

      const res = await opsApi.onboardCompany({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        legalEntityName: form.legalEntityName.trim(),
        gstin: form.gstin.trim() || undefined,
        office: {
          code: form.officeCode.trim().toUpperCase(),
          name: form.officeName.trim(),
          addressText: form.officeAddressText.trim(),
          ...(Number.isFinite(latNum) && Number.isFinite(lngNum)
            ? { latitude: latNum, longitude: lngNum }
            : {}),
        },
        adminUser: {
          fullName: form.adminFullName.trim(),
          email: form.adminEmail.trim().toLowerCase(),
          phone: form.adminPhone.trim(),
          password: form.adminPassword,
          corporateRole: CorporateRole.CORP_SUPER_ADMIN,
        },
        policy: {
          defaultVehicleCategory: form.defaultVehicleCategory,
          defaultCapacity: Number(form.defaultCapacity),
          stopDwellMinutes: Number(form.stopDwellMinutes),
          officeArrivalBufferMinutes: Number(form.officeArrivalBufferMinutes),
          maxRideMinutes: Number(form.maxRideMinutes),
          cancelCutoffHours: Number(form.cancelCutoffHours),
          approachLeadMinutes: Number(form.approachLeadMinutes),
          dispatchWindowMinutes: Number(form.dispatchWindowMinutes),
          dispatchRetryIntervalMinutes: Number(form.dispatchRetryIntervalMinutes),
          searchRadiusKm: Number(form.searchRadiusKm),
        },
        ...(form.shiftName.trim() && form.loginTime && form.logoutTime
          ? {
              shiftTemplate: {
                name: form.shiftName.trim(),
                loginTime: form.loginTime,
                logoutTime: form.logoutTime,
                weekdays: [1, 2, 3, 4, 5],
              },
            }
          : {}),
      });

      setOnboardResult(res);
      await loadCompanies(searchQuery);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to onboard corporate company.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddOffice(e: React.FormEvent) {
    e.preventDefault();
    if (!inspectCompany) return;
    const lat = Number(officeForm.latitude);
    const lng = Number(officeForm.longitude);
    if (!officeForm.code.trim() || !officeForm.name.trim() || !officeForm.addressText.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setOfficeMsg('Please enter office code, name, address, latitude, and longitude.');
      return;
    }
    setOfficeSaving(true);
    setOfficeMsg(null);
    try {
      await opsApi.createOffice(inspectCompany.id, {
        code: officeForm.code.trim().toUpperCase(),
        name: officeForm.name.trim(),
        addressText: officeForm.addressText.trim(),
        latitude: lat,
        longitude: lng,
      });
      const updated = await opsApi.getTenant(inspectCompany.id);
      setInspectCompany(updated);
      setOfficeForm({ code: '', name: '', addressText: '', latitude: '', longitude: '' });
      setOfficeMsg('Campus added successfully.');
      void loadCompanies(searchQuery);
    } catch (err: any) {
      setOfficeMsg(err?.message || 'Could not create office campus.');
    } finally {
      setOfficeSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '20px 24px',
          borderRadius: 'var(--radius-lg, 12px)',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: 'var(--brand-primary-subtle, rgba(87, 40, 178, 0.12))',
                color: 'var(--brand-primary, #5728B2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Corporate Client Onboarding
              </h1>
              <p style={{ margin: '2px 0 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                Onboard corporate ETS clients with office coordinates, dispatch SLA rules, and Corporate Portal login credentials.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={15} />}
            onClick={() => void loadCompanies(searchQuery)}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={openOnboardDrawer}
          >
            Onboard New Company
          </Button>
        </div>
      </div>

      {/* Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {[
          { label: 'Onboarded Companies', value: companies.length, icon: <Building2 size={18} />, accent: '#5728B2' },
          { label: 'Office Campuses', value: totals.offices, icon: <MapPin size={18} />, accent: '#2563EB' },
          { label: 'Registered Employees', value: totals.employees, icon: <Users size={18} />, accent: '#16A34A' },
          { label: 'Active / Planned Routes', value: totals.routes, icon: <Navigation size={18} />, accent: '#D97706' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              padding: '16px 18px',
              borderRadius: 'var(--radius-md, 10px)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{kpi.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                {kpi.value}
              </div>
            </div>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                backgroundColor: `${kpi.accent}18`,
                color: kpi.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderRadius: 'var(--radius-md, 10px)',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: 460 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search companies by name, code, or legal entity..."
            style={{
              width: '100%',
              height: 38,
              padding: '0 12px 0 36px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-muted)',
              color: 'var(--text-primary)',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid var(--border-subtle)',
                backgroundColor:
                  statusFilter === status ? 'var(--brand-primary, #5728B2)' : 'var(--bg-surface-muted)',
                color: statusFilter === status ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            color: '#DC2626',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Company List */}
      {loading ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 12,
            border: '1px solid var(--border-subtle)',
          }}
        >
          Loading corporate clients...
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 12,
            border: '1px dashed var(--border-strong)',
          }}
        >
          <Building2 size={34} style={{ color: 'var(--text-muted)', marginBottom: 10 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            No matching companies found
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 16px' }}>
            Onboard your first corporate client to enable Route Optimizer and Corporate Portal access.
          </p>
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openOnboardDrawer}>
            Onboard New Company
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
          {filteredCompanies.map((company) => {
            const primaryOffice = company.offices?.[0];
            const primaryAdmin = company.users?.[0];
            const latestPolicy = company.policies?.[0];

            return (
              <div
                key={company.id}
                style={{
                  padding: '18px 20px',
                  borderRadius: 12,
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {company.name}
                      </h3>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 6,
                          backgroundColor: 'var(--bg-surface-muted)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {company.code}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                      {company.legalEntityName || 'Corporate Client'}
                      {company.gstin ? ` · GSTIN ${company.gstin}` : ''}
                    </div>
                  </div>
                  <StatusBadge status={company.status || 'ACTIVE'} size="sm" />
                </div>

                {/* Office & Portal Contact */}
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    backgroundColor: 'var(--bg-surface-muted)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: 'var(--text-primary)' }}>
                    <MapPin size={14} style={{ flexShrink: 0, marginTop: 2, color: '#2563EB' }} />
                    <span>
                      <strong>{primaryOffice ? `${primaryOffice.name} (${primaryOffice.code})` : 'No primary office'}</strong>
                      {primaryOffice?.addressText ? ` — ${primaryOffice.addressText}` : ''}
                    </span>
                  </div>
                  {primaryAdmin && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <ShieldCheck size={13} color="#16A34A" />
                        {primaryAdmin.fullName}
                      </span>
                      {primaryAdmin.email && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={13} />
                          {primaryAdmin.email}
                        </span>
                      )}
                      {primaryAdmin.phone && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={13} />
                          {primaryAdmin.phone}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* SLA / Metrics Strip */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                    Offices: <strong>{company._count?.offices ?? company.offices?.length ?? 0}</strong>
                  </span>
                  <span style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                    Employees: <strong>{company._count?.employees ?? 0}</strong>
                  </span>
                  <span style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                    Routes: <strong>{company._count?.routes ?? 0}</strong>
                  </span>
                  <span style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                    Dwell: <strong>{latestPolicy?.stopDwellMinutes ?? 10}m</strong> · Radius{' '}
                    <strong>{latestPolicy?.searchRadiusKm ?? 10}km</strong>
                  </span>
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    paddingTop: 6,
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <Link
                    href={`/planner?tenantId=${encodeURIComponent(company.id)}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Button variant="primary" size="sm" leftIcon={<Cpu size={14} />}>
                      Route Optimizer
                    </Button>
                  </Link>
                  <Link
                    href={`/routes?tenantId=${encodeURIComponent(company.id)}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Button variant="secondary" size="sm" leftIcon={<Navigation size={14} />}>
                      View Routes
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInspectCompany(company);
                      setOfficeMsg(null);
                    }}
                  >
                    Manage Offices & Policy
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SideDrawer: Onboard New Corporate Client */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Onboard Corporate Client"
        subtitle="Creates tenant, primary office campus, dispatch policy, and Corporate Portal login credentials."
        width="640px"
      >
        {onboardResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                padding: 18,
                borderRadius: 10,
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                border: '1px solid rgba(22, 163, 74, 0.3)',
                color: '#15803D',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <CheckCircle2 size={22} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {onboardResult.tenant.name} ({onboardResult.tenant.code}) Onboarded Successfully
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  Corporate Portal login is now active. The company can sign in directly on the Corporate Portal using email/mobile & password or OTP.
                </div>
              </div>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 10,
                backgroundColor: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: 13,
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Corporate Portal Credentials</div>
              <div>
                <strong>Admin Name:</strong> {onboardResult.adminUser.fullName} ({onboardResult.adminUser.corporateRole})
              </div>
              <div>
                <strong>Email Login:</strong> {onboardResult.portalAccess.email}
              </div>
              <div>
                <strong>Mobile Login / OTP:</strong> {onboardResult.portalAccess.phone}
              </div>
              <div>
                <strong>Password Status:</strong>{' '}
                {onboardResult.portalAccess.passwordConfigured ? 'Configured & ready' : 'OTP-only'}
              </div>
              <div>
                <strong>Primary Office Coordinates:</strong> {onboardResult.office.latitude.toFixed(5)},{' '}
                {onboardResult.office.longitude.toFixed(5)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
                Close
              </Button>
              <Link href={`/planner?tenantId=${encodeURIComponent(onboardResult.tenant.id)}`}>
                <Button variant="primary" rightIcon={<ExternalLink size={14} />}>
                  Go to Route Optimizer
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitOnboard} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {formError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  color: '#DC2626',
                  fontSize: 12.5,
                }}
              >
                {formError}
              </div>
            )}

            {/* 1. Company Identity */}
            <section style={sectionBoxStyle}>
              <h4 style={sectionTitleStyle}>
                <Building2 size={15} /> 1. Company Legal & Profile Details
              </h4>
              <div style={twoColGrid}>
                <label style={fieldLabelStyle}>
                  Company Display Name *
                  <input
                    style={inputStyle}
                    value={form.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        name: val,
                        code: prev.code === '' || prev.code === suggestTenantCode(prev.name)
                          ? suggestTenantCode(val)
                          : prev.code,
                      }));
                    }}
                    placeholder="e.g. Acme Cyber Systems"
                    required
                  />
                </label>
                <label style={fieldLabelStyle}>
                  Tenant Code *
                  <input
                    style={inputStyle}
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="ACME_TECH"
                    required
                  />
                </label>
              </div>
              <div style={twoColGrid}>
                <label style={fieldLabelStyle}>
                  Registered Legal Entity Name *
                  <input
                    style={inputStyle}
                    value={form.legalEntityName}
                    onChange={(e) => setForm({ ...form, legalEntityName: e.target.value })}
                    placeholder="Acme Cyber Systems Pvt. Ltd."
                    required
                  />
                </label>
                <label style={fieldLabelStyle}>
                  GSTIN (15 chars, Optional)
                  <input
                    style={inputStyle}
                    value={form.gstin}
                    maxLength={15}
                    onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                    placeholder="36AABCU9603R1ZM"
                  />
                </label>
              </div>
            </section>

            {/* 2. Primary Office Campus */}
            <section style={sectionBoxStyle}>
              <h4 style={sectionTitleStyle}>
                <MapPin size={15} /> 2. Primary Office Location
              </h4>
              <div style={twoColGrid}>
                <label style={fieldLabelStyle}>
                  Office Code *
                  <input
                    style={inputStyle}
                    value={form.officeCode}
                    onChange={(e) => setForm({ ...form, officeCode: e.target.value.toUpperCase() })}
                    placeholder="HYD-HQ"
                    required
                  />
                </label>
                <label style={fieldLabelStyle}>
                  Campus / Facility Name *
                  <input
                    style={inputStyle}
                    value={form.officeName}
                    onChange={(e) => setForm({ ...form, officeName: e.target.value })}
                    placeholder="Mindspace Building 9"
                    required
                  />
                </label>
              </div>
              <label style={fieldLabelStyle}>
                Full Office Address (Auto-geocoded via Google Maps if coords empty) *
                <input
                  style={inputStyle}
                  value={form.officeAddressText}
                  onChange={(e) => setForm({ ...form, officeAddressText: e.target.value })}
                  placeholder="Mindspace IT Park, HITEC City, Hyderabad, Telangana 500081"
                  required
                />
              </label>
              <div style={twoColGrid}>
                <label style={fieldLabelStyle}>
                  Latitude (Optional override)
                  <input
                    style={inputStyle}
                    type="number"
                    step="any"
                    value={form.officeLatitude}
                    onChange={(e) => setForm({ ...form, officeLatitude: e.target.value })}
                    placeholder="17.4435"
                  />
                </label>
                <label style={fieldLabelStyle}>
                  Longitude (Optional override)
                  <input
                    style={inputStyle}
                    type="number"
                    step="any"
                    value={form.officeLongitude}
                    onChange={(e) => setForm({ ...form, officeLongitude: e.target.value })}
                    placeholder="78.3772"
                  />
                </label>
              </div>
            </section>

            {/* 3. Corporate Portal Admin Account */}
            <section style={sectionBoxStyle}>
              <h4 style={sectionTitleStyle}>
                <UserPlus size={15} /> 3. Corporate Portal Admin Credentials
              </h4>
              <div style={twoColGrid}>
                <label style={fieldLabelStyle}>
                  Transport Admin Full Name *
                  <input
                    style={inputStyle}
                    value={form.adminFullName}
                    onChange={(e) => setForm({ ...form, adminFullName: e.target.value })}
                    placeholder="Priya Nair"
                    required
                  />
                </label>
                <label style={fieldLabelStyle}>
                  Corporate Email (Portal Login) *
                  <input
                    style={inputStyle}
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                    placeholder="transport@acme.com"
                    required
                  />
                </label>
              </div>
              <div style={twoColGrid}>
                <label style={fieldLabelStyle}>
                  Mobile Number (+91 for OTP & Alerts) *
                  <input
                    style={inputStyle}
                    value={form.adminPhone}
                    onChange={(e) => setForm({ ...form, adminPhone: e.target.value })}
                    placeholder="+919876543210"
                    required
                  />
                </label>
                <label style={fieldLabelStyle}>
                  Initial Portal Password *
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      type="text"
                      value={form.adminPassword}
                      onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                      placeholder="Min 6 characters"
                      required
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={generateSecurePassword}
                      title="Generate password"
                      style={{ height: 36 }}
                    >
                      <KeyRound size={14} />
                    </Button>
                  </div>
                </label>
              </div>
            </section>

            {/* 4. Operational SLA & Autonomous Dispatch Settings */}
            <section style={sectionBoxStyle}>
              <h4 style={sectionTitleStyle}>
                <Clock size={15} /> 4. Operational & 30m+30m Dispatch Policy
              </h4>
              <div style={threeColGrid}>
                <label style={fieldLabelStyle}>
                  Vehicle Type
                  <select
                    style={inputStyle}
                    value={form.defaultVehicleCategory}
                    onChange={(e) => {
                      const cat = e.target.value === 'SUV' ? 'SUV' : 'SEDAN';
                      setForm({ ...form, defaultVehicleCategory: cat, defaultCapacity: cat === 'SUV' ? 6 : 4 });
                    }}
                  >
                    <option value="SEDAN">SEDAN (4 seats)</option>
                    <option value="SUV">SUV (6 seats)</option>
                  </select>
                </label>
                <label style={fieldLabelStyle}>
                  Seat Capacity
                  <input
                    style={inputStyle}
                    type="number"
                    min={1}
                    max={12}
                    value={form.defaultCapacity}
                    onChange={(e) => setForm({ ...form, defaultCapacity: Number(e.target.value) })}
                  />
                </label>
                <label style={fieldLabelStyle}>
                  Wait / Dwell per Stop (Max 10m)
                  <input
                    style={inputStyle}
                    type="number"
                    min={1}
                    max={10}
                    value={form.stopDwellMinutes}
                    onChange={(e) => setForm({ ...form, stopDwellMinutes: Number(e.target.value) })}
                  />
                </label>
              </div>
              <div style={threeColGrid}>
                <label style={fieldLabelStyle}>
                  Driver Travel Window (min)
                  <input
                    style={inputStyle}
                    type="number"
                    min={5}
                    max={120}
                    value={form.approachLeadMinutes}
                    onChange={(e) => setForm({ ...form, approachLeadMinutes: Number(e.target.value) })}
                  />
                </label>
                <label style={fieldLabelStyle}>
                  Dispatch Search Window (min)
                  <input
                    style={inputStyle}
                    type="number"
                    min={5}
                    max={120}
                    value={form.dispatchWindowMinutes}
                    onChange={(e) => setForm({ ...form, dispatchWindowMinutes: Number(e.target.value) })}
                  />
                </label>
                <label style={fieldLabelStyle}>
                  Retry Every (min) · Search Radius (km)
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      style={{ ...inputStyle, width: '50%' }}
                      type="number"
                      min={1}
                      max={30}
                      value={form.dispatchRetryIntervalMinutes}
                      onChange={(e) => setForm({ ...form, dispatchRetryIntervalMinutes: Number(e.target.value) })}
                    />
                    <input
                      style={{ ...inputStyle, width: '50%' }}
                      type="number"
                      min={1}
                      max={25}
                      value={form.searchRadiusKm}
                      onChange={(e) => setForm({ ...form, searchRadiusKm: Number(e.target.value) })}
                    />
                  </div>
                </label>
              </div>
            </section>

            {/* 5. Initial Shift Template */}
            <section style={sectionBoxStyle}>
              <h4 style={sectionTitleStyle}>
                <Sparkles size={15} /> 5. Initial Shift Template (Optional)
              </h4>
              <div style={threeColGrid}>
                <label style={fieldLabelStyle}>
                  Shift Label
                  <input
                    style={inputStyle}
                    value={form.shiftName}
                    onChange={(e) => setForm({ ...form, shiftName: e.target.value })}
                    placeholder="General Shift"
                  />
                </label>
                <label style={fieldLabelStyle}>
                  Login Time
                  <input
                    style={inputStyle}
                    type="time"
                    value={form.loginTime}
                    onChange={(e) => setForm({ ...form, loginTime: e.target.value })}
                  />
                </label>
                <label style={fieldLabelStyle}>
                  Logout Time
                  <input
                    style={inputStyle}
                    type="time"
                    value={form.logoutTime}
                    onChange={(e) => setForm({ ...form, logoutTime: e.target.value })}
                  />
                </label>
              </div>
            </section>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6 }}>
              <Button type="button" variant="secondary" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={submitting}>
                Complete Onboarding & Create Portal Account
              </Button>
            </div>
          </form>
        )}
      </Drawer>

      {/* SideDrawer: Inspect Company Offices & Add Campus */}
      <Drawer
        isOpen={Boolean(inspectCompany)}
        onClose={() => setInspectCompany(null)}
        title={inspectCompany ? `${inspectCompany.name} (${inspectCompany.code})` : 'Company Details'}
        subtitle="Offices, operational SLA policy, and Corporate Portal admins"
        width="560px"
      >
        {inspectCompany && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={sectionBoxStyle}>
              <h4 style={sectionTitleStyle}>Offices ({inspectCompany.offices?.length ?? 0})</h4>
              {(inspectCompany.offices ?? []).map((off) => (
                <div
                  key={off.id}
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: 12.5,
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {off.name} ({off.code})
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{off.addressText}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                    {Number(off.latitude).toFixed(5)}, {Number(off.longitude).toFixed(5)}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddOffice} style={sectionBoxStyle}>
              <h4 style={sectionTitleStyle}>Add Additional Office Campus</h4>
              {officeMsg && <div style={{ fontSize: 12, color: 'var(--brand-primary)' }}>{officeMsg}</div>}
              <div style={twoColGrid}>
                <input
                  style={inputStyle}
                  placeholder="Office Code (e.g. BLR-02)"
                  value={officeForm.code}
                  onChange={(e) => setOfficeForm({ ...officeForm, code: e.target.value })}
                />
                <input
                  style={inputStyle}
                  placeholder="Campus Name"
                  value={officeForm.name}
                  onChange={(e) => setOfficeForm({ ...officeForm, name: e.target.value })}
                />
              </div>
              <input
                style={inputStyle}
                placeholder="Full Office Address"
                value={officeForm.addressText}
                onChange={(e) => setOfficeForm({ ...officeForm, addressText: e.target.value })}
              />
              <div style={twoColGrid}>
                <input
                  style={inputStyle}
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={officeForm.latitude}
                  onChange={(e) => setOfficeForm({ ...officeForm, latitude: e.target.value })}
                />
                <input
                  style={inputStyle}
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={officeForm.longitude}
                  onChange={(e) => setOfficeForm({ ...officeForm, longitude: e.target.value })}
                />
              </div>
              <Button type="submit" variant="primary" size="sm" isLoading={officeSaving}>
                Save Office Campus
              </Button>
            </form>
          </div>
        )}
      </Drawer>
    </div>
  );
}

const sectionBoxStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderRadius: 10,
  backgroundColor: 'var(--bg-surface-muted)',
  border: '1px solid var(--border-subtle)',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--text-primary)',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const twoColGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
};

const threeColGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 10,
};

const fieldLabelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 11.5,
  fontWeight: 600,
  color: 'var(--text-secondary)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 36,
  padding: '0 10px',
  borderRadius: 8,
  border: '1px solid var(--border-strong, #CBD5E1)',
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

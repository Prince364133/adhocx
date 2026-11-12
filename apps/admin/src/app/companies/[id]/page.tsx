'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Check,
  ClipboardList,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { adminApi } from '../../../lib/api/client';
import {
  CorporateCompanyUser,
  CorporateDepartmentInput,
  CorporateDepartmentItem,
  CorporateOfficeInput,
  CorporateOfficeItem,
  CorporateTenantProfile,
  CorporateTransportZoneInput,
  CorporateTransportZoneItem,
  InviteCorporateCompanyUserInput,
} from '../../../lib/api/types';
import {
  Button,
  Card,
  Drawer,
  PageHeader,
  StatusBadge,
} from '../../../components/common';

type Section = 'organization' | 'legal' | 'offices' | 'departments' | 'zones' | 'users';
type Notice = { kind: 'success' | 'error'; text: string } | null;
type OfficeDraft = CorporateOfficeInput;
type DepartmentDraft = CorporateDepartmentInput;
type ZoneDraft = CorporateTransportZoneInput;
type UserDraft = InviteCorporateCompanyUserInput;
const OPS_BASE_URL =
  process.env.NEXT_PUBLIC_OPS_URL?.replace(/\/+$/, '') ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:7004' : undefined);

const sectionItems: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'organization', label: 'Organization', icon: <Building2 size={17} /> },
  { id: 'legal', label: 'Legal & tax', icon: <FileText size={17} /> },
  { id: 'offices', label: 'Offices & sites', icon: <MapPin size={17} /> },
  { id: 'departments', label: 'Departments', icon: <ClipboardList size={17} /> },
  { id: 'zones', label: 'Transport zones', icon: <MapPin size={17} /> },
  { id: 'users', label: 'Users & roles', icon: <Users size={17} /> },
];

const roleOptions = [
  { value: 'CORP_SUPER_ADMIN', label: 'Super Admin' },
  { value: 'HR', label: 'HR' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'SAFETY', label: 'Safety' },
  { value: 'READ_ONLY', label: 'Read only' },
];

const fieldStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0.65rem 0.75rem',
  border: '1px solid var(--border-light)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  font: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  color: 'var(--text-secondary)',
  fontSize: '0.8125rem',
  fontWeight: 600,
};

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
  gap: '1rem',
};

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
  maxLength,
  pattern,
  placeholder,
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  required?: boolean;
  type?: string;
  maxLength?: number;
  pattern?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <label style={labelStyle}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        required={required}
        maxLength={maxLength}
        pattern={pattern}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{ ...fieldStyle, ...(readOnly ? { opacity: 0.75 } : {}) }}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  required,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label style={labelStyle}>
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        rows={rows}
        placeholder={placeholder}
        style={{ ...fieldStyle, resize: 'vertical' }}
      />
    </label>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card padding="lg" style={{ marginBottom: '1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>{title}</h2>
          {description && (
            <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                style={{
                  padding: '0.7rem 0.75rem',
                  textAlign: 'left',
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-light)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function TableCell({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: '0.8rem 0.75rem',
        borderBottom: '1px solid var(--border-light)',
        color: 'var(--text-primary)',
        fontSize: '0.8125rem',
        verticalAlign: 'middle',
      }}
    >
      {children}
    </td>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        {text}
      </td>
    </tr>
  );
}

function SearchBox({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <input
      type="search"
      aria-label={label}
      placeholder={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{ ...fieldStyle, maxWidth: 360, marginBottom: '1rem' }}
    />
  );
}

function emptyOffice(): OfficeDraft {
  return {
    code: '',
    name: '',
    addressText: '',
    city: '',
    state: '',
    pinCode: '',
    country: 'India',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    latitude: Number.NaN,
    longitude: Number.NaN,
  };
}

function emptyDepartment(): DepartmentDraft {
  return { code: '', name: '', departmentHead: '', officeId: '', description: '' };
}

function emptyZone(): ZoneDraft {
  return { officeId: '', code: '', name: '', description: '', serviceArea: '', pickupLocations: [], dropLocations: [] };
}

export default function CompanyProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const companyId = params.id;
  const [section, setSection] = useState<Section>('organization');
  const [company, setCompany] = useState<CorporateTenantProfile | null>(null);
  const [offices, setOffices] = useState<CorporateOfficeItem[]>([]);
  const [departments, setDepartments] = useState<CorporateDepartmentItem[]>([]);
  const [zones, setZones] = useState<CorporateTransportZoneItem[]>([]);
  const [users, setUsers] = useState<CorporateCompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [search, setSearch] = useState<Record<'offices' | 'departments' | 'zones' | 'users', string>>({
    offices: '',
    departments: '',
    zones: '',
    users: '',
  });
  const [drawer, setDrawer] = useState<'office' | 'department' | 'zone' | 'user' | null>(null);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [officeDraft, setOfficeDraft] = useState<OfficeDraft>(emptyOffice);
  const [departmentDraft, setDepartmentDraft] = useState<DepartmentDraft>(emptyDepartment);
  const [zoneDraft, setZoneDraft] = useState<ZoneDraft>(emptyZone);
  const [userDraft, setUserDraft] = useState<UserDraft>({
    fullName: '',
    email: '',
    phone: '',
    corporateRole: 'READ_ONLY',
    officeIds: [],
  });
  const [organizationEditing, setOrganizationEditing] = useState(false);
  const [legalEditing, setLegalEditing] = useState(false);
  const [organizationDraft, setOrganizationDraft] = useState({
    name: '',
    industry: '',
    website: '',
    registeredAddress: '',
    city: '',
    state: '',
    pinCode: '',
    country: '',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
  });
  const [legalDraft, setLegalDraft] = useState({
    legalEntityName: '',
    gstin: '',
    cin: '',
    billingSameAsRegistered: true,
    billingAddress: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const [profile, officeItems, departmentItems, zoneItems, userItems] = await Promise.all([
        adminApi.getCorporateTenant(companyId),
        adminApi.getCorporateOffices(companyId),
        adminApi.getCorporateDepartments(companyId),
        adminApi.getCorporateTransportZones(companyId),
        adminApi.getCorporateCompanyUsers(companyId),
      ]);
      setCompany(profile);
      setOffices(officeItems);
      setDepartments(departmentItems);
      setZones(zoneItems);
      setUsers(userItems);
      setOrganizationDraft({
        name: profile.name || '',
        industry: profile.industry || '',
        website: profile.website || '',
        registeredAddress: profile.registeredAddress || '',
        city: profile.city || '',
        state: profile.state || '',
        pinCode: profile.pinCode || '',
        country: profile.country || '',
        primaryContactName: profile.primaryContactName || '',
        primaryContactEmail: profile.primaryContactEmail || '',
        primaryContactPhone: profile.primaryContactPhone || '',
      });
      setLegalDraft({
        legalEntityName: profile.legalEntityName || '',
        gstin: profile.gstin || '',
        cin: profile.cin || '',
        billingSameAsRegistered: profile.billingSameAsRegistered,
        billingAddress: profile.billingAddress || '',
      });
      return true;
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not load company profile.' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('logoUpload') === 'failed') {
      setNotice({ kind: 'error', text: 'Company was created, but its logo could not be uploaded. You can try again in Organization details.' });
      router.replace(`/companies/${companyId}`);
    }
  }, [companyId, router]);

  const filteredOffices = useMemo(() => {
    const query = search.offices.trim().toLowerCase();
    return offices.filter((office) =>
      !query || [office.code, office.name, office.city, office.state, office.addressText].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [offices, search.offices]);
  const filteredDepartments = useMemo(() => {
    const query = search.departments.trim().toLowerCase();
    return departments.filter((department) =>
      !query || [department.code, department.name, department.departmentHead, department.office?.name].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [departments, search.departments]);
  const filteredZones = useMemo(() => {
    const query = search.zones.trim().toLowerCase();
    return zones.filter((zone) =>
      !query || [zone.code, zone.name, zone.serviceArea, zone.office?.name].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [zones, search.zones]);
  const filteredUsers = useMemo(() => {
    const query = search.users.trim().toLowerCase();
    return users.filter((user) =>
      !query || [user.fullName, user.email, user.phone, user.corporateRole].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [users, search.users]);

  function setSearchFor(key: 'offices' | 'departments' | 'zones' | 'users', value: string) {
    setSearch((current) => ({ ...current, [key]: value }));
  }

  function openOffice(office?: CorporateOfficeItem) {
    setEditingId(office?.id || '');
    setOfficeDraft(office ? {
      code: office.code,
      name: office.name,
      addressText: office.addressText,
      city: office.city || '',
      state: office.state || '',
      pinCode: office.pinCode || '',
      country: office.country || 'India',
      contactName: office.contactName || '',
      contactEmail: office.contactEmail || '',
      contactPhone: office.contactPhone || '',
      latitude: Number(office.latitude),
      longitude: Number(office.longitude),
      isActive: office.isActive,
    } : emptyOffice());
    setDrawer('office');
  }

  function openDepartment(department?: CorporateDepartmentItem) {
    setEditingId(department?.id || '');
    setDepartmentDraft(department ? {
      code: department.code,
      name: department.name,
      departmentHead: department.departmentHead || '',
      officeId: department.officeId || '',
      description: department.description || '',
      isActive: department.isActive,
    } : emptyDepartment());
    setDrawer('department');
  }

  function openZone(zone?: CorporateTransportZoneItem) {
    setEditingId(zone?.id || '');
    setZoneDraft(zone ? {
      officeId: zone.officeId,
      code: zone.code,
      name: zone.name,
      description: zone.description || '',
      serviceArea: zone.serviceArea,
      pickupLocations: zone.pickupLocations,
      dropLocations: zone.dropLocations,
      isActive: zone.isActive,
    } : emptyZone());
    setDrawer('zone');
  }

  function openUser(user?: CorporateCompanyUser) {
    setEditingId(user?.id || '');
    setUserDraft(user ? {
      fullName: user.fullName,
      email: user.email || '',
      phone: user.phone || '',
      corporateRole: user.corporateRole,
      officeIds: user.corporateOfficeIds || [],
    } : {
      fullName: '',
      email: '',
      phone: '',
      corporateRole: 'READ_ONLY',
      officeIds: [],
    });
    setDrawer('user');
  }

  function closeDrawer() {
    if (saving) return;
    setDrawer(null);
    setEditingId('');
  }

  async function saveOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company) return;
    setSaving(true);
    setNotice(null);
    try {
      const updated = await adminApi.updateCorporateTenant(companyId, organizationDraft);
      setCompany((current) => current ? { ...current, ...updated } : updated);
      setOrganizationEditing(false);
      setNotice({ kind: 'success', text: 'Organization details updated.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not update organization details.' });
    } finally {
      setSaving(false);
    }
  }

  async function saveLegal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company) return;
    setSaving(true);
    setNotice(null);
    try {
      const updated = await adminApi.updateCorporateTenant(companyId, legalDraft);
      setCompany((current) => current ? { ...current, ...updated } : updated);
      setLegalEditing(false);
      setNotice({ kind: 'success', text: 'Legal and tax details updated.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not update legal details.' });
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice({ kind: 'error', text: 'Choose an image file for the company logo.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setNotice({ kind: 'error', text: 'The company logo must be 2 MB or smaller.' });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const result = await adminApi.uploadCorporateTenantLogo(companyId, file);
      setCompany((current) => current ? { ...current, logoUrl: result.logoUrl } : current);
      setNotice({ kind: 'success', text: 'Company logo updated.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not upload company logo.' });
    } finally {
      setSaving(false);
    }
  }

  async function saveOffice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      if (editingId) {
        await adminApi.updateCorporateOffice(companyId, editingId, officeDraft);
      } else {
        await adminApi.createCorporateOffice(companyId, officeDraft);
      }
      setDrawer(null);
      if (!(await loadData())) return;
      setNotice({ kind: 'success', text: editingId ? 'Office updated.' : 'Office added.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not save office.' });
    } finally {
      setSaving(false);
    }
  }

  async function saveDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    const payload = {
      ...departmentDraft,
      officeId: departmentDraft.officeId || undefined,
      departmentHead: departmentDraft.departmentHead || undefined,
      description: departmentDraft.description || undefined,
    };
    try {
      if (editingId) {
        await adminApi.updateCorporateDepartment(companyId, editingId, payload);
      } else {
        await adminApi.createCorporateDepartment(companyId, payload);
      }
      setDrawer(null);
      if (!(await loadData())) return;
      setNotice({ kind: 'success', text: editingId ? 'Department updated.' : 'Department added.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not save department.' });
    } finally {
      setSaving(false);
    }
  }

  async function saveZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    const payload = {
      ...zoneDraft,
      description: zoneDraft.description || undefined,
      pickupLocations: zoneDraft.pickupLocations.map((item) => item.trim()).filter(Boolean),
      dropLocations: zoneDraft.dropLocations.map((item) => item.trim()).filter(Boolean),
    };
    try {
      if (editingId) {
        await adminApi.updateCorporateTransportZone(companyId, editingId, payload);
      } else {
        await adminApi.createCorporateTransportZone(companyId, payload);
      }
      setDrawer(null);
      if (!(await loadData())) return;
      setNotice({ kind: 'success', text: editingId ? 'Transport zone updated.' : 'Transport zone added.' });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not save transport zone.' });
    } finally {
      setSaving(false);
    }
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    const input = {
      ...userDraft,
      email: userDraft.email || undefined,
      phone: userDraft.phone || undefined,
      officeIds: userDraft.officeIds || [],
    };
    try {
      if (editingId) {
        await adminApi.updateCorporateCompanyUser(companyId, editingId, input);
      } else {
        await adminApi.inviteCorporateCompanyUser(companyId, input);
      }
      setDrawer(null);
      if (!(await loadData())) return;
      setNotice({
        kind: 'success',
        text: editingId
          ? 'Corporate user profile and access updated.'
          : 'Corporate user account created. They can sign in through the existing OTP flow.',
      });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not save corporate user.' });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(kind: 'office' | 'department' | 'zone' | 'user', id: string, isActive: boolean) {
    const subject = kind === 'office' ? 'office' : kind === 'department' ? 'department' : kind === 'zone' ? 'transport zone' : 'user';
    const verb = isActive ? 'Deactivate' : 'Reactivate';
    if (!window.confirm(`${verb} this ${subject}?`)) return;
    setNotice(null);
    try {
      if (kind === 'office') await adminApi.updateCorporateOffice(companyId, id, { isActive: !isActive });
      if (kind === 'department') await adminApi.updateCorporateDepartment(companyId, id, { isActive: !isActive });
      if (kind === 'zone') await adminApi.updateCorporateTransportZone(companyId, id, { isActive: !isActive });
      if (kind === 'user') await adminApi.updateCorporateCompanyUser(companyId, id, { isActive: !isActive });
      if (!(await loadData())) return;
      setNotice({ kind: 'success', text: `${subject[0].toUpperCase()}${subject.slice(1)} ${isActive ? 'deactivated' : 'reactivated'}.` });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : `Could not ${verb.toLowerCase()} ${subject}.` });
    }
  }

  function changeOfficeIds(officeId: string, checked: boolean) {
    setUserDraft((current) => ({
      ...current,
      officeIds: checked
        ? Array.from(new Set([...(current.officeIds || []), officeId]))
        : (current.officeIds || []).filter((id) => id !== officeId),
    }));
  }

  if (loading && !company) {
    return (
      <>
        <PageHeader title="Company profile" breadcrumbs={[{ label: 'Admin' }, { label: 'Companies', href: '/companies' }, { label: 'Profile' }]} />
        <Card><p style={{ color: 'var(--text-secondary)' }}>Loading company profile…</p></Card>
      </>
    );
  }

  if (!company) {
    return (
      <>
        <PageHeader title="Company profile" breadcrumbs={[{ label: 'Admin' }, { label: 'Companies', href: '/companies' }, { label: 'Profile' }]} />
        {notice && <NoticeBanner notice={notice} />}
        <Button variant="outline" onClick={() => void loadData()}>Try again</Button>
      </>
    );
  }

  const activeOffices = offices.filter((office) => office.isActive);
  const selectedUser = editingId ? users.find((user) => user.id === editingId) : undefined;
  const userOfficeOptions = offices.filter(
    (office) => office.isActive || selectedUser?.corporateOfficeIds.includes(office.id),
  );
  const currentSection = sectionItems.find((item) => item.id === section);

  return (
    <>
      <PageHeader
        title={company.name}
        subtitle={`${company.legalEntityName} · ${company.code}`}
        breadcrumbs={[{ label: 'Admin' }, { label: 'Companies', href: '/companies' }, { label: company.name }]}
        actions={
          <Link href="/companies" style={{ textDecoration: 'none' }}>
            <Button variant="outline" leftIcon={<ArrowLeft size={16} />}>Companies</Button>
          </Link>
        }
      />

      {notice && <NoticeBanner notice={notice} />}

      <Card padding="md" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div
            aria-label={company.name}
            style={{
              width: 58,
              height: 58,
              flexShrink: 0,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              backgroundColor: 'var(--brand-primary-subtle)',
              backgroundImage: company.logoUrl ? `url("${company.logoUrl}")` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--brand-primary)',
            }}
          >
            {!company.logoUrl && <Building2 size={24} />}
          </div>
          <div style={{ flex: '1 1 220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem' }}>{company.name}</strong>
              <StatusBadge status={company.status} size="sm" />
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: 4 }}>
              {company.industry || 'Industry not set'} · {company.city || 'Location not set'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            <Metric label="Offices" value={company._count?.offices ?? offices.length} />
            <Metric label="Employees" value={company._count?.employees ?? 0} />
            <Metric label="Routes" value={company._count?.routes ?? 0} />
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 230px) minmax(0, 1fr)', gap: '1rem', alignItems: 'start' }}>
        <Card padding="sm">
          <nav aria-label="Company profile sections" style={{ display: 'grid', gap: '0.25rem' }}>
            {sectionItems.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => { setSection(item.id); setNotice(null); }}
                aria-current={section === item.id ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  width: '100%',
                  padding: '0.7rem 0.75rem',
                  border: 0,
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'left',
                  color: section === item.id ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  background: section === item.id ? 'var(--brand-primary-subtle)' : 'transparent',
                  font: 'inherit',
                  fontSize: '0.8125rem',
                  fontWeight: section === item.id ? 700 : 500,
                  cursor: 'pointer',
                }}
              >
                {item.icon}{item.label}
              </button>
            ))}
          </nav>
          {OPS_BASE_URL && (
            <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '0.7rem', padding: '0.8rem 0.5rem 0.25rem' }}>
              <a href={`${OPS_BASE_URL}/board?tenantId=${encodeURIComponent(company.id)}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-primary)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 650 }}>
                View operations →
              </a>
            </div>
          )}
        </Card>

        <div aria-live="polite">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.15rem 0 0.8rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            {currentSection?.icon}<span>{currentSection?.label}</span>
          </div>
          {section === 'organization' && (
            <SectionCard
              title="Organization details"
              description="Company identity, registered office, and primary contact."
              action={!organizationEditing && <Button variant="outline" size="sm" leftIcon={<Pencil size={14} />} onClick={() => setOrganizationEditing(true)}>Edit</Button>}
            >
              {organizationEditing ? (
                <form onSubmit={saveOrganization} style={{ display: 'grid', gap: '1rem' }}>
                  <div style={formGridStyle}>
                    <Field label="Company name" value={organizationDraft.name} required maxLength={120} onChange={(value) => setOrganizationDraft((current) => ({ ...current, name: value }))} />
                    <Field label="Industry" value={organizationDraft.industry} maxLength={120} onChange={(value) => setOrganizationDraft((current) => ({ ...current, industry: value }))} />
                    <Field label="Website" value={organizationDraft.website} type="url" maxLength={240} placeholder="https://example.com" onChange={(value) => setOrganizationDraft((current) => ({ ...current, website: value }))} />
                    <Field label="Primary contact name" value={organizationDraft.primaryContactName} maxLength={120} onChange={(value) => setOrganizationDraft((current) => ({ ...current, primaryContactName: value }))} />
                    <Field label="Primary contact email" value={organizationDraft.primaryContactEmail} type="email" maxLength={254} onChange={(value) => setOrganizationDraft((current) => ({ ...current, primaryContactEmail: value }))} />
                    <Field label="Primary contact phone" value={organizationDraft.primaryContactPhone} type="tel" maxLength={24} onChange={(value) => setOrganizationDraft((current) => ({ ...current, primaryContactPhone: value }))} />
                    <Field label="City" value={organizationDraft.city} maxLength={100} onChange={(value) => setOrganizationDraft((current) => ({ ...current, city: value }))} />
                    <Field label="State / province" value={organizationDraft.state} maxLength={100} onChange={(value) => setOrganizationDraft((current) => ({ ...current, state: value }))} />
                    <Field label="Postal code" value={organizationDraft.pinCode} maxLength={20} onChange={(value) => setOrganizationDraft((current) => ({ ...current, pinCode: value }))} />
                    <Field label="Country" value={organizationDraft.country} maxLength={100} onChange={(value) => setOrganizationDraft((current) => ({ ...current, country: value }))} />
                  </div>
                  <TextAreaField label="Registered address" value={organizationDraft.registeredAddress} required rows={3} onChange={(value) => setOrganizationDraft((current) => ({ ...current, registeredAddress: value }))} />
                  <FormActions saving={saving} onCancel={() => setOrganizationEditing(false)} />
                </form>
              ) : (
                <>
                  <InfoGrid items={[
                    ['Company code', company.code],
                    ['Industry', company.industry],
                    ['Website', company.website],
                    ['Primary contact', company.primaryContactName],
                    ['Contact email', company.primaryContactEmail],
                    ['Contact phone', company.primaryContactPhone],
                    ['Registered address', [company.registeredAddress, company.city, company.state, company.pinCode, company.country].filter(Boolean).join(', ')],
                  ]} />
                  <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '1.25rem', paddingTop: '1rem' }}>
                    <label style={{ ...labelStyle, maxWidth: 320 }}>
                      Company logo
                      <input type="file" accept="image/*" disabled={saving} onChange={(event) => { void uploadLogo(event.target.files?.[0]); event.currentTarget.value = ''; }} style={{ ...fieldStyle, padding: '0.45rem' }} />
                    </label>
                    <small style={{ display: 'block', marginTop: '0.35rem', color: 'var(--text-muted)' }}>Image files up to 5 MB.</small>
                  </div>
                </>
              )}
            </SectionCard>
          )}

          {section === 'legal' && (
            <SectionCard
              title="Legal & tax"
              description="Registered entity identifiers and the company billing address."
              action={!legalEditing && <Button variant="outline" size="sm" leftIcon={<Pencil size={14} />} onClick={() => setLegalEditing(true)}>Edit</Button>}
            >
              {legalEditing ? (
                <form onSubmit={saveLegal} style={{ display: 'grid', gap: '1rem' }}>
                  <div style={formGridStyle}>
                    <Field label="Legal entity name" value={legalDraft.legalEntityName} required maxLength={180} onChange={(value) => setLegalDraft((current) => ({ ...current, legalEntityName: value }))} />
                    <Field label="GSTIN" value={legalDraft.gstin} maxLength={15} pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][A-Za-z0-9]Z[A-Za-z0-9]" placeholder="15-character GSTIN" onChange={(value) => setLegalDraft((current) => ({ ...current, gstin: value.toUpperCase() }))} />
                    <Field label="CIN" value={legalDraft.cin} maxLength={21} pattern="[LUlu][0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}" placeholder="21-character CIN" onChange={(value) => setLegalDraft((current) => ({ ...current, cin: value.toUpperCase() }))} />
                  </div>
                  <label style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={legalDraft.billingSameAsRegistered} onChange={(event) => setLegalDraft((current) => ({ ...current, billingSameAsRegistered: event.target.checked }))} />
                    Billing address is the same as the registered address
                  </label>
                  {!legalDraft.billingSameAsRegistered && (
                    <TextAreaField label="Billing address" value={legalDraft.billingAddress} required rows={3} onChange={(value) => setLegalDraft((current) => ({ ...current, billingAddress: value }))} />
                  )}
                  <FormActions saving={saving} onCancel={() => setLegalEditing(false)} />
                </form>
              ) : (
                <>
                  <InfoGrid items={[
                    ['Legal entity name', company.legalEntityName],
                    ['GSTIN', company.gstin],
                    ['CIN', company.cin],
                    ['Billing address', company.billingSameAsRegistered ? 'Same as registered address' : company.billingAddress],
                  ]} />
                  <div style={{ marginTop: '1rem', padding: '0.8rem 0.9rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-subtle, var(--bg-surface))', color: 'var(--text-secondary)', fontSize: '0.78rem', display: 'flex', gap: '0.5rem' }}>
                    <Shield size={15} /> Tax and registration identifiers are stored in the company profile.
                  </div>
                </>
              )}
            </SectionCard>
          )}

          {section === 'offices' && (
            <SectionCard title="Offices & sites" description="Manage company locations and their operational coordinates." action={<Button leftIcon={<Plus size={15} />} size="sm" onClick={() => openOffice()}>Add office</Button>}>
              <SearchBox value={search.offices} onChange={(value) => setSearchFor('offices', value)} label="Search offices" />
              <DataTable headers={['Office', 'Location', 'Contact', 'Employees', 'Routes', 'Status', '']}>
                {filteredOffices.length === 0 ? <EmptyRow colSpan={7} text="No matching offices." /> : filteredOffices.map((office) => (
                  <tr key={office.id}>
                    <TableCell><strong>{office.name}</strong><div style={{ color: 'var(--text-muted)', marginTop: 3 }}>{office.code}</div></TableCell>
                    <TableCell>{[office.city, office.state].filter(Boolean).join(', ') || office.addressText}</TableCell>
                    <TableCell>{office.contactName || '—'}<div style={{ color: 'var(--text-muted)', marginTop: 3 }}>{office.contactEmail || office.contactPhone || ''}</div></TableCell>
                    <TableCell>{office._count?.employees ?? 0}</TableCell>
                    <TableCell>{office._count?.routes ?? 0}</TableCell>
                    <TableCell><StatusBadge status={office.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" /></TableCell>
                    <TableCell><RowActions onEdit={() => openOffice(office)} onToggle={() => void toggleActive('office', office.id, office.isActive)} active={office.isActive} /></TableCell>
                  </tr>
                ))}
              </DataTable>
            </SectionCard>
          )}

          {section === 'departments' && (
            <SectionCard title="Departments" description="Organize employees by department and optional office." action={<Button leftIcon={<Plus size={15} />} size="sm" onClick={() => openDepartment()}>Add department</Button>}>
              <SearchBox value={search.departments} onChange={(value) => setSearchFor('departments', value)} label="Search departments" />
              <DataTable headers={['Department', 'Department head', 'Office', 'Employees', 'Status', '']}>
                {filteredDepartments.length === 0 ? <EmptyRow colSpan={6} text="No matching departments." /> : filteredDepartments.map((department) => (
                  <tr key={department.id}>
                    <TableCell><strong>{department.name}</strong><div style={{ color: 'var(--text-muted)', marginTop: 3 }}>{department.code}</div></TableCell>
                    <TableCell>{department.departmentHead || '—'}</TableCell>
                    <TableCell>{department.office?.name || 'All offices'}</TableCell>
                    <TableCell>{department._count?.employees ?? 0}</TableCell>
                    <TableCell><StatusBadge status={department.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" /></TableCell>
                    <TableCell><RowActions onEdit={() => openDepartment(department)} onToggle={() => void toggleActive('department', department.id, department.isActive)} active={department.isActive} /></TableCell>
                  </tr>
                ))}
              </DataTable>
            </SectionCard>
          )}

          {section === 'zones' && (
            <SectionCard title="Transport zones" description="Define service areas and common pickup/drop locations for an office." action={<Button leftIcon={<Plus size={15} />} size="sm" onClick={() => openZone()}>Add zone</Button>}>
              <SearchBox value={search.zones} onChange={(value) => setSearchFor('zones', value)} label="Search transport zones" />
              <DataTable headers={['Zone', 'Office', 'Service area', 'Pickup locations', 'Drop locations', 'Status', '']}>
                {filteredZones.length === 0 ? <EmptyRow colSpan={7} text="No matching transport zones." /> : filteredZones.map((zone) => (
                  <tr key={zone.id}>
                    <TableCell><strong>{zone.name}</strong><div style={{ color: 'var(--text-muted)', marginTop: 3 }}>{zone.code}</div></TableCell>
                    <TableCell>{zone.office?.name || '—'}</TableCell>
                    <TableCell>{zone.serviceArea}</TableCell>
                    <TableCell>{zone.pickupLocations.length}</TableCell>
                    <TableCell>{zone.dropLocations.length}</TableCell>
                    <TableCell><StatusBadge status={zone.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" /></TableCell>
                    <TableCell><RowActions onEdit={() => openZone(zone)} onToggle={() => void toggleActive('zone', zone.id, zone.isActive)} active={zone.isActive} /></TableCell>
                  </tr>
                ))}
              </DataTable>
              <p style={{ margin: '0.85rem 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>Zones store a text description of their service area; map-boundary drawing is not currently supported.</p>
            </SectionCard>
          )}

          {section === 'users' && (
            <SectionCard title="Users & roles" description="Manage corporate accounts, roles, and office access." action={<Button leftIcon={<Plus size={15} />} size="sm" onClick={() => openUser()}>Add user</Button>}>
              <SearchBox value={search.users} onChange={(value) => setSearchFor('users', value)} label="Search users" />
              <DataTable headers={['User', 'Role', 'Office access', 'Status', 'Created', '']}>
                {filteredUsers.length === 0 ? <EmptyRow colSpan={6} text="No matching users." /> : filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <TableCell><strong>{user.fullName}</strong><div style={{ color: 'var(--text-muted)', marginTop: 3 }}>{user.email || user.phone || 'No contact'}</div></TableCell>
                    <TableCell>{roleLabel(user.corporateRole)}</TableCell>
                    <TableCell>{user.corporateOfficeIds.length ? user.corporateOfficeIds.map((id) => offices.find((office) => office.id === id)?.name || 'Unknown office').join(', ') : 'All offices'}</TableCell>
                    <TableCell><StatusBadge status={user.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'} size="sm" /></TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell><RowActions onEdit={() => openUser(user)} onToggle={() => void toggleActive('user', user.id, user.status === 'ACTIVE')} active={user.status === 'ACTIVE'} /></TableCell>
                  </tr>
                ))}
              </DataTable>
              <p style={{ margin: '0.85rem 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>New accounts use the existing OTP sign-in flow. The company profile does not send email invitations.</p>
            </SectionCard>
          )}
        </div>
      </div>

      <Drawer
        isOpen={drawer !== null}
        onClose={closeDrawer}
        title={drawerTitle(drawer, Boolean(editingId))}
        subtitle={drawer === 'user' && !editingId ? 'Create a corporate user account and set its role and office scope.' : undefined}
        width="640px"
      >
        {drawer === 'office' && (
          <form onSubmit={saveOffice} style={{ display: 'grid', gap: '1rem' }}>
            <div style={formGridStyle}>
              <Field label="Office name" value={officeDraft.name} required maxLength={120} onChange={(value) => setOfficeDraft((current) => ({ ...current, name: value }))} />
              <Field label="Office code" value={officeDraft.code} required maxLength={32} pattern="[A-Za-z0-9_-]+" onChange={(value) => setOfficeDraft((current) => ({ ...current, code: value }))} />
              <Field label="City" value={officeDraft.city} required maxLength={100} onChange={(value) => setOfficeDraft((current) => ({ ...current, city: value }))} />
              <Field label="State / province" value={officeDraft.state} required maxLength={100} onChange={(value) => setOfficeDraft((current) => ({ ...current, state: value }))} />
              <Field label="Postal code" value={officeDraft.pinCode} required maxLength={20} onChange={(value) => setOfficeDraft((current) => ({ ...current, pinCode: value }))} />
              <Field label="Country" value={officeDraft.country} required maxLength={100} onChange={(value) => setOfficeDraft((current) => ({ ...current, country: value }))} />
              <Field label="Contact name" value={officeDraft.contactName} required maxLength={120} onChange={(value) => setOfficeDraft((current) => ({ ...current, contactName: value }))} />
              <Field label="Contact email" value={officeDraft.contactEmail} required type="email" maxLength={254} onChange={(value) => setOfficeDraft((current) => ({ ...current, contactEmail: value }))} />
              <Field label="Contact phone" value={officeDraft.contactPhone} required type="tel" maxLength={24} onChange={(value) => setOfficeDraft((current) => ({ ...current, contactPhone: value }))} />
                <Field label="Latitude" value={Number.isFinite(officeDraft.latitude) ? String(officeDraft.latitude) : ''} required type="number" onChange={(value) => setOfficeDraft((current) => ({ ...current, latitude: value ? Number(value) : Number.NaN }))} />
                <Field label="Longitude" value={Number.isFinite(officeDraft.longitude) ? String(officeDraft.longitude) : ''} required type="number" onChange={(value) => setOfficeDraft((current) => ({ ...current, longitude: value ? Number(value) : Number.NaN }))} />
            </div>
            <TextAreaField label="Office address" value={officeDraft.addressText} required rows={3} onChange={(value) => setOfficeDraft((current) => ({ ...current, addressText: value }))} />
            {editingId && <ActiveCheckbox checked={officeDraft.isActive !== false} onChange={(checked) => setOfficeDraft((current) => ({ ...current, isActive: checked }))} />}
            <FormActions saving={saving} onCancel={closeDrawer} submitLabel={editingId ? 'Save office' : 'Add office'} />
          </form>
        )}

        {drawer === 'department' && (
          <form onSubmit={saveDepartment} style={{ display: 'grid', gap: '1rem' }}>
            <div style={formGridStyle}>
              <Field label="Department name" value={departmentDraft.name} required maxLength={120} onChange={(value) => setDepartmentDraft((current) => ({ ...current, name: value }))} />
              <Field label="Department code" value={departmentDraft.code} required maxLength={32} pattern="[A-Za-z0-9_-]+" onChange={(value) => setDepartmentDraft((current) => ({ ...current, code: value }))} />
              <Field label="Department head" value={departmentDraft.departmentHead || ''} maxLength={120} onChange={(value) => setDepartmentDraft((current) => ({ ...current, departmentHead: value }))} />
            </div>
            <label style={labelStyle}>
              Office
              <select value={departmentDraft.officeId || ''} onChange={(event) => setDepartmentDraft((current) => ({ ...current, officeId: event.target.value }))} style={fieldStyle}>
                <option value="">All offices</option>
                {activeOffices.map((office) => <option key={office.id} value={office.id}>{office.name} ({office.code})</option>)}
              </select>
            </label>
            <TextAreaField label="Description" value={departmentDraft.description || ''} rows={3} onChange={(value) => setDepartmentDraft((current) => ({ ...current, description: value }))} />
            {editingId && <ActiveCheckbox checked={departmentDraft.isActive !== false} onChange={(checked) => setDepartmentDraft((current) => ({ ...current, isActive: checked }))} />}
            <FormActions saving={saving} onCancel={closeDrawer} submitLabel={editingId ? 'Save department' : 'Add department'} />
          </form>
        )}

        {drawer === 'zone' && (
          <form onSubmit={saveZone} style={{ display: 'grid', gap: '1rem' }}>
            <div style={formGridStyle}>
              <Field label="Zone name" value={zoneDraft.name} required maxLength={120} onChange={(value) => setZoneDraft((current) => ({ ...current, name: value }))} />
              <Field label="Zone code" value={zoneDraft.code} required maxLength={32} pattern="[A-Za-z0-9_-]+" onChange={(value) => setZoneDraft((current) => ({ ...current, code: value }))} />
            </div>
            <label style={labelStyle}>
              Office
              <select required value={zoneDraft.officeId} onChange={(event) => setZoneDraft((current) => ({ ...current, officeId: event.target.value }))} style={fieldStyle}>
                <option value="">Select an office</option>
                {activeOffices.map((office) => <option key={office.id} value={office.id}>{office.name} ({office.code})</option>)}
              </select>
            </label>
            <TextAreaField label="Service area" value={zoneDraft.serviceArea} required rows={3} placeholder="Describe the service boundary or covered locations" onChange={(value) => setZoneDraft((current) => ({ ...current, serviceArea: value }))} />
            <TextAreaField label="Pickup locations (one per line)" value={zoneDraft.pickupLocations.join('\n')} rows={3} onChange={(value) => setZoneDraft((current) => ({ ...current, pickupLocations: value.split(/\r?\n/) }))} />
            <TextAreaField label="Drop locations (one per line)" value={zoneDraft.dropLocations.join('\n')} rows={3} onChange={(value) => setZoneDraft((current) => ({ ...current, dropLocations: value.split(/\r?\n/) }))} />
            <TextAreaField label="Description" value={zoneDraft.description || ''} rows={2} onChange={(value) => setZoneDraft((current) => ({ ...current, description: value }))} />
            {editingId && <ActiveCheckbox checked={zoneDraft.isActive !== false} onChange={(checked) => setZoneDraft((current) => ({ ...current, isActive: checked }))} />}
            <FormActions saving={saving} onCancel={closeDrawer} submitLabel={editingId ? 'Save zone' : 'Add zone'} />
          </form>
        )}

        {drawer === 'user' && (
          <form onSubmit={saveUser} style={{ display: 'grid', gap: '1rem' }}>
            <div style={formGridStyle}>
              <Field label="Full name" value={userDraft.fullName} required maxLength={120} onChange={(value) => setUserDraft((current) => ({ ...current, fullName: value }))} />
              <Field label="Email" value={userDraft.email || ''} type="email" maxLength={254} required={!userDraft.phone} onChange={(value) => setUserDraft((current) => ({ ...current, email: value }))} />
              <Field label="Phone" value={userDraft.phone || ''} type="tel" maxLength={24} required={!userDraft.email} onChange={(value) => setUserDraft((current) => ({ ...current, phone: value }))} />
            </div>
            <label style={labelStyle}>
              Corporate role
              <select value={userDraft.corporateRole} onChange={(event) => setUserDraft((current) => ({ ...current, corporateRole: event.target.value }))} style={fieldStyle}>
                {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
            </label>
            <fieldset style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '0.8rem 1rem' }}>
              <legend style={{ padding: '0 0.35rem', color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 600 }}>Office access</legend>
              <p style={{ margin: '0 0 0.7rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Leave all offices unchecked to allow access to every office in this company.</p>
              {userOfficeOptions.length === 0 ? <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Add an active office to configure office-specific access.</span> : (
                <div style={{ display: 'grid', gap: '0.55rem' }}>
                  {userOfficeOptions.map((office) => (
                    <label key={office.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                      <input type="checkbox" checked={(userDraft.officeIds || []).includes(office.id)} onChange={(event) => changeOfficeIds(office.id, event.target.checked)} />
                      {office.name} <span style={{ color: 'var(--text-muted)' }}>({office.code}{office.isActive ? '' : ', inactive'})</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            {editingId && <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Manage account activation from the user list.</p>}
            <FormActions saving={saving} onCancel={closeDrawer} submitLabel={editingId ? 'Save user' : 'Create user'} />
          </form>
        )}
      </Drawer>
    </>
  );
}

function NoticeBanner({ notice }: { notice: NonNullable<Notice> }) {
  const isError = notice.kind === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
        padding: '0.75rem 0.9rem',
        marginBottom: '1rem',
        borderRadius: 'var(--radius-md)',
        color: isError ? 'var(--color-danger)' : 'var(--color-success, var(--brand-primary))',
        background: isError ? 'var(--color-danger-bg)' : 'var(--brand-primary-subtle)',
        fontSize: '0.8125rem',
      }}
    >
      {isError ? <X size={16} /> : <Check size={16} />}
      <span>{notice.text}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ minWidth: 65 }}>
      <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '1rem' }}>{value}</strong>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{label}</span>
    </div>
  );
}

function InfoGrid({ items }: { items: [string, string | null | undefined][] }) {
  return (
    <div style={formGridStyle}>
      {items.map(([label, value]) => (
        <div key={label} style={{ minWidth: 0 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.35rem' }}>{label}</div>
          <div style={{ color: 'var(--text-primary)', fontSize: '0.84rem', overflowWrap: 'anywhere' }}>{value || '—'}</div>
        </div>
      ))}
    </div>
  );
}

function FormActions({
  saving,
  onCancel,
  submitLabel = 'Save changes',
}: {
  saving: boolean;
  onCancel: () => void;
  submitLabel?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.3rem' }}>
      <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
      <Button type="submit" isLoading={saving}>{submitLabel}</Button>
    </div>
  );
}

function RowActions({ onEdit, onToggle, active }: { onEdit: () => void; onToggle: () => void; active: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
      <Button size="sm" variant="outline" onClick={onEdit} aria-label="Edit" title="Edit"><Pencil size={14} /></Button>
      <Button size="sm" variant="outline" onClick={onToggle} aria-label={active ? 'Deactivate' : 'Reactivate'} title={active ? 'Deactivate' : 'Reactivate'}>
        {active ? <X size={14} /> : <Check size={14} />}
      </Button>
    </div>
  );
}

function ActiveCheckbox({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      Active
    </label>
  );
}

function roleLabel(role: string) {
  return roleOptions.find((option) => option.value === role)?.label || role.replaceAll('_', ' ');
}

function drawerTitle(drawer: 'office' | 'department' | 'zone' | 'user' | null, editing: boolean) {
  const label = drawer === 'office' ? 'office' : drawer === 'department' ? 'department' : drawer === 'zone' ? 'transport zone' : drawer === 'user' ? 'corporate user' : '';
  return `${editing ? 'Edit' : 'Add'} ${label}`;
}

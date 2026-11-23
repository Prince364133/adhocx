'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CircleAlert, FileText, MapPin, Network, Search, Shield, Users, X } from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ApiError } from '../../lib/api/client';
import { tenantApi, usersApi } from '../../lib/api/corporate';
import {
  CORPORATE_PERMISSIONS,
  CORPORATE_ROLES,
  roleHas,
  type CorporatePermission,
  type CorporateRole,
} from '../../lib/auth/permissions';
import { useSession } from '../../lib/auth/SessionContext';
import type { CorporateUser, Department, Office, TransportZone } from '../../lib/api/types';
import styles from './CompanyProfile.module.css';

type SectionId = 'organization' | 'legal' | 'offices' | 'departments' | 'zones' | 'users';
type Feedback = { kind: 'success' | 'error'; text: string } | null;
type OfficeDraft = {
  code: string;
  name: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  addressText: string;
  latitude: string;
  longitude: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  isActive: boolean;
};
type DepartmentDraft = {
  code: string;
  name: string;
  departmentHead: string;
  officeId: string;
  description: string;
  isActive: boolean;
};
type ZoneDraft = {
  officeId: string;
  code: string;
  name: string;
  serviceArea: string;
  description: string;
  pickupLocationsText: string;
  dropLocationsText: string;
  isActive: boolean;
};
type OrganizationDraft = {
  name: string;
  industry: string;
  website: string;
  logoUrl: string;
  registeredAddress: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
};
type LegalDraft = {
  legalEntityName: string;
  gstin: string;
  cin: string;
  registeredBusinessAddress: string;
  billingAddress: string;
  billingSameAsRegistered: boolean;
};
type UserDraft = {
  fullName: string;
  email: string;
  phone: string;
  corporateRole: CorporateRole;
  officeIds: string[];
};
type ProfileDialog =
  | 'office'
  | 'edit-office'
  | 'department'
  | 'edit-department'
  | 'zone'
  | 'edit-zone'
  | 'view-zone'
  | 'invite'
  | 'edit-user'
  | 'view-user'
  | null;

const SECTIONS: Array<{ id: SectionId; label: string; icon: React.ReactNode }> = [
  {
    id: 'organization',
    label: 'Organization',
    icon: <Building2 size={16} />,
  },
  { id: 'legal', label: 'Legal & tax', icon: <FileText size={16} /> },
  { id: 'offices', label: 'Offices & sites', icon: <MapPin size={16} /> },
  { id: 'departments', label: 'Departments', icon: <Network size={16} /> },
  { id: 'zones', label: 'Transport zones', icon: <MapPin size={16} /> },
  { id: 'users', label: 'Users & roles', icon: <Users size={16} /> },
];

const initialOfficeDraft: OfficeDraft = {
  code: '',
  name: '',
  city: '',
  state: '',
  pinCode: '',
  country: 'India',
  addressText: '',
  latitude: '',
  longitude: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  isActive: true,
};
const initialDepartmentDraft: DepartmentDraft = {
  code: '',
  name: '',
  departmentHead: '',
  officeId: '',
  description: '',
  isActive: true,
};
const initialZoneDraft: ZoneDraft = {
  officeId: '',
  code: '',
  name: '',
  serviceArea: '',
  description: '',
  pickupLocationsText: '',
  dropLocationsText: '',
  isActive: true,
};
const emptyOrganizationDraft: OrganizationDraft = {
  name: '',
  industry: '',
  website: '',
  logoUrl: '',
  registeredAddress: '',
  city: '',
  state: '',
  pinCode: '',
  country: '',
  primaryContactName: '',
  primaryContactEmail: '',
  primaryContactPhone: '',
};
const emptyLegalDraft: LegalDraft = {
  legalEntityName: '',
  gstin: '',
  cin: '',
  registeredBusinessAddress: '',
  billingAddress: '',
  billingSameAsRegistered: true,
};
const CORPORATE_ROLE_DISPLAY_LABELS: Record<string, string> = {
  CORP_SUPER_ADMIN: 'Corporate Super Admin',
  HR: 'HR Manager',
  TRANSPORT: 'Transport Manager',
  FINANCE: 'Finance Manager',
  SAFETY: 'Safety Officer',
  READ_ONLY: 'Read-only Management',
};
const PERMISSION_DISPLAY_LABELS: Partial<Record<CorporatePermission, string>> = {
  'tenant:read': 'View organization',
  'tenant:write': 'Manage organization profile',
  'offices:read': 'View offices',
  'offices:write': 'Manage offices',
  'employees:read': 'View employees',
  'employees:write': 'Employee management',
  'users:read': 'View users',
  'users:invite': 'Manage users',
  'departments:read': 'View departments',
  'departments:write': 'Manage departments',
  'zones:read': 'View transport zones',
  'zones:write': 'Manage transport zones',
  'costcenters:read': 'View cost centers',
  'costcenters:write': 'Manage cost centers',
  'policy:read': 'View safety policies',
  'policy:write': 'Manage safety policies',
  'invoices:read': 'View invoices',
  'bookings:read': 'View bookings',
  'billing:write': 'Financial access',
  'reports:read': 'View reports',
};

function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'The request could not be completed. Please try again.';
}

function corporateRoleLabel(role?: string | null) {
  if (!role) return 'Unassigned';
  return CORPORATE_ROLE_DISPLAY_LABELS[role] ?? role;
}

function isCorporateRole(role: string | null): role is CorporateRole {
  return CORPORATE_ROLES.some((candidate) => candidate === role);
}

function userPermissionLabels(corporateUser: CorporateUser) {
  const role = corporateUser.corporateRole;
  if (!isCorporateRole(role)) return [];
  return CORPORATE_PERMISSIONS.filter((permission) => roleHas(role, permission)).map(
    (permission) => PERMISSION_DISPLAY_LABELS[permission] ?? permission,
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className={styles.card}>{children}</section>;
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionDescription}>{description}</p>
      </div>
      {action}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled = false,
  secondary = false,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  secondary?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${styles.actionButton}${secondary ? ` ${styles.actionButtonSecondary}` : ''}`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
  min,
  max,
  step,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <label className={styles.field}>
      {label}
      {required ? ' *' : ''}
      <input
        required={required}
        type={type}
        value={value}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={styles.fieldInput}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className={styles.field}>
      {label}
      {required ? ' *' : ''}
      <textarea
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={styles.fieldTextarea}
        rows={3}
      />
    </label>
  );
}

function Notice({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return (
    <div role={error ? 'alert' : 'note'} className={`${styles.notice}${error ? ` ${styles.noticeError}` : ''}`}>
      <span className={styles.noticeIcon}>{error ? <CircleAlert size={15} /> : <Shield size={15} />}</span>
      <div>{children}</div>
    </div>
  );
}

function ProfileDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.drawerOverlay}>
      <button
        type="button"
        className={styles.drawerBackdrop}
        onClick={onClose}
        aria-label="Close drawer"
        tabIndex={-1}
      />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <header className={styles.drawerHeader}>
          <div>
            <h2 className={styles.drawerTitle}>{title}</h2>
            {subtitle && <p className={styles.drawerSubtitle}>{subtitle}</p>}
          </div>
          <button type="button" className={styles.drawerClose} onClick={onClose} aria-label="Close drawer">
            <X size={18} />
          </button>
        </header>
        <div className={styles.drawerBody}>{children}</div>
      </aside>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className={styles.emptyState}>{children}</div>;
}

function valueOrDash(value?: string | null) {
  return value?.trim() || 'Not provided';
}

export default function CompanyProfilePage() {
  const { status, tenant, tenantId, tenantError, offices, officeScope, reloadTenant, can, user } = useSession();
  const [activeSection, setActiveSection] = useState<SectionId>('organization');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [dialog, setDialog] = useState<ProfileDialog>(null);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedZone, setSelectedZone] = useState<TransportZone | null>(null);
  const [selectedUser, setSelectedUser] = useState<CorporateUser | null>(null);
  const [officeDraft, setOfficeDraft] = useState<OfficeDraft>(initialOfficeDraft);
  const [departmentDraft, setDepartmentDraft] = useState<DepartmentDraft>(initialDepartmentDraft);
  const [zoneDraft, setZoneDraft] = useState<ZoneDraft>(initialZoneDraft);
  const [userDraft, setUserDraft] = useState<UserDraft>({
    fullName: '',
    email: '',
    phone: '',
    corporateRole: 'READ_ONLY',
    officeIds: [],
  });
  const [organizationDraft, setOrganizationDraft] = useState<OrganizationDraft>(emptyOrganizationDraft);
  const [legalDraft, setLegalDraft] = useState<LegalDraft>(emptyLegalDraft);
  const [editingOrganization, setEditingOrganization] = useState(false);
  const [editingLegal, setEditingLegal] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [transportZones, setTransportZones] = useState<TransportZone[]>([]);
  const [corporateUsers, setCorporateUsers] = useState<CorporateUser[]>([]);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submissionInProgress = React.useRef(false);
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const profileTenant = tenant;
  const profileOffices = offices;
  const profileDepartments = departments;
  const profileZones = transportZones;
  const profileUsers = corporateUsers;
  const canReadZones = can('zones:read');
  const canReadUsers = can('users:read') && !officeScope;
  const profileCompletionFields = profileTenant
    ? [
        profileTenant.name,
        profileTenant.industry,
        profileTenant.website,
        profileTenant.registeredAddress,
        profileTenant.city,
        profileTenant.state,
        profileTenant.pinCode,
        profileTenant.country,
        profileTenant.primaryContactName,
        profileTenant.primaryContactEmail,
        profileTenant.primaryContactPhone,
        profileTenant.legalEntityName,
        profileTenant.registeredBusinessAddress,
        profileTenant.billingSameAsRegistered ? 'same' : profileTenant.billingAddress,
      ]
    : [];
  const completedProfileFields = profileCompletionFields.filter((value) => value?.trim()).length;
  const profileCompletion = profileCompletionFields.length
    ? Math.round((completedProfileFields / profileCompletionFields.length) * 100)
    : 0;

  const loadSectionData = useCallback(async () => {
    if (!tenantId || (activeSection !== 'departments' && activeSection !== 'zones' && activeSection !== 'users')) return;
    setSectionLoading(true);
    setLoadError(null);
    try {
      if (activeSection === 'departments') {
        setDepartments(await tenantApi.departments(tenantId, true));
      } else if (activeSection === 'zones') {
        if (canReadZones) {
          setTransportZones(await tenantApi.transportZones(tenantId, true));
        } else {
          setTransportZones([]);
        }
      } else if (canReadUsers) {
        setCorporateUsers(await usersApi.list(tenantId));
      } else {
        setCorporateUsers([]);
      }
    } catch (error) {
      setLoadError(errorText(error));
    } finally {
      setSectionLoading(false);
    }
  }, [activeSection, canReadUsers, canReadZones, tenantId]);

  useEffect(() => {
    void loadSectionData();
  }, [loadSectionData]);

  const visibleOffices = useMemo(
    () =>
      profileOffices.filter((office) =>
        `${office.name} ${office.code} ${office.addressText} ${office.city ?? ''} ${office.state ?? ''} ${office.pinCode ?? office.pincode ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [profileOffices, search],
  );
  const visibleDepartments = useMemo(
    () =>
      profileDepartments.filter((department) =>
        `${department.name} ${department.code} ${department.departmentHead ?? ''} ${department.office?.name ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [profileDepartments, search],
  );
  const visibleZones = useMemo(
    () =>
      profileZones.filter((zone) =>
        `${zone.name} ${zone.code} ${zone.serviceArea} ${zone.office?.name ?? ''} ${(zone.pickupLocations ?? []).join(' ')}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [profileZones, search],
  );
  const visibleUsers = useMemo(
    () =>
      profileUsers.filter((corporateUser) =>
        `${corporateUser.fullName ?? ''} ${corporateUser.email ?? ''} ${corporateUser.phone ?? ''} ${corporateRoleLabel(corporateUser.corporateRole)} ${formatOfficeScope(corporateUser.corporateOfficeIds, profileOffices)}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [profileOffices, profileUsers, search],
  );
  function showSection(section: SectionId) {
    setActiveSection(section);
    setSearch('');
    setFeedback(null);
    setLoadError(null);
  }

  function closeDialog() {
    if (submitting) return;
    setDialog(null);
    setSelectedOffice(null);
    setSelectedDepartment(null);
    setSelectedZone(null);
    setSelectedUser(null);
    setFeedback(null);
  }

  async function submitOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId || !profileTenant || submissionInProgress.current) return;
    const name = organizationDraft.name.trim();
    const email = organizationDraft.primaryContactEmail.trim();
    const phone = organizationDraft.primaryContactPhone.trim();
    if (name.length < 2) {
      setFeedback({
        kind: 'error',
        text: 'Organization name must be at least 2 characters.',
      });
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFeedback({
        kind: 'error',
        text: 'Enter a valid primary contact email.',
      });
      return;
    }
    if (phone && phone.replace(/\D/g, '').length < 10) {
      setFeedback({
        kind: 'error',
        text: 'Enter a valid primary contact phone number.',
      });
      return;
    }
    if (organizationDraft.website.trim()) {
      try {
        const website = new URL(organizationDraft.website.trim());
        if (website.protocol !== 'http:' && website.protocol !== 'https:') throw new Error();
      } catch {
        setFeedback({
          kind: 'error',
          text: 'Enter a valid company website URL, including https://.',
        });
        return;
      }
    }
    submissionInProgress.current = true;
    setSubmitting(true);
    setFeedback(null);
    try {
      await tenantApi.updateProfile(tenantId, {
        name,
        legalEntityName: profileTenant.legalEntityName ?? name,
        gstin: profileTenant.gstin ?? null,
        industry: organizationDraft.industry,
        website: organizationDraft.website,
        logoUrl: organizationDraft.logoUrl,
        registeredAddress: organizationDraft.registeredAddress,
        city: organizationDraft.city,
        state: organizationDraft.state,
        pinCode: organizationDraft.pinCode,
        country: organizationDraft.country,
        primaryContactName: organizationDraft.primaryContactName,
        primaryContactEmail: email,
        primaryContactPhone: phone,
        cin: profileTenant.cin ?? null,
        registeredBusinessAddress: profileTenant.registeredBusinessAddress ?? null,
        billingAddress: profileTenant.billingAddress ?? null,
        billingSameAsRegistered: profileTenant.billingSameAsRegistered ?? true,
      });
      await reloadTenant();
      setEditingOrganization(false);
      setFeedback({ kind: 'success', text: 'Organization details saved.' });
    } catch (error) {
      setFeedback({ kind: 'error', text: errorText(error) });
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  }

  async function submitLegal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId || !profileTenant || submissionInProgress.current) return;
    const legalEntityName = legalDraft.legalEntityName.trim();
    const gstin = legalDraft.gstin.trim().toUpperCase();
    const cin = legalDraft.cin.trim().toUpperCase();
    if (!legalEntityName) {
      setFeedback({ kind: 'error', text: 'Legal business name is required.' });
      return;
    }
    if (gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(gstin)) {
      setFeedback({
        kind: 'error',
        text: 'Enter a valid 15-character GSTIN or leave it blank.',
      });
      return;
    }
    if (cin && !/^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(cin)) {
      setFeedback({
        kind: 'error',
        text: 'Enter a valid 21-character CIN or leave it blank.',
      });
      return;
    }
    if (!legalDraft.billingSameAsRegistered && !legalDraft.billingAddress.trim()) {
      setFeedback({
        kind: 'error',
        text: 'Enter a billing address or select same as registered.',
      });
      return;
    }
    submissionInProgress.current = true;
    setSubmitting(true);
    setFeedback(null);
    try {
      await tenantApi.updateProfile(tenantId, {
        name: profileTenant.name,
        legalEntityName,
        gstin,
        industry: profileTenant.industry ?? null,
        website: profileTenant.website ?? null,
        logoUrl: profileTenant.logoUrl ?? null,
        registeredAddress: profileTenant.registeredAddress ?? null,
        city: profileTenant.city ?? null,
        state: profileTenant.state ?? null,
        pinCode: profileTenant.pinCode ?? null,
        country: profileTenant.country ?? null,
        primaryContactName: profileTenant.primaryContactName ?? null,
        primaryContactEmail: profileTenant.primaryContactEmail ?? null,
        primaryContactPhone: profileTenant.primaryContactPhone ?? null,
        cin,
        registeredBusinessAddress: legalDraft.registeredBusinessAddress,
        billingAddress: legalDraft.billingSameAsRegistered ? null : legalDraft.billingAddress,
        billingSameAsRegistered: legalDraft.billingSameAsRegistered,
      });
      await reloadTenant();
      setEditingLegal(false);
      setFeedback({ kind: 'success', text: 'Legal and tax details saved.' });
    } catch (error) {
      setFeedback({ kind: 'error', text: errorText(error) });
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  }

  async function submitOffice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId || submissionInProgress.current) return;
    const isEditing = dialog === 'edit-office' && !!selectedOffice;
    const code = officeDraft.code.trim().toUpperCase();
    if (code.length < 2 || officeDraft.name.trim().length < 2 || officeDraft.addressText.trim().length < 5) {
      setFeedback({
        kind: 'error',
        text: 'Enter an office name, code and complete address.',
      });
      return;
    }
    const latitude = Number(officeDraft.latitude);
    const longitude = Number(officeDraft.longitude);
    if (
      profileOffices.some(
        (office) => office.code.toUpperCase() === code && (!isEditing || office.id !== selectedOffice.id),
      )
    ) {
      setFeedback({
        kind: 'error',
        text: 'An office with this code already exists in your organization.',
      });
      return;
    }
    if (
      !officeDraft.latitude.trim() ||
      !officeDraft.longitude.trim() ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setFeedback({
        kind: 'error',
        text: 'Enter valid latitude and longitude coordinates.',
      });
      return;
    }
    submissionInProgress.current = true;
    setSubmitting(true);
    setFeedback(null);
    const payload = {
      code,
      name: officeDraft.name.trim(),
      city: officeDraft.city.trim() || undefined,
      state: officeDraft.state.trim() || undefined,
      pinCode: officeDraft.pinCode.trim() || undefined,
      country: officeDraft.country.trim() || undefined,
      addressText: officeDraft.addressText.trim(),
      latitude,
      longitude,
      contactName: officeDraft.contactName.trim() || undefined,
      contactEmail: officeDraft.contactEmail.trim() || undefined,
      contactPhone: officeDraft.contactPhone.trim() || undefined,
      ...(isEditing ? { isActive: officeDraft.isActive } : {}),
    };
    try {
      if (isEditing) {
        await tenantApi.updateOffice(tenantId, selectedOffice.id, payload);
      } else {
        await tenantApi.createOffice(tenantId, payload);
      }
      await reloadTenant();
      setDialog(null);
      setSelectedOffice(null);
      setOfficeDraft(initialOfficeDraft);
      setFeedback({ kind: 'success', text: isEditing ? 'Office updated.' : 'Office added.' });
    } catch (error) {
      setFeedback({ kind: 'error', text: errorText(error) });
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  }

  async function submitDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId || submissionInProgress.current) return;
    const isEditing = dialog === 'edit-department' && !!selectedDepartment;
    const code = departmentDraft.code.trim().toUpperCase();
    if (
      profileDepartments.some(
        (department) =>
          department.code.toUpperCase() === code && (!isEditing || department.id !== selectedDepartment.id),
      )
    ) {
      setFeedback({
        kind: 'error',
        text: 'A department with this code already exists in your organization.',
      });
      return;
    }
    if (!/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(code)) {
      setFeedback({
        kind: 'error',
        text: 'Department code must be 1–32 characters using letters, numbers, underscores or hyphens.',
      });
      return;
    }
    if (departmentDraft.name.trim().length < 2) {
      setFeedback({
        kind: 'error',
        text: 'Department name must be at least 2 characters.',
      });
      return;
    }
    submissionInProgress.current = true;
    setSubmitting(true);
    setFeedback(null);
    const payload = {
      code,
      name: departmentDraft.name.trim(),
      departmentHead: departmentDraft.departmentHead.trim() || undefined,
      officeId: departmentDraft.officeId || undefined,
      description: departmentDraft.description.trim() || undefined,
      ...(isEditing ? { isActive: departmentDraft.isActive } : {}),
    };
    try {
      if (isEditing) {
        await tenantApi.updateDepartment(tenantId, selectedDepartment.id, payload);
      } else {
        await tenantApi.createDepartment(tenantId, payload);
      }
      setDepartmentDraft(initialDepartmentDraft);
      setSelectedDepartment(null);
      setDialog(null);
      setFeedback({ kind: 'success', text: isEditing ? 'Department updated.' : 'Department added.' });
      await loadSectionData();
    } catch (error) {
      setFeedback({ kind: 'error', text: errorText(error) });
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  }

  async function submitZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId || submissionInProgress.current) return;
    const isEditing = dialog === 'edit-zone' && !!selectedZone;
    const code = zoneDraft.code.trim().toUpperCase();
    if (!zoneDraft.officeId) {
      setFeedback({ kind: 'error', text: 'Select an office for this transport zone.' });
      return;
    }
    if (
      profileZones.some(
        (zone) => zone.code.toUpperCase() === code && (!isEditing || zone.id !== selectedZone.id),
      )
    ) {
      setFeedback({
        kind: 'error',
        text: 'A transport zone with this code already exists in your organization.',
      });
      return;
    }
    if (!/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(code)) {
      setFeedback({
        kind: 'error',
        text: 'Zone code must be 1–32 characters using letters, numbers, underscores or hyphens.',
      });
      return;
    }
    if (zoneDraft.name.trim().length < 2) {
      setFeedback({ kind: 'error', text: 'Zone name must be at least 2 characters.' });
      return;
    }
    if (!zoneDraft.serviceArea.trim()) {
      setFeedback({ kind: 'error', text: 'Service area is required.' });
      return;
    }
    const splitLocations = (raw: string) =>
      raw
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean);

    submissionInProgress.current = true;
    setSubmitting(true);
    setFeedback(null);
    const payload = {
      officeId: zoneDraft.officeId,
      code,
      name: zoneDraft.name.trim(),
      serviceArea: zoneDraft.serviceArea.trim(),
      description: zoneDraft.description.trim() || undefined,
      pickupLocations: splitLocations(zoneDraft.pickupLocationsText),
      dropLocations: splitLocations(zoneDraft.dropLocationsText),
      ...(isEditing ? { isActive: zoneDraft.isActive } : {}),
    };
    try {
      if (isEditing) {
        await tenantApi.updateTransportZone(tenantId, selectedZone.id, payload);
      } else {
        await tenantApi.createTransportZone(tenantId, payload);
      }
      setZoneDraft(initialZoneDraft);
      setSelectedZone(null);
      setDialog(null);
      setFeedback({ kind: 'success', text: isEditing ? 'Transport zone updated.' : 'Transport zone added.' });
      await loadSectionData();
    } catch (error) {
      setFeedback({ kind: 'error', text: errorText(error) });
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  }

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId || submissionInProgress.current) return;
    const fullName = userDraft.fullName.trim();
    const email = userDraft.email.trim();
    const phone = userDraft.phone.trim();
    if (fullName.length < 2) {
      setFeedback({
        kind: 'error',
        text: 'Full name must be at least 2 characters.',
      });
      return;
    }
    if (!email && !phone) {
      setFeedback({
        kind: 'error',
        text: 'Provide at least an email address or phone number.',
      });
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFeedback({
        kind: 'error',
        text: 'Enter a valid email address.',
      });
      return;
    }
    if (phone && phone.replace(/\D/g, '').length < 10) {
      setFeedback({
        kind: 'error',
        text: 'Phone number must contain at least 10 digits.',
      });
      return;
    }
    submissionInProgress.current = true;
    setSubmitting(true);
    setFeedback(null);
    try {
      await usersApi.invite(tenantId, {
        fullName,
        email: email || undefined,
        phone: phone || undefined,
        corporateRole: userDraft.corporateRole,
        officeIds: userDraft.officeIds,
      });
      setDialog(null);
      setUserDraft({
        fullName: '',
        email: '',
        phone: '',
        corporateRole: 'READ_ONLY',
        officeIds: [],
      });
      setFeedback({
        kind: 'success',
        text: 'Corporate user invited. They can sign in using the existing AdhocX identity flow.',
      });
      await loadSectionData();
    } catch (error) {
      setFeedback({ kind: 'error', text: errorText(error) });
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  }

  async function submitUserUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId || !selectedUser || selectedUser.id === user?.id || submissionInProgress.current) return;
    submissionInProgress.current = true;
    setSubmitting(true);
    setFeedback(null);
    try {
      await usersApi.update(tenantId, selectedUser.id, {
        corporateRole: userDraft.corporateRole,
        officeIds: userDraft.officeIds,
      });
      setDialog(null);
      setSelectedUser(null);
      setFeedback({ kind: 'success', text: 'User access updated.' });
      await loadSectionData();
    } catch (error) {
      setFeedback({ kind: 'error', text: errorText(error) });
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  }

  function toggleOffice(officeId: string) {
    setUserDraft((current) => ({
      ...current,
      officeIds: current.officeIds.includes(officeId)
        ? current.officeIds.filter((id) => id !== officeId)
        : [...current.officeIds, officeId],
    }));
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.titleBlock}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <span>Corporate workspace</span>
            <span aria-hidden="true">›</span>
            <span>Company profile</span>
          </nav>
          <h1 className={styles.pageTitle}>{profileTenant?.name ?? 'Company Profile'}</h1>
          <p className={styles.pageSubtitle}>
            {profileTenant
              ? `${profileTenant.primaryContactName || 'Company account'} · ${profileTenant.code}`
              : 'Manage your organization details, offices, departments, transport zones and user access.'}
          </p>
        </div>
      </header>

      {profileTenant && (
        <section className={styles.profileOverview} aria-label="Company profile overview">
          <div className={styles.summaryIdentity}>
            <div className={styles.organizationLogo}>
              {profileTenant.logoUrl ? (
                <img src={profileTenant.logoUrl} alt={`${profileTenant.name} logo`} />
              ) : (
                <Building2 size={28} />
              )}
            </div>
            <div className={styles.organizationIdentity}>
              <div className={styles.summaryNameRow}>
                <h2>{profileTenant.name}</h2>
                <StatusBadge status={profileTenant.status} size="sm" />
              </div>
              <p>
                {valueOrDash(profileTenant.industry)} ·{' '}
                {profileTenant.city || profileTenant.state || 'Location not set'}
              </p>
            </div>
          </div>
          <div className={styles.summaryStats}>
            <div className={styles.summaryStat}>
              <strong>{profileOffices.length}</strong>
              <span>Offices</span>
            </div>
            <div className={styles.summaryStat}>
              <strong>{profileTenant._count?.employees ?? '—'}</strong>
              <span>Employees</span>
            </div>
            <div className={styles.summaryStat}>
              <strong>{profileCompletion}%</strong>
              <span>Profile complete</span>
            </div>
          </div>
        </section>
      )}

      <main className={styles.profileLayout}>
        <nav className={styles.sectionNav} aria-label="Company profile sections">
          {SECTIONS.map((section) => {
            const active = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => showSection(section.id)}
                aria-pressed={active}
                className={`${styles.navButton}${active ? ` ${styles.navButtonActive}` : ''}`}
              >
                <span className={styles.navIcon}>{section.icon}</span>
                <span>{section.label}</span>
              </button>
            );
          })}
        </nav>
        <div className={styles.sectionContent}>
          {tenantError ? (
            <Notice error>
              Organization information could not be loaded. {errorText(tenantError)}{' '}
              <button type="button" onClick={() => void reloadTenant()} className={styles.textAction}>
                Try again
              </button>
            </Notice>
          ) : !profileTenant ? (
            <Card>
              <EmptyState>
                {status === 'loading' || tenantId
                  ? 'Loading organization profile…'
                  : 'Company profile is unavailable for this account.'}
              </EmptyState>
            </Card>
          ) : (
            <>
              <div className={styles.currentSection}>
                <span>{SECTIONS.find((section) => section.id === activeSection)?.icon}</span>
                {SECTIONS.find((section) => section.id === activeSection)?.label}
              </div>
              {feedback && (
                <div role={feedback.kind === 'error' ? 'alert' : 'status'}>
                  <Notice error={feedback.kind === 'error'}>{feedback.text}</Notice>
                </div>
              )}

              {activeSection === 'organization' && (
                <Card>
                  <SectionHeading
                    title="Organization details"
                    description="Company identity, registered office, and primary contact."
                  />
                  {editingOrganization ? (
                    <form onSubmit={submitOrganization} className={styles.profileForm}>
                      <div className={styles.logoEditor}>
                        <div className={styles.logoPreview}>
                          {organizationDraft.logoUrl ? (
                            <img src={organizationDraft.logoUrl} alt="Company logo preview" />
                          ) : (
                            <Building2 size={26} />
                          )}
                        </div>
                        <div className={styles.logoFields}>
                          <Field
                            label="Company logo URL"
                            type="url"
                            value={organizationDraft.logoUrl}
                            placeholder="https://example.com/logo.png"
                            onChange={(logoUrl) =>
                              setOrganizationDraft((draft) => ({
                                ...draft,
                                logoUrl,
                              }))
                            }
                          />
                          <p className={styles.fieldHelp}>Use a publicly accessible image URL.</p>
                        </div>
                      </div>
                      <div className={styles.formGrid}>
                        <Field
                          label="Organization name"
                          required
                          value={organizationDraft.name}
                          onChange={(name) =>
                            setOrganizationDraft((draft) => ({
                              ...draft,
                              name,
                            }))
                          }
                        />
                        <Field
                          label="Industry"
                          value={organizationDraft.industry}
                          onChange={(industry) =>
                            setOrganizationDraft((draft) => ({
                              ...draft,
                              industry,
                            }))
                          }
                        />
                        <Field
                          label="Company website"
                          type="url"
                          value={organizationDraft.website}
                          placeholder="https://example.com"
                          onChange={(website) =>
                            setOrganizationDraft((draft) => ({
                              ...draft,
                              website,
                            }))
                          }
                        />
                        <Field
                          label="City"
                          value={organizationDraft.city}
                          onChange={(city) =>
                            setOrganizationDraft((draft) => ({
                              ...draft,
                              city,
                            }))
                          }
                        />
                        <Field
                          label="State"
                          value={organizationDraft.state}
                          onChange={(state) =>
                            setOrganizationDraft((draft) => ({
                              ...draft,
                              state,
                            }))
                          }
                        />
                        <Field
                          label="PIN code"
                          value={organizationDraft.pinCode}
                          onChange={(pinCode) =>
                            setOrganizationDraft((draft) => ({
                              ...draft,
                              pinCode,
                            }))
                          }
                        />
                        <Field
                          label="Country"
                          value={organizationDraft.country}
                          onChange={(country) =>
                            setOrganizationDraft((draft) => ({
                              ...draft,
                              country,
                            }))
                          }
                        />
                        <Field
                          label="Primary contact name"
                          value={organizationDraft.primaryContactName}
                          onChange={(primaryContactName) =>
                            setOrganizationDraft((draft) => ({
                              ...draft,
                              primaryContactName,
                            }))
                          }
                        />
                        <Field
                          label="Primary contact email"
                          type="email"
                          value={organizationDraft.primaryContactEmail}
                          onChange={(primaryContactEmail) =>
                            setOrganizationDraft((draft) => ({
                              ...draft,
                              primaryContactEmail,
                            }))
                          }
                        />
                        <Field
                          label="Primary contact phone"
                          type="tel"
                          value={organizationDraft.primaryContactPhone}
                          onChange={(primaryContactPhone) =>
                            setOrganizationDraft((draft) => ({
                              ...draft,
                              primaryContactPhone,
                            }))
                          }
                        />
                      </div>
                      <TextArea
                        label="Registered address"
                        value={organizationDraft.registeredAddress}
                        onChange={(registeredAddress) =>
                          setOrganizationDraft((draft) => ({
                            ...draft,
                            registeredAddress,
                          }))
                        }
                      />
                      <div className={styles.formActions}>
                        <ActionButton secondary onClick={() => setEditingOrganization(false)} disabled={submitting}>
                          Cancel
                        </ActionButton>
                        <ActionButton type="submit" disabled={submitting}>
                          {submitting ? 'Saving…' : 'Save changes'}
                        </ActionButton>
                      </div>
                    </form>
                  ) : (
                    <div className={`${styles.detailsGrid} ${styles.organizationDetails}`}>
                      <Detail label="Company code" value={profileTenant.code} />
                      <Detail label="Industry" value={profileTenant.industry} />
                      <Detail label="Website" value={profileTenant.website} />
                      <Detail label="Primary contact" value={profileTenant.primaryContactName} />
                      <Detail label="Contact email" value={profileTenant.primaryContactEmail} />
                      <Detail label="Contact phone" value={profileTenant.primaryContactPhone} />
                      <Detail
                        label="Registered address"
                        value={[
                          profileTenant.registeredAddress,
                          profileTenant.city,
                          profileTenant.state,
                          profileTenant.pinCode,
                          profileTenant.country,
                        ]
                          .filter((part) => part?.trim())
                          .join(', ')}
                      />
                    </div>
                  )}
                </Card>
              )}

              {activeSection === 'legal' && (
                <Card>
                  <SectionHeading
                    title="Legal & tax details"
                    description="Legal entity, registration and billing information."
                  />
                  {editingLegal ? (
                    <form onSubmit={submitLegal} className={styles.profileForm}>
                      <div className={styles.formGrid}>
                        <Field
                          label="Legal business name"
                          required
                          value={legalDraft.legalEntityName}
                          onChange={(legalEntityName) =>
                            setLegalDraft((draft) => ({
                              ...draft,
                              legalEntityName,
                            }))
                          }
                        />
                        <Field
                          label="GSTIN"
                          value={legalDraft.gstin}
                          placeholder="15-character GSTIN"
                          onChange={(gstin) => setLegalDraft((draft) => ({ ...draft, gstin }))}
                        />
                        <Field
                          label="CIN / Company registration number"
                          value={legalDraft.cin}
                          placeholder="21-character CIN (if applicable)"
                          onChange={(cin) => setLegalDraft((draft) => ({ ...draft, cin }))}
                        />
                      </div>
                      <TextArea
                        label="Registered business address"
                        value={legalDraft.registeredBusinessAddress}
                        onChange={(registeredBusinessAddress) =>
                          setLegalDraft((draft) => ({
                            ...draft,
                            registeredBusinessAddress,
                          }))
                        }
                      />
                      <label className={styles.checkboxField}>
                        <input
                          type="checkbox"
                          checked={legalDraft.billingSameAsRegistered}
                          onChange={(event) =>
                            setLegalDraft((draft) => ({
                              ...draft,
                              billingSameAsRegistered: event.target.checked,
                            }))
                          }
                        />
                        Billing address same as registered
                      </label>
                      {!legalDraft.billingSameAsRegistered && (
                        <TextArea
                          label="Billing address"
                          value={legalDraft.billingAddress}
                          required
                          onChange={(billingAddress) =>
                            setLegalDraft((draft) => ({
                              ...draft,
                              billingAddress,
                            }))
                          }
                        />
                      )}
                      <p className={styles.fieldHelp}>
                        GSTIN and CIN are optional and should be provided only when applicable to your legal structure.
                      </p>
                      <div className={styles.formActions}>
                        <ActionButton secondary onClick={() => setEditingLegal(false)} disabled={submitting}>
                          Cancel
                        </ActionButton>
                        <ActionButton type="submit" disabled={submitting}>
                          {submitting ? 'Saving…' : 'Save changes'}
                        </ActionButton>
                      </div>
                    </form>
                  ) : (
                    <div className={styles.detailsGrid}>
                      <Detail label="Legal business name" value={profileTenant.legalEntityName} />
                      <Detail
                        label="GSTIN"
                        value={valueOrDash(profileTenant.gstin)}
                      />
                      <Detail
                        label="CIN / Registration number"
                        value={valueOrDash(profileTenant.cin)}
                      />
                      <Detail
                        label="Registered business address"
                        value={valueOrDash(profileTenant.registeredBusinessAddress)}
                      />
                      <Detail
                        label="Billing address"
                        value={
                          (profileTenant.billingSameAsRegistered ?? true)
                            ? 'Same as registered address'
                            : profileTenant.billingAddress
                        }
                      />
                    </div>
                  )}
                </Card>
              )}

              {activeSection === 'offices' && (
                <Card>
                  <SectionHeading
                    title="Offices & sites"
                    description={`Office locations and contact details for ${profileTenant.name}.`}
                  />
                  <SearchBox
                    value={search}
                    onChange={setSearch}
                    placeholder="Search offices by name, code or address"
                  />
                  {!profileOffices.length ? (
                    <EmptyState>No offices are configured for this organization.</EmptyState>
                  ) : visibleOffices.length ? (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Office name</Th>
                          <Th>Office code</Th>
                          <Th>City</Th>
                          <Th>Address</Th>
                          <Th>Employees</Th>
                          <Th>Status</Th>
                          <Th>Details</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleOffices.map((office) => (
                          <tr key={office.id}>
                            <Td strong>{office.name}</Td>
                            <Td>
                              <code>{office.code}</code>
                            </Td>
                            <Td>{office.city || '—'}</Td>
                            <Td>{office.addressText || office.address || '—'}</Td>
                            <Td>{office._count?.employees ?? office.employeeCount ?? '—'}</Td>
                            <Td>
                              {office.isActive === undefined ? (
                                '—'
                              ) : (
                                <StatusBadge status={office.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
                              )}
                            </Td>
                            <Td>
                              <TextAction onClick={() => setSelectedOffice(office)}>View</TextAction>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <EmptyState>No offices match “{search}”.</EmptyState>
                  )}
                </Card>
              )}

              {activeSection === 'departments' && (
                <Card>
                  <SectionHeading
                    title="Departments"
                    description={`Departments and office assignments for ${profileTenant.name}.`}
                  />
                  <SearchBox value={search} onChange={setSearch} placeholder="Search departments by name, code, head or office" />
                  {sectionLoading ? (
                    <EmptyState>Loading departments…</EmptyState>
                  ) : loadError && activeSection === 'departments' ? (
                    <div style={{ padding: 20 }}>
                      <Notice error>{loadError}</Notice>
                    </div>
                  ) : !profileDepartments.length ? (
                    <EmptyState>No departments are configured for this organization.</EmptyState>
                  ) : visibleDepartments.length ? (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Department name</Th>
                          <Th>Department code</Th>
                          <Th>Head</Th>
                          <Th>Office</Th>
                          <Th>Employees</Th>
                          <Th>Status</Th>
                          <Th>Details</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleDepartments.map((department) => (
                          <tr key={department.id}>
                            <Td strong>{department.name}</Td>
                            <Td>
                              <code>{department.code}</code>
                            </Td>
                            <Td>{department.departmentHead || '—'}</Td>
                            <Td>{department.office?.name || 'All offices'}</Td>
                            <Td>{department._count?.employees ?? '—'}</Td>
                            <Td>
                              <StatusBadge status={department.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
                            </Td>
                            <Td>
                              <TextAction onClick={() => setSelectedDepartment(department)}>View</TextAction>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <EmptyState>No departments match “{search}”.</EmptyState>
                  )}
                </Card>
              )}

              {activeSection === 'zones' && (
                <Card>
                  <SectionHeading
                    title="Transport zones"
                    description={`Service areas, pickup corridors, and office assignments for ${profileTenant.name}.`}
                  />
                  {!canReadZones ? (
                    <EmptyState>Your role does not have permission to view transport zones.</EmptyState>
                  ) : (
                    <>
                      <SearchBox
                        value={search}
                        onChange={setSearch}
                        placeholder="Search transport zones by name, code, office or service area"
                      />
                      {sectionLoading ? (
                        <EmptyState>Loading transport zones…</EmptyState>
                      ) : loadError && activeSection === 'zones' ? (
                        <div style={{ padding: 20 }}>
                          <Notice error>{loadError}</Notice>
                        </div>
                      ) : !profileZones.length ? (
                        <EmptyState>No transport zones are configured for this organization yet.</EmptyState>
                      ) : visibleZones.length ? (
                        <Table>
                          <thead>
                            <tr>
                              <Th>Zone name</Th>
                              <Th>Zone code</Th>
                              <Th>Office</Th>
                              <Th>Service area</Th>
                              <Th>Pickup / Drop points</Th>
                              <Th>Status</Th>
                              <Th>Details</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleZones.map((zone) => (
                              <tr key={zone.id}>
                                <Td strong>{zone.name}</Td>
                                <Td>
                                  <code>{zone.code}</code>
                                </Td>
                                <Td>{zone.office?.name ?? '—'}</Td>
                                <Td>{zone.serviceArea}</Td>
                                <Td>
                                  {(zone.pickupLocations?.length ?? 0)} pickup · {(zone.dropLocations?.length ?? 0)} drop
                                </Td>
                                <Td>
                                  <StatusBadge status={zone.isActive ? 'ACTIVE' : 'INACTIVE'} size="sm" />
                                </Td>
                                <Td>
                                  <TextAction
                                    onClick={() => {
                                      setSelectedZone(zone);
                                      setDialog('view-zone');
                                    }}
                                  >
                                    View
                                  </TextAction>
                                </Td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      ) : (
                        <EmptyState>No transport zones match “{search}”.</EmptyState>
                      )}
                    </>
                  )}
                </Card>
              )}

              {activeSection === 'users' && (
                <Card>
                  <SectionHeading
                    title="Users & roles"
                    description="Corporate portal accounts, assigned roles and office access."
                  />
                  {!canReadUsers ? (
                    <EmptyState>
                      {officeScope
                        ? 'Corporate user listings are unavailable to office-scoped accounts because the current API does not filter users by office.'
                        : 'Your role does not have permission to view corporate users.'}
                    </EmptyState>
                  ) : (
                    <>
                      <SearchBox
                        value={search}
                        onChange={setSearch}
                        placeholder="Search users by name, email or role"
                      />
                      {sectionLoading ? (
                        <EmptyState>Loading users…</EmptyState>
                      ) : loadError && activeSection === 'users' ? (
                        <div style={{ padding: 20 }}>
                          <Notice error>{loadError}</Notice>
                        </div>
                      ) : !profileUsers.length ? (
                        <EmptyState>No corporate portal users are available.</EmptyState>
                      ) : visibleUsers.length ? (
                        <Table>
                          <thead>
                            <tr>
                              <Th>User</Th>
                              <Th>Phone</Th>
                              <Th>Role</Th>
                              <Th>Assigned offices</Th>
                              <Th>Permissions</Th>
                              <Th>Account status</Th>
                              <Th>Details</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleUsers.map((corporateUser) => (
                              <tr key={corporateUser.id}>
                                <Td strong>
                                  {corporateUser.fullName || 'Name not provided'}
                                  <div className={styles.tableSecondary}>
                                    {corporateUser.email || 'Email not provided'}
                                  </div>
                                </Td>
                                <Td>{corporateUser.phone || '—'}</Td>
                                <Td>{corporateRoleLabel(corporateUser.corporateRole)}</Td>
                                <Td>{formatOfficeScope(corporateUser.corporateOfficeIds, profileOffices)}</Td>
                                <Td>
                                  {userPermissionLabels(corporateUser).length ? (
                                    <div className={styles.permissionList}>
                                      {userPermissionLabels(corporateUser).map((permission) => (
                                        <span key={permission} className={styles.permissionChip}>
                                          {permission}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    '—'
                                  )}
                                </Td>
                                <Td>
                                  <StatusBadge status={corporateUser.status} size="sm" />
                                </Td>
                                <Td>
                                  <TextAction
                                    onClick={() => {
                                      setSelectedUser(corporateUser);
                                      setDialog('view-user');
                                    }}
                                  >
                                    View
                                  </TextAction>
                                </Td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      ) : (
                        <EmptyState>No users match “{search}”.</EmptyState>
                      )}
                      <div className={styles.cardFooter}>
                        <Notice>
                          User invitations and role/office-scope updates use the existing identity service APIs.
                          Deactivation is not supported by the current API.
                        </Notice>
                      </div>
                    </>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </main>

      <ProfileDrawer
        isOpen={dialog === 'office' || dialog === 'edit-office'}
        onClose={closeDialog}
        title={dialog === 'edit-office' ? 'Edit office' : 'Add office'}
        subtitle="Office code must be unique within your organization."
      >
        <form onSubmit={submitOffice} className={styles.form}>
          <div className={styles.formGrid}>
            <Field
              label="Office name"
              value={officeDraft.name}
              required
              onChange={(name) => setOfficeDraft((draft) => ({ ...draft, name }))}
            />
            <Field
              label="Office code"
              value={officeDraft.code}
              required
              onChange={(code) => setOfficeDraft((draft) => ({ ...draft, code }))}
            />
          </div>
          <Field
            label="Office address"
            value={officeDraft.addressText}
            required
            onChange={(addressText) => setOfficeDraft((draft) => ({ ...draft, addressText }))}
          />
          <div className={styles.formGrid}>
            <Field
              label="City"
              value={officeDraft.city}
              onChange={(city) => setOfficeDraft((draft) => ({ ...draft, city }))}
            />
            <Field
              label="State"
              value={officeDraft.state}
              onChange={(state) => setOfficeDraft((draft) => ({ ...draft, state }))}
            />
            <Field
              label="PIN code"
              value={officeDraft.pinCode}
              onChange={(pinCode) => setOfficeDraft((draft) => ({ ...draft, pinCode }))}
            />
            <Field
              label="Country"
              value={officeDraft.country}
              onChange={(country) => setOfficeDraft((draft) => ({ ...draft, country }))}
            />
          </div>
          <div className={styles.formGrid}>
            <Field
              label="Latitude"
              type="number"
              min="-90"
              max="90"
              step="any"
              value={officeDraft.latitude}
              required
              onChange={(latitude) => setOfficeDraft((draft) => ({ ...draft, latitude }))}
            />
            <Field
              label="Longitude"
              type="number"
              min="-180"
              max="180"
              step="any"
              value={officeDraft.longitude}
              required
              onChange={(longitude) => setOfficeDraft((draft) => ({ ...draft, longitude }))}
            />
          </div>
          <div className={styles.formGrid}>
            <Field
              label="Site contact name"
              value={officeDraft.contactName}
              onChange={(contactName) => setOfficeDraft((draft) => ({ ...draft, contactName }))}
            />
            <Field
              label="Site contact email"
              type="email"
              value={officeDraft.contactEmail}
              onChange={(contactEmail) => setOfficeDraft((draft) => ({ ...draft, contactEmail }))}
            />
            <Field
              label="Site contact phone"
              type="tel"
              value={officeDraft.contactPhone}
              onChange={(contactPhone) => setOfficeDraft((draft) => ({ ...draft, contactPhone }))}
            />
          </div>
          {dialog === 'edit-office' && (
            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={officeDraft.isActive}
                onChange={(event) =>
                  setOfficeDraft((draft) => ({ ...draft, isActive: event.target.checked }))
                }
              />
              Office is active
            </label>
          )}
          {feedback?.kind === 'error' && <Notice error>{feedback.text}</Notice>}
          <div className={styles.formActions}>
            <ActionButton secondary onClick={closeDialog} disabled={submitting}>
              Cancel
            </ActionButton>
            <ActionButton type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : dialog === 'edit-office' ? 'Save changes' : 'Save office'}
            </ActionButton>
          </div>
        </form>
      </ProfileDrawer>

      <ProfileDrawer
        isOpen={dialog === 'department' || dialog === 'edit-department'}
        onClose={closeDialog}
        title={dialog === 'edit-department' ? 'Edit department' : 'Add department'}
        subtitle="Department code must be unique within your organization."
      >
        <form onSubmit={submitDepartment} className={styles.form}>
          <div className={styles.formGrid}>
            <Field
              label="Department name"
              value={departmentDraft.name}
              required
              onChange={(name) => setDepartmentDraft((draft) => ({ ...draft, name }))}
            />
            <Field
              label="Department code"
              value={departmentDraft.code}
              required
              onChange={(code) => setDepartmentDraft((draft) => ({ ...draft, code }))}
            />
          </div>
          <div className={styles.formGrid}>
            <Field
              label="Department head"
              value={departmentDraft.departmentHead}
              onChange={(departmentHead) => setDepartmentDraft((draft) => ({ ...draft, departmentHead }))}
            />
            <label className={styles.field}>
              Assigned office
              <select
                value={departmentDraft.officeId}
                onChange={(event) =>
                  setDepartmentDraft((draft) => ({ ...draft, officeId: event.target.value }))
                }
                className={styles.fieldSelect}
              >
                <option value="">All offices</option>
                {profileOffices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.name} ({office.code})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <TextArea
            label="Description"
            value={departmentDraft.description}
            onChange={(description) => setDepartmentDraft((draft) => ({ ...draft, description }))}
          />
          {dialog === 'edit-department' && (
            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={departmentDraft.isActive}
                onChange={(event) =>
                  setDepartmentDraft((draft) => ({ ...draft, isActive: event.target.checked }))
                }
              />
              Department is active
            </label>
          )}
          {feedback?.kind === 'error' && <Notice error>{feedback.text}</Notice>}
          <div className={styles.formActions}>
            <ActionButton secondary onClick={closeDialog} disabled={submitting}>
              Cancel
            </ActionButton>
            <ActionButton type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : dialog === 'edit-department' ? 'Save changes' : 'Save department'}
            </ActionButton>
          </div>
        </form>
      </ProfileDrawer>

      <ProfileDrawer
        isOpen={dialog === 'zone' || dialog === 'edit-zone'}
        onClose={closeDialog}
        title={dialog === 'edit-zone' ? 'Edit transport zone' : 'Add transport zone'}
        subtitle="Define service area corridors and pickup/drop clusters for an office."
      >
        <form onSubmit={submitZone} className={styles.form}>
          <label className={styles.field}>
            Office *
            <select
              required
              value={zoneDraft.officeId}
              onChange={(event) =>
                setZoneDraft((draft) => ({ ...draft, officeId: event.target.value }))
              }
              className={styles.fieldSelect}
            >
              <option value="">Select an office</option>
              {profileOffices.map((office) => (
                <option key={office.id} value={office.id}>
                  {office.name} ({office.code})
                </option>
              ))}
            </select>
          </label>
          <div className={styles.formGrid}>
            <Field
              label="Zone name"
              value={zoneDraft.name}
              required
              onChange={(name) => setZoneDraft((draft) => ({ ...draft, name }))}
            />
            <Field
              label="Zone code"
              value={zoneDraft.code}
              required
              onChange={(code) => setZoneDraft((draft) => ({ ...draft, code }))}
            />
          </div>
          <Field
            label="Service area"
            value={zoneDraft.serviceArea}
            required
            placeholder="e.g. Gachibowli - Kondapur - HITEC City"
            onChange={(serviceArea) => setZoneDraft((draft) => ({ ...draft, serviceArea }))}
          />
          <TextArea
            label="Description"
            value={zoneDraft.description}
            onChange={(description) => setZoneDraft((draft) => ({ ...draft, description }))}
          />
          <TextArea
            label="Pickup locations (one per line or comma-separated)"
            value={zoneDraft.pickupLocationsText}
            onChange={(pickupLocationsText) =>
              setZoneDraft((draft) => ({ ...draft, pickupLocationsText }))
            }
          />
          <TextArea
            label="Drop locations (one per line or comma-separated)"
            value={zoneDraft.dropLocationsText}
            onChange={(dropLocationsText) =>
              setZoneDraft((draft) => ({ ...draft, dropLocationsText }))
            }
          />
          {dialog === 'edit-zone' && (
            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={zoneDraft.isActive}
                onChange={(event) =>
                  setZoneDraft((draft) => ({ ...draft, isActive: event.target.checked }))
                }
              />
              Transport zone is active
            </label>
          )}
          {feedback?.kind === 'error' && <Notice error>{feedback.text}</Notice>}
          <div className={styles.formActions}>
            <ActionButton secondary onClick={closeDialog} disabled={submitting}>
              Cancel
            </ActionButton>
            <ActionButton type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : dialog === 'edit-zone' ? 'Save changes' : 'Save transport zone'}
            </ActionButton>
          </div>
        </form>
      </ProfileDrawer>

      <ProfileDrawer
        isOpen={dialog === 'invite' || dialog === 'edit-user'}
        onClose={closeDialog}
        title={dialog === 'invite' ? 'Invite corporate user' : 'Edit user access'}
        subtitle="Role and office access are enforced by the AdhocX API."
      >
        <form onSubmit={dialog === 'invite' ? submitUser : submitUserUpdate} className={styles.form}>
          {dialog === 'invite' && (
            <>
              <Field
                label="Full name"
                value={userDraft.fullName}
                required
                onChange={(fullName) => setUserDraft((draft) => ({ ...draft, fullName }))}
              />
              <div className={styles.formGrid}>
                <Field
                  label="Email address"
                  type="email"
                  value={userDraft.email}
                  onChange={(email) => setUserDraft((draft) => ({ ...draft, email }))}
                />
                <Field
                  label="Phone number"
                  type="tel"
                  value={userDraft.phone}
                  onChange={(phone) => setUserDraft((draft) => ({ ...draft, phone }))}
                />
              </div>
              <p className={styles.fieldHelp}>Provide at least an email address or phone number.</p>
            </>
          )}
          {dialog === 'edit-user' && (
            <div className={styles.detailValue}>{selectedUser?.fullName || selectedUser?.email}</div>
          )}
          <label className={styles.field}>
            Corporate role
            <select
              value={userDraft.corporateRole}
              onChange={(event) =>
                setUserDraft((draft) => ({
                  ...draft,
                  corporateRole: event.target.value as CorporateRole,
                }))
              }
              className={styles.fieldSelect}
            >
              {CORPORATE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {corporateRoleLabel(role)}
                </option>
              ))}
            </select>
          </label>
          <fieldset className={styles.officeAccess}>
            <legend className={styles.officeAccessLegend}>Office access</legend>
            <p className={styles.officeAccessHelp}>
              Select one or more offices. No selection grants access to all offices, subject to API authorization.
            </p>
            {profileOffices.length ? (
              profileOffices.map((office) => (
                <label key={office.id} className={styles.officeOption}>
                  <input
                    type="checkbox"
                    checked={userDraft.officeIds.includes(office.id)}
                    onChange={() => toggleOffice(office.id)}
                  />
                  {office.name} <span style={{ color: 'var(--text-muted)' }}>({office.code})</span>
                </label>
              ))
            ) : (
              <p className={styles.fieldHelp}>No offices are available.</p>
            )}
          </fieldset>
          {feedback?.kind === 'error' && <Notice error>{feedback.text}</Notice>}
          <div className={styles.formActions}>
            <ActionButton secondary onClick={closeDialog} disabled={submitting}>
              Cancel
            </ActionButton>
            <ActionButton type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : dialog === 'invite' ? 'Send invitation' : 'Save access'}
            </ActionButton>
          </div>
        </form>
      </ProfileDrawer>

      <ProfileDrawer
        isOpen={!!selectedOffice && dialog !== 'edit-office'}
        onClose={() => setSelectedOffice(null)}
        title="Office details"
      >
        {selectedOffice && (
          <DetailsList
            entries={[
              ['Office name', selectedOffice.name],
              ['Office code', selectedOffice.code],
              ['Address', selectedOffice.addressText || selectedOffice.address],
              ['City', selectedOffice.city],
              ['State', selectedOffice.state],
              ['PIN code', selectedOffice.pinCode ?? selectedOffice.pincode ?? undefined],
              ['Country', selectedOffice.country ?? undefined],
              ['Site contact', selectedOffice.contactName ?? undefined],
              ['Contact email', selectedOffice.contactEmail ?? undefined],
              ['Contact phone', selectedOffice.contactPhone ?? undefined],
              [
                'Status',
                selectedOffice.isActive === undefined ? undefined : selectedOffice.isActive ? 'Active' : 'Inactive',
              ],
              ['Employees', String(selectedOffice._count?.employees ?? selectedOffice.employeeCount ?? '—')],
              ['Coordinates', `${selectedOffice.latitude}, ${selectedOffice.longitude}`],
            ]}
          />
        )}
      </ProfileDrawer>
      <ProfileDrawer
        isOpen={!!selectedDepartment && dialog !== 'edit-department'}
        onClose={() => setSelectedDepartment(null)}
        title="Department details"
      >
        {selectedDepartment && (
          <DetailsList
            entries={[
              ['Department name', selectedDepartment.name],
              ['Department code', selectedDepartment.code],
              ['Department head', selectedDepartment.departmentHead ?? undefined],
              ['Assigned office', selectedDepartment.office?.name ?? 'All offices'],
              ['Description', selectedDepartment.description ?? undefined],
              ['Status', selectedDepartment.isActive ? 'Active' : 'Inactive'],
              ['Employees', String(selectedDepartment._count?.employees ?? '—')],
            ]}
          />
        )}
      </ProfileDrawer>
      <ProfileDrawer
        isOpen={dialog === 'view-zone' && !!selectedZone}
        onClose={closeDialog}
        title="Transport zone details"
        subtitle="Service corridor and pickup/drop clusters."
      >
        {selectedZone && (
          <DetailsList
            entries={[
              ['Zone name', selectedZone.name],
              ['Zone code', selectedZone.code],
              ['Office', selectedZone.office?.name ?? undefined],
              ['Service area', selectedZone.serviceArea],
              ['Description', selectedZone.description ?? undefined],
              [
                'Pickup locations',
                selectedZone.pickupLocations?.length ? selectedZone.pickupLocations.join(', ') : undefined,
              ],
              [
                'Drop locations',
                selectedZone.dropLocations?.length ? selectedZone.dropLocations.join(', ') : undefined,
              ],
              ['Status', selectedZone.isActive ? 'Active' : 'Inactive'],
            ]}
          />
        )}
      </ProfileDrawer>
      <ProfileDrawer
        isOpen={dialog === 'view-user' && !!selectedUser}
        onClose={closeDialog}
        title="Corporate user details"
        subtitle="Account, assigned access and permissions."
      >
        {selectedUser && (
          <DetailsList
            entries={[
              ['Full name', selectedUser.fullName ?? undefined],
              ['Email address', selectedUser.email ?? undefined],
              ['Phone number', selectedUser.phone ?? undefined],
              ['Corporate role', corporateRoleLabel(selectedUser.corporateRole)],
              ['Assigned offices', formatOfficeScope(selectedUser.corporateOfficeIds, profileOffices)],
              [
                'Permissions',
                userPermissionLabels(selectedUser).length
                  ? userPermissionLabels(selectedUser).join(', ')
                  : 'Not available for this account role',
              ],
              ['Account status', selectedUser.status],
              ['Created', selectedUser.createdAt],
            ]}
          />
        )}
      </ProfileDrawer>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className={styles.detail}>
      <div className={styles.detailLabel}>{label}</div>
      <div className={styles.detailValue}>{valueOrDash(value)}</div>
    </div>
  );
}

function DetailsList({ entries }: { entries: Array<[string, string | undefined]> }) {
  return (
    <div className={styles.detailsGrid}>
      {entries.map(([label, value]) => (
        <Detail key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th>{children}</th>;
}

function Td({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return <td className={strong ? styles.tableStrong : undefined}>{children}</td>;
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className={styles.searchRow}>
      <Search size={16} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={styles.searchInput}
      />
    </label>
  );
}

function TextAction({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={styles.textAction}>
      {children}
    </button>
  );
}

function formatOfficeScope(officeIds: string[], offices: Office[]) {
  if (!officeIds?.length) return 'All offices';
  return officeIds.map((id) => offices.find((office) => office.id === id)?.name ?? 'Unknown office').join(', ');
}

'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ContentLoadingSkeleton } from '@adhocx/ui/page-loading';
import { Building2, CircleAlert, Eye, EyeOff, FileText, KeyRound, Plus, Search, Shield, Users, X } from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ApiError } from '../../lib/api/client';
import { authApi, tenantApi, usersApi } from '../../lib/api/corporate';
import { setSession } from '../../lib/auth/session';
import { useSession } from '../../lib/auth/SessionContext';
import type { CorporateUser } from '../../lib/api/types';
import styles from './CompanyProfile.module.css';

type SectionId = 'organization' | 'legal' | 'managers';
type Feedback = { kind: 'success' | 'error'; text: string } | null;
type ManagerDraft = {
  fullName: string;
  phone: string;
  password: string;
};
type PasswordDraft = {
  password: string;
  confirmPassword: string;
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
type ProfileDialog = 'manager' | 'change-password' | null;

const SECTIONS: Array<{ id: SectionId; label: string; icon: React.ReactNode }> = [
  {
    id: 'organization',
    label: 'Organization',
    icon: <Building2 size={16} />,
  },
  { id: 'legal', label: 'Legal & tax', icon: <FileText size={16} /> },
  { id: 'managers', label: 'Managers', icon: <Users size={16} /> },
];

const initialManagerDraft: ManagerDraft = {
  fullName: '',
  phone: '',
  password: '',
};
const initialPasswordDraft: PasswordDraft = {
  password: '',
  confirmPassword: '',
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

function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'The request could not be completed. Please try again.';
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className={styles.card}>{children}</section>;
}

function SectionHeading({
  title,
  description,
  action,
  borderless = false,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  borderless?: boolean;
}) {
  return (
    <div className={`${styles.sectionHeading}${borderless ? ` ${styles.sectionHeadingBorderless}` : ''}`}>
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

function normalizeMobileNumber(raw: string): string | null {
  const trimmed = raw.trim().replace(/[\s-]/g, '');
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  if (trimmed.startsWith('+') && digits.length >= 10) return `+${digits}`;
  return null;
}

function isPhoneLike(value?: string | null): boolean {
  const trimmed = (value || '').trim();
  return Boolean(trimmed) && /^[+\d\s().-]{6,}$/.test(trimmed);
}

function managerDisplayName(manager: CorporateUser, fallbackAdminName?: string | null): string {
  const name = manager.fullName?.trim();
  if (name && !isPhoneLike(name)) return name;
  if (manager.corporateRole === 'CORP_SUPER_ADMIN' || manager.role === 'CORPORATE_ADMIN') {
    const fallback = fallbackAdminName?.trim();
    if (fallback && !isPhoneLike(fallback)) return fallback;
  }
  return 'Not provided';
}

export default function CompanyProfilePage() {
  const { status, user, tenant, tenantId, tenantError, offices, officeScope, can, acceptSession, reloadTenant } =
    useSession();
  const [activeSection, setActiveSection] = useState<SectionId>('organization');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [dialog, setDialog] = useState<ProfileDialog>(null);
  const [managers, setManagers] = useState<CorporateUser[]>([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [managersError, setManagersError] = useState<string | null>(null);
  const [managerDraft, setManagerDraft] = useState<ManagerDraft>(initialManagerDraft);
  const [showManagerPassword, setShowManagerPassword] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<CorporateUser | null>(null);
  const [passwordDraft, setPasswordDraft] = useState<PasswordDraft>(initialPasswordDraft);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [organizationDraft, setOrganizationDraft] = useState<OrganizationDraft>(emptyOrganizationDraft);
  const [editingOrganization, setEditingOrganization] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submissionInProgress = React.useRef(false);
  const [search, setSearch] = useState('');
  const profileTenant = tenant;
  const profileOffices = offices;
  const canReadManagers = can('users:read');
  const canInviteManagers = can('users:invite');
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

  const loadManagers = useCallback(async () => {
    if (!tenantId || !canReadManagers) {
      setManagers([]);
      setManagersLoading(false);
      setManagersError(null);
      return;
    }
    setManagersLoading(true);
    setManagersError(null);
    try {
      const data = await usersApi.list(tenantId);
      setManagers(data);
    } catch (error) {
      setManagersError(errorText(error));
    } finally {
      setManagersLoading(false);
    }
  }, [canReadManagers, tenantId]);

  useEffect(() => {
    void loadManagers();
  }, [loadManagers]);

  const visibleManagers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return managers;
    return managers.filter((manager) =>
      `${managerDisplayName(manager, profileTenant?.primaryContactName)} ${manager.phone ?? ''} ${manager.email ?? ''}`
        .toLowerCase()
        .includes(query),
    );
  }, [managers, profileTenant?.primaryContactName, search]);

  function showSection(section: SectionId) {
    setActiveSection(section);
    setSearch('');
    setFeedback(null);
  }

  function openAddManager() {
    setManagerDraft(initialManagerDraft);
    setShowManagerPassword(false);
    setPasswordTarget(null);
    setFeedback(null);
    setDialog('manager');
  }

  function openChangePassword(manager: CorporateUser) {
    setPasswordTarget(manager);
    setPasswordDraft(initialPasswordDraft);
    setShowNewPassword(false);
    setFeedback(null);
    setDialog('change-password');
  }

  function closeDialog() {
    if (submitting) return;
    setDialog(null);
    setManagerDraft(initialManagerDraft);
    setShowManagerPassword(false);
    setPasswordTarget(null);
    setPasswordDraft(initialPasswordDraft);
    setShowNewPassword(false);
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

  async function submitManager(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId || submissionInProgress.current) return;
    const fullName = managerDraft.fullName.trim();
    const normalizedPhone = normalizeMobileNumber(managerDraft.phone);
    const password = managerDraft.password;

    if (fullName.length < 2) {
      setFeedback({
        kind: 'error',
        text: 'Enter a manager name (at least 2 characters).',
      });
      return;
    }
    if (isPhoneLike(fullName)) {
      setFeedback({
        kind: 'error',
        text: 'Enter the manager’s name, not a mobile number.',
      });
      return;
    }
    if (!normalizedPhone) {
      setFeedback({
        kind: 'error',
        text: 'Enter a valid 10-digit mobile number.',
      });
      return;
    }
    if (password.length < 8) {
      setFeedback({
        kind: 'error',
        text: 'Password must be at least 8 characters.',
      });
      return;
    }

    submissionInProgress.current = true;
    setSubmitting(true);
    setFeedback(null);
    try {
      await usersApi.invite(tenantId, {
        fullName,
        phone: normalizedPhone,
        password,
        corporateRole: 'TRANSPORT',
        officeIds: officeScope ?? [],
      });
      await loadManagers();
      setDialog(null);
      setManagerDraft(initialManagerDraft);
      setShowManagerPassword(false);
      setFeedback({ kind: 'success', text: 'Manager added.' });
    } catch (error) {
      setFeedback({ kind: 'error', text: errorText(error) });
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
  }

  async function submitChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId || !passwordTarget || submissionInProgress.current) return;
    const { password, confirmPassword } = passwordDraft;
    if (password.length < 8) {
      setFeedback({
        kind: 'error',
        text: 'Password must be at least 8 characters.',
      });
      return;
    }
    if (password !== confirmPassword) {
      setFeedback({
        kind: 'error',
        text: 'Passwords do not match.',
      });
      return;
    }

    submissionInProgress.current = true;
    setSubmitting(true);
    setFeedback(null);
    try {
      if (user?.id && passwordTarget.id === user.id) {
        const res = await authApi.setPassword(password);
        if (res?.accessToken) {
          setSession(res.accessToken, res.refreshToken, res.user);
          acceptSession(res.accessToken, res.user);
        }
      } else {
        await usersApi.update(tenantId, passwordTarget.id, { password });
      }
      setDialog(null);
      setPasswordTarget(null);
      setPasswordDraft(initialPasswordDraft);
      setShowNewPassword(false);
      setFeedback({ kind: 'success', text: 'Password updated.' });
    } catch (error) {
      setFeedback({ kind: 'error', text: errorText(error) });
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
    }
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
              : 'Manage your organization details, legal & tax details, and managers.'}
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
              {status === 'loading' || tenantId ? (
                <ContentLoadingSkeleton
                  kind="profile"
                  count={6}
                  label="Loading organization profile…"
                />
              ) : (
                <EmptyState>Company profile is unavailable for this account.</EmptyState>
              )}
            </Card>
          ) : (
            <>
              <div className={styles.currentSection}>
                <span>{SECTIONS.find((section) => section.id === activeSection)?.icon}</span>
                {SECTIONS.find((section) => section.id === activeSection)?.label}
              </div>
              {!dialog && feedback && (
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
                    title="Legal & tax"
                    description="Registered entity identifiers and the company billing address."
                    borderless
                  />
                  <div className={`${styles.detailsGrid} ${styles.organizationDetails} ${styles.legalDetails}`}>
                    <Detail label="Legal entity name" value={profileTenant.legalEntityName} />
                    <Detail label="GSTIN" value={profileTenant.gstin} />
                    <Detail label="CIN" value={profileTenant.cin} />
                    <Detail
                      label="Billing address"
                      value={
                        (profileTenant.billingSameAsRegistered ?? true)
                          ? 'Same as registered address'
                          : profileTenant.billingAddress
                      }
                    />
                  </div>
                  <div className={styles.legalNotice} role="note">
                    <span className={styles.legalNoticeIcon}>
                      <Shield size={15} aria-hidden="true" />
                    </span>
                    <span>Tax and registration identifiers are stored in the company profile.</span>
                  </div>
                </Card>
              )}

              {activeSection === 'managers' && (
                <Card>
                  <SectionHeading
                    title="Managers"
                    description={`Manager accounts and contact details for ${profileTenant.name}.`}
                    action={
                      canInviteManagers ? (
                        <ActionButton onClick={openAddManager}>
                          <Plus size={15} aria-hidden="true" />
                          <span>Add manager</span>
                        </ActionButton>
                      ) : undefined
                    }
                  />
                  {!canReadManagers ? (
                    <EmptyState>Manager directory access requires Corporate Admin or HR permissions.</EmptyState>
                  ) : managersLoading ? (
                    <div className={styles.managerLoading}>
                      <ContentLoadingSkeleton kind="table" count={4} label="Loading managers…" />
                    </div>
                  ) : managersError ? (
                    <div className={styles.managerNoticeWrap}>
                      <Notice error>
                        Could not load managers. {managersError}{' '}
                        <button type="button" onClick={() => void loadManagers()} className={styles.textAction}>
                          Try again
                        </button>
                      </Notice>
                    </div>
                  ) : (
                    <>
                      <SearchBox
                        value={search}
                        onChange={setSearch}
                        placeholder="Search managers by name or mobile number"
                      />
                      {!managers.length ? (
                        <EmptyState>No managers are configured for this organization.</EmptyState>
                      ) : visibleManagers.length ? (
                        <Table>
                          <thead>
                            <tr>
                              <Th>Name</Th>
                              <Th>Mobile number</Th>
                              <Th>Status</Th>
                              <Th>Actions</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleManagers.map((manager) => {
                              const canChangePassword =
                                canInviteManagers || (Boolean(user?.id) && manager.id === user?.id);
                              return (
                                <tr key={manager.id}>
                                  <Td strong>
                                    {managerDisplayName(manager, profileTenant?.primaryContactName)}
                                  </Td>
                                  <Td>{manager.phone || '—'}</Td>
                                  <Td>
                                    <StatusBadge status={manager.status} size="sm" />
                                  </Td>
                                  <Td>
                                    {canChangePassword ? (
                                      <button
                                        type="button"
                                        onClick={() => openChangePassword(manager)}
                                        className={styles.textAction}
                                      >
                                        <KeyRound size={13} aria-hidden="true" style={{ marginRight: 5, verticalAlign: '-2px' }} />
                                        Change password
                                      </button>
                                    ) : (
                                      '—'
                                    )}
                                  </Td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </Table>
                      ) : (
                        <EmptyState>No managers match “{search}”.</EmptyState>
                      )}
                    </>
                  )}
                </Card>
              )}
            </>
          )}
        </div>
      </main>

      <ProfileDrawer
        isOpen={dialog === 'manager'}
        onClose={closeDialog}
        title="Add manager"
        subtitle="Create a manager account with a name, mobile number, and password."
      >
        <form onSubmit={submitManager} className={styles.form}>
          <Field
            label="Manager name"
            value={managerDraft.fullName}
            required
            placeholder="e.g. Priya Sharma"
            onChange={(fullName) => setManagerDraft((draft) => ({ ...draft, fullName }))}
          />
          <Field
            label="Mobile number"
            type="tel"
            value={managerDraft.phone}
            required
            placeholder="10-digit mobile number"
            onChange={(phone) => setManagerDraft((draft) => ({ ...draft, phone }))}
          />
          <label className={styles.field}>
            Password *
            <div className={styles.passwordInputWrap}>
              <input
                required
                type={showManagerPassword ? 'text' : 'password'}
                value={managerDraft.password}
                minLength={8}
                placeholder="Minimum 8 characters"
                onChange={(event) =>
                  setManagerDraft((draft) => ({ ...draft, password: event.target.value }))
                }
                className={styles.fieldInput}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowManagerPassword((shown) => !shown)}
                aria-label={showManagerPassword ? 'Hide password' : 'Show password'}
              >
                {showManagerPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          <p className={styles.fieldHelp}>
            Minimum 8 characters. The manager can sign in with this mobile number and password.
          </p>
          {feedback?.kind === 'error' && <Notice error>{feedback.text}</Notice>}
          <div className={styles.formActions}>
            <ActionButton secondary onClick={closeDialog} disabled={submitting}>
              Cancel
            </ActionButton>
            <ActionButton type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create manager'}
            </ActionButton>
          </div>
        </form>
      </ProfileDrawer>

      <ProfileDrawer
        isOpen={dialog === 'change-password'}
        onClose={closeDialog}
        title="Change password"
        subtitle={
          passwordTarget
            ? `Set a new sign-in password for ${managerDisplayName(passwordTarget, profileTenant?.primaryContactName)}${passwordTarget.phone ? ` (${passwordTarget.phone})` : ''}.`
            : undefined
        }
      >
        <form onSubmit={submitChangePassword} className={styles.form}>
          <label className={styles.field}>
            New password *
            <div className={styles.passwordInputWrap}>
              <input
                required
                type={showNewPassword ? 'text' : 'password'}
                value={passwordDraft.password}
                minLength={8}
                placeholder="Minimum 8 characters"
                onChange={(event) =>
                  setPasswordDraft((draft) => ({ ...draft, password: event.target.value }))
                }
                className={styles.fieldInput}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowNewPassword((shown) => !shown)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          <Field
            label="Confirm password"
            type={showNewPassword ? 'text' : 'password'}
            value={passwordDraft.confirmPassword}
            required
            placeholder="Re-enter password"
            onChange={(confirmPassword) =>
              setPasswordDraft((draft) => ({ ...draft, confirmPassword }))
            }
          />
          <p className={styles.fieldHelp}>Minimum 8 characters.</p>
          {feedback?.kind === 'error' && <Notice error>{feedback.text}</Notice>}
          <div className={styles.formActions}>
            <ActionButton secondary onClick={closeDialog} disabled={submitting}>
              Cancel
            </ActionButton>
            <ActionButton type="submit" disabled={submitting}>
              {submitting ? 'Updating…' : 'Update password'}
            </ActionButton>
          </div>
        </form>
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

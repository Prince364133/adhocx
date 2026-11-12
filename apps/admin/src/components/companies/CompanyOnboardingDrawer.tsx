'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Building2, Upload } from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import { CreateCorporateTenantInput } from '../../lib/api/types';
import { Button, Drawer } from '../common';

type CompanyDraft = CreateCorporateTenantInput;

const EMPTY_DRAFT: CompanyDraft = {
  code: '',
  name: '',
  legalEntityName: '',
  industry: '',
  website: '',
  registeredAddress: '',
  city: '',
  state: '',
  pinCode: '',
  country: 'India',
  primaryContactName: '',
  primaryContactEmail: '',
  primaryContactPhone: '',
  gstin: '',
  cin: '',
  billingAddress: '',
  billingSameAsRegistered: true,
};

const inputStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  minHeight: 40,
  padding: '0.55rem 0.7rem',
  border: '1px solid var(--border-light)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  font: 'inherit',
};

function Field({
  label,
  name,
  value,
  onChange,
  required = false,
  type = 'text',
  pattern,
  maxLength,
  placeholder,
  multiline = false,
}: {
  label: string;
  name: keyof CompanyDraft;
  value: string;
  onChange: (name: keyof CompanyDraft, value: string) => void;
  required?: boolean;
  type?: string;
  pattern?: string;
  maxLength?: number;
  placeholder?: string;
  multiline?: boolean;
}) {
  const Control = multiline ? 'textarea' : 'input';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
      {label}{required && <span style={{ display: 'inline', color: 'var(--color-danger)' }}> *</span>}
      <Control
        {...(!multiline ? { type } : {})}
        name={name}
        value={value}
        required={required}
        pattern={pattern}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.target.value)}
        style={multiline ? { ...inputStyle, minHeight: 74, resize: 'vertical' } : inputStyle}
      />
    </label>
  );
}

export function CompanyOnboardingDrawer({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (companyId: string, logoUploadFailed: boolean) => void;
}) {
  const [draft, setDraft] = useState<CompanyDraft>(EMPTY_DRAFT);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!logo) {
      setLogoPreview('');
      return;
    }
    const url = URL.createObjectURL(logo);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logo]);

  function changeField(name: keyof CompanyDraft, value: string) {
    setDraft((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!draft.billingSameAsRegistered && !draft.billingAddress?.trim()) {
      setError('Enter the billing address, or select “Same as registered address”.');
      return;
    }
    if (logo && (!['image/jpeg', 'image/png', 'image/webp'].includes(logo.type) || logo.size > 2 * 1024 * 1024)) {
      setError('Choose a JPEG, PNG, or WebP logo up to 2 MB.');
      return;
    }

    setSaving(true);
    try {
      const input: CreateCorporateTenantInput = {
        ...draft,
        code: draft.code.trim().toUpperCase(),
        name: draft.name.trim(),
        legalEntityName: draft.legalEntityName.trim(),
        gstin: draft.gstin?.trim().toUpperCase() || undefined,
        cin: draft.cin?.trim().toUpperCase() || undefined,
        website: draft.website?.trim() || undefined,
        registeredAddress: draft.registeredAddress?.trim(),
        city: draft.city?.trim(),
        state: draft.state?.trim(),
        pinCode: draft.pinCode?.trim(),
        country: draft.country?.trim(),
        primaryContactName: draft.primaryContactName?.trim(),
        primaryContactEmail: draft.primaryContactEmail?.trim(),
        primaryContactPhone: draft.primaryContactPhone?.trim(),
        billingAddress: draft.billingSameAsRegistered ? undefined : draft.billingAddress?.trim(),
        billingSameAsRegistered: Boolean(draft.billingSameAsRegistered),
      };
      const company = await adminApi.createCorporateTenant(input);
      let logoUploadFailed = false;
      if (logo) {
        try {
          await adminApi.uploadCorporateTenantLogo(company.id, logo);
        } catch {
          logoUploadFailed = true;
        }
      }
      setDraft(EMPTY_DRAFT);
      setLogo(null);
      onCreated(company.id, logoUploadFailed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Company onboarding failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={saving ? () => undefined : onClose}
      title="Onboard a company"
      subtitle="Add the organization's identity and legal details. Offices, departments, zones, and users can be set up in its profile."
      width="680px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="company-onboarding-form" isLoading={saving}>Create company</Button>
        </div>
      }
    >
      <form id="company-onboarding-form" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {error && (
          <div role="alert" style={{ padding: 11, border: '1px solid var(--color-danger-border)', borderRadius: 8, color: 'var(--color-danger)', background: 'var(--color-danger-bg)', fontSize: 13 }}>
            {error}
          </div>
        )}

        <section>
          <SectionTitle title="Organization details" description="Company identity and primary contact information." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-elevated)', overflow: 'hidden' }}>
                {logoPreview ? <Image src={logoPreview} alt="Company logo preview" width={52} height={52} unoptimized style={{ objectFit: 'cover' }} /> : <Building2 size={22} />}
              </span>
              <span>
                Company logo
                <span style={{ display: 'block', marginTop: 4, fontWeight: 400, color: 'var(--text-muted)' }}>JPEG, PNG or WebP · up to 2 MB</span>
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Upload company logo"
                onChange={(event) => setLogo(event.target.files?.[0] ?? null)}
                style={{ marginLeft: 'auto', maxWidth: 240 }}
              />
              <Upload size={15} />
            </label>
            <Field label="Company name" name="name" value={draft.name} onChange={changeField} required maxLength={120} />
            <Field label="Company code" name="code" value={draft.code} onChange={changeField} required maxLength={32} pattern="[A-Za-z0-9_-]+" placeholder="e.g. ACME" />
            <Field label="Industry" name="industry" value={draft.industry ?? ''} onChange={changeField} required maxLength={120} />
            <Field label="Company website" name="website" value={draft.website ?? ''} onChange={changeField} type="url" placeholder="https://example.com" />
            <Field label="Primary contact name" name="primaryContactName" value={draft.primaryContactName ?? ''} onChange={changeField} required maxLength={120} />
            <Field label="Primary contact email" name="primaryContactEmail" value={draft.primaryContactEmail ?? ''} onChange={changeField} required type="email" maxLength={254} />
            <Field label="Primary contact phone" name="primaryContactPhone" value={draft.primaryContactPhone ?? ''} onChange={changeField} required type="tel" pattern="[+0-9() .-]{7,24}" maxLength={24} />
            <Field label="City" name="city" value={draft.city ?? ''} onChange={changeField} required maxLength={100} />
            <Field label="State" name="state" value={draft.state ?? ''} onChange={changeField} required maxLength={100} />
            <Field label="PIN code" name="pinCode" value={draft.pinCode ?? ''} onChange={changeField} required maxLength={12} />
            <Field label="Country" name="country" value={draft.country ?? ''} onChange={changeField} required maxLength={100} />
          </div>
        </section>

        <section>
          <SectionTitle title="Legal & tax details" description="GSTIN and CIN are optional and validated when provided." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <Field label="Legal business name" name="legalEntityName" value={draft.legalEntityName} onChange={changeField} required maxLength={180} />
            <Field label="GSTIN" name="gstin" value={draft.gstin ?? ''} onChange={changeField} pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][A-Za-z0-9]Z[A-Za-z0-9]" maxLength={15} placeholder="Optional" />
            <Field label="CIN / registration number" name="cin" value={draft.cin ?? ''} onChange={changeField} pattern="[LUlu][0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}" maxLength={21} placeholder="Optional" />
            <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={Boolean(draft.billingSameAsRegistered)}
                onChange={(event) => setDraft((current) => ({ ...current, billingSameAsRegistered: event.target.checked }))}
              />
              Billing address is the same as the registered address
            </label>
            {!draft.billingSameAsRegistered && (
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Billing address" name="billingAddress" value={draft.billingAddress ?? ''} onChange={changeField} required multiline maxLength={500} />
              </div>
            )}
          </div>
        </section>
      </form>
    </Drawer>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 14 }}>{title}</h3>
      <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>{description}</p>
    </div>
  );
}

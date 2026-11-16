"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Building2, Upload } from "lucide-react";
import { adminApi } from "../../lib/api/client";
import { CreateCorporateTenantInput } from "../../lib/api/types";
import { Button, Drawer, Input, Textarea } from "../common";

type CompanyDraft = CreateCorporateTenantInput;

const EMPTY_DRAFT: CompanyDraft = {
  code: "",
  name: "",
  legalEntityName: "",
  industry: "",
  website: "",
  registeredAddress: "",
  city: "",
  state: "",
  pinCode: "",
  country: "India",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  gstin: "",
  cin: "",
  billingAddress: "",
  billingSameAsRegistered: true,
};

function Field({
  label,
  name,
  value,
  onChange,
  required = false,
  type = "text",
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
  if (multiline) {
    return (
      <Textarea
        label={label}
        name={name}
        value={value}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(name, event.target.value)}
      />
    );
  }

  return (
    <Input
      label={label}
      name={name}
      type={type}
      value={value}
      required={required}
      pattern={pattern}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(event) => onChange(name, event.target.value)}
    />
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
  const [logoPreview, setLogoPreview] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!logo) {
      setLogoPreview("");
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
    setError("");
    if (!draft.billingSameAsRegistered && !draft.billingAddress?.trim()) {
      setError(
        "Enter the billing address, or select “Same as registered address”.",
      );
      return;
    }
    if (
      logo &&
      (!["image/jpeg", "image/png", "image/webp"].includes(logo.type) ||
        logo.size > 2 * 1024 * 1024)
    ) {
      setError("Choose a JPEG, PNG, or WebP logo up to 2 MB.");
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
        billingAddress: draft.billingSameAsRegistered
          ? undefined
          : draft.billingAddress?.trim(),
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
      setError(
        cause instanceof Error ? cause.message : "Company onboarding failed.",
      );
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
        <div className="flex justify-end" style={{ gap: 8 }}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="company-onboarding-form"
            isLoading={saving}
          >
            Create company
          </Button>
        </div>
      }
    >
      <form
        id="company-onboarding-form"
        onSubmit={submit}
        className="flex flex-col"
        style={{ gap: 20 }}
      >
        {error && (
          <div
            role="alert"
            className="text-danger bg-danger-subtle"
            style={{
              padding: 11,
              border: "1px solid var(--color-danger-border)",
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <section>
          <SectionTitle
            title="Organization details"
            description="Company identity and primary contact information."
          />
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <label
              className="flex items-center text-secondary font-semibold"
              style={{ gridColumn: "1 / -1", gap: 12, fontSize: 12 }}
            >
              <span
                className="grid border border-subtle bg-surface-elevated overflow-hidden"
                style={{
                  placeItems: "center",
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                }}
              >
                {logoPreview ? (
                  <Image
                    src={logoPreview}
                    alt="Company logo preview"
                    width={52}
                    height={52}
                    unoptimized
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <Building2 size={22} />
                )}
              </span>
              <span>
                Company logo
                <span
                  className="block font-regular text-muted"
                  style={{ marginTop: 4 }}
                >
                  JPEG, PNG or WebP · up to 2 MB
                </span>
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Upload company logo"
                onChange={(event) => setLogo(event.target.files?.[0] ?? null)}
                style={{ marginLeft: "auto", maxWidth: 240 }}
              />
              <Upload size={15} />
            </label>
            <Field
              label="Company name"
              name="name"
              value={draft.name}
              onChange={changeField}
              required
              maxLength={120}
            />
            <Field
              label="Company code"
              name="code"
              value={draft.code}
              onChange={changeField}
              required
              maxLength={32}
              pattern="[A-Za-z0-9_-]+"
              placeholder="e.g. ACME"
            />
            <Field
              label="Industry"
              name="industry"
              value={draft.industry ?? ""}
              onChange={changeField}
              required
              maxLength={120}
            />
            <Field
              label="Company website"
              name="website"
              value={draft.website ?? ""}
              onChange={changeField}
              type="url"
              placeholder="https://example.com"
            />
            <Field
              label="Primary contact name"
              name="primaryContactName"
              value={draft.primaryContactName ?? ""}
              onChange={changeField}
              required
              maxLength={120}
            />
            <Field
              label="Primary contact email"
              name="primaryContactEmail"
              value={draft.primaryContactEmail ?? ""}
              onChange={changeField}
              required
              type="email"
              maxLength={254}
            />
            <Field
              label="Company phone number (Corporate login)"
              name="primaryContactPhone"
              value={draft.primaryContactPhone ?? ""}
              onChange={changeField}
              required
              type="tel"
              pattern="[+0-9() .-]{7,24}"
              maxLength={24}
              placeholder="+91 98765 43210"
            />
            <Field
              label="Registered office address"
              name="registeredAddress"
              value={draft.registeredAddress ?? ""}
              onChange={changeField}
              placeholder="Building, Street, Area"
              maxLength={250}
            />
            <Field
              label="City"
              name="city"
              value={draft.city ?? ""}
              onChange={changeField}
              required
              maxLength={100}
            />
            <Field
              label="State"
              name="state"
              value={draft.state ?? ""}
              onChange={changeField}
              required
              maxLength={100}
            />
            <Field
              label="PIN code"
              name="pinCode"
              value={draft.pinCode ?? ""}
              onChange={changeField}
              required
              maxLength={12}
            />
            <Field
              label="Country"
              name="country"
              value={draft.country ?? ""}
              onChange={changeField}
              required
              maxLength={100}
            />
          </div>
        </section>

        <section>
          <SectionTitle
            title="Legal & tax details"
            description="GSTIN and CIN are optional and validated when provided."
          />
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <Field
              label="Legal business name"
              name="legalEntityName"
              value={draft.legalEntityName}
              onChange={changeField}
              required
              maxLength={180}
            />
            <Field
              label="GSTIN"
              name="gstin"
              value={draft.gstin ?? ""}
              onChange={changeField}
              pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][A-Za-z0-9]Z[A-Za-z0-9]"
              maxLength={15}
              placeholder="Optional"
            />
            <Field
              label="CIN / registration number"
              name="cin"
              value={draft.cin ?? ""}
              onChange={changeField}
              pattern="[LUlu][0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}"
              maxLength={21}
              placeholder="Optional"
            />
            <label
              className="flex items-center text-secondary"
              style={{ gridColumn: "1 / -1", gap: 8, fontSize: 13 }}
            >
              <input
                type="checkbox"
                checked={Boolean(draft.billingSameAsRegistered)}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    billingSameAsRegistered: event.target.checked,
                  }))
                }
              />
              Billing address is the same as the registered address
            </label>
            {!draft.billingSameAsRegistered && (
              <div style={{ gridColumn: "1 / -1" }}>
                <Field
                  label="Billing address"
                  name="billingAddress"
                  value={draft.billingAddress ?? ""}
                  onChange={changeField}
                  required
                  multiline
                  maxLength={500}
                />
              </div>
            )}
          </div>
        </section>
      </form>
    </Drawer>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 className="m-0 text-primary" style={{ fontSize: 14 }}>
        {title}
      </h3>
      <p className="text-muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
        {description}
      </p>
    </div>
  );
}

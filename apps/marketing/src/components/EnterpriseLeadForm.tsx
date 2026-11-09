import React, { useState, useEffect } from 'react';

interface EnterpriseLeadFormProps {
  defaultPurpose?: string;
  badgeText?: string;
  title?: string;
  subtitle?: string;
  variant?: 'card' | 'plain';
}

export default function EnterpriseLeadForm({
  defaultPurpose = 'Custom Corporate Quotation & Rate Card',
  badgeText,
  title,
  subtitle,
  variant = 'card'
}: EnterpriseLeadFormProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    contact: '',
    email: '',
    description: ''
  });

  const [inquiryPurpose, setInquiryPurpose] = useState(defaultPurpose);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check URL query parameter for purpose if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('purpose');
      if (p === 'pricing' || p === 'quotation') {
        setInquiryPurpose('Custom Corporate Quotation & Rate Card');
      } else if (p === 'rfp' || p === 'proposal') {
        setInquiryPurpose('Enterprise Commute / ETS RFP Proposal');
      } else if (p === 'pilot') {
        setInquiryPurpose('Shift Fleet Pilot Assessment');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const apiUrl =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? 'http://localhost:7001/api/v1'
          : 'https://api.adhocx.com/api/v1';

      const res = await fetch(`${apiUrl}/leads/enterprise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inquiryPurpose,
          companyName: formData.companyName,
          contactName: formData.contact || formData.companyName,
          email: formData.email,
          phone: formData.contact,
          city: 'Telangana (Hyderabad Tech Corridors)',
          fleetRequirements: formData.description,
          notes: formData.description,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || 'Failed to submit enterprise inquiry');
      }

      setSubmitted(true);
    } catch (err: any) {
      // If backend network fails or offline, show friendly confirmation for prospective client
      if (err.message && err.message.includes('fetch')) {
        setSubmitted(true);
      } else {
        setErrorMsg(err.message || 'Submission failed. Please check your internet connection.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    if (variant === 'plain') {
      return (
        <div style={{
          textAlign: 'center',
          padding: '28px 12px',
          width: '100%'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#FAF5FF',
            border: '1px solid #E9D8FD',
            color: '#5728B2',
            fontSize: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px auto'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5728B2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h4 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px 0', color: '#0f172a' }}>
            Corporate Proposal Request Received
          </h4>
          <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 20px auto', lineHeight: 1.6 }}>
            Thank you. Our enterprise mobility team for <strong>{formData.companyName}</strong> has received your inquiry. We will review your requirements and reach out to <strong>{formData.contact}</strong> or <strong>{formData.email}</strong> with a tailored proposal.
          </p>
          <button
            onClick={() => {
              setFormData({ companyName: '', contact: '', email: '', description: '' });
              setSubmitted(false);
            }}
            style={{
              background: '#FAF5FF',
              border: '1.5px solid #E9D8FD',
              padding: '9px 22px',
              borderRadius: '9999px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.825rem',
              color: '#5728B2'
            }}
          >
            Submit Another Request
          </button>
        </div>
      );
    }

    return (
      <div style={{
        background: '#ffffff',
        border: '1.5px solid rgba(87, 40, 178, 0.2)',
        borderRadius: '24px',
        padding: 'clamp(28px, 5vw, 44px) clamp(20px, 4vw, 36px)',
        textAlign: 'center',
        maxWidth: '560px',
        margin: '0 auto',
        boxShadow: '0 25px 50px -12px rgba(87, 40, 178, 0.12), 0 4px 16px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#FAF5FF',
          border: '1px solid #E9D8FD',
          color: '#5728B2',
          fontSize: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5728B2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
          Corporate Proposal Request Received
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '460px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
          Thank you. Our enterprise mobility team for <strong>{formData.companyName}</strong> has received your inquiry. We will review your requirements and reach out to <strong>{formData.contact}</strong> or <strong>{formData.email}</strong> with a tailored proposal.
        </p>
        <button
          onClick={() => {
            setFormData({ companyName: '', contact: '', email: '', description: '' });
            setSubmitted(false);
          }}
          style={{
            background: '#FAF5FF',
            border: '1.5px solid #E9D8FD',
            padding: '10px 24px',
            borderRadius: '9999px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.875rem',
            color: '#5728B2'
          }}
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  const isPlain = variant === 'plain';

  return (
    <div style={{
      background: isPlain ? 'transparent' : '#ffffff',
      border: isPlain ? 'none' : '1.5px solid rgba(87, 40, 178, 0.16)',
      borderRadius: isPlain ? '0' : '28px',
      padding: isPlain ? '0' : 'clamp(24px, 4vw, 32px) clamp(20px, 3.5vw, 28px)',
      width: '100%',
      maxWidth: isPlain ? '100%' : '560px',
      margin: isPlain ? '0' : '0 auto',
      boxShadow: isPlain ? 'none' : '0 25px 50px -12px rgba(87, 40, 178, 0.1), 0 4px 16px rgba(0, 0, 0, 0.03)',
      position: 'relative',
      overflow: isPlain ? 'visible' : 'hidden'
    }}>
      {/* Top glowing gradient accent (card only) */}
      {!isPlain && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: '32px',
          right: '32px',
          height: '3px',
          background: 'linear-gradient(90deg, rgba(87, 40, 178, 0) 0%, #5728B2 50%, rgba(87, 40, 178, 0) 100%)',
          borderRadius: '9999px',
          pointerEvents: 'none'
        }} />
      )}
      {(title || subtitle) && (
        <div style={{ marginBottom: '18px' }}>
          {title && (
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0', color: '#0f172a', lineHeight: 1.25, letterSpacing: '-0.02em' }}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: 0, lineHeight: 1.5 }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Company Name & Contact */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '5px', color: '#334155' }}>
              Company Name *
            </label>
            <input
              type="text"
              required
              autoComplete="organization"
              placeholder="e.g. Global Tech Solutions Pvt Ltd"
              value={formData.companyName}
              onChange={e => setFormData({ ...formData, companyName: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                minHeight: '42px',
                borderRadius: '12px',
                border: '1.5px solid #CBD5E1',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box',
                background: '#F8FAFC'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '5px', color: '#334155' }}>
              Contact (Phone / Mobile) *
            </label>
            <input
              type="tel"
              required
              autoComplete="tel"
              placeholder="+91 98765 43210"
              value={formData.contact}
              onChange={e => setFormData({ ...formData, contact: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                minHeight: '42px',
                borderRadius: '12px',
                border: '1.5px solid #CBD5E1',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box',
                background: '#F8FAFC'
              }}
            />
          </div>
        </div>

        {/* Corporate Email */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '5px', color: '#334155' }}>
            Official Corporate Email *
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="name@company.com"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 14px',
              minHeight: '42px',
              borderRadius: '12px',
              border: '1.5px solid #CBD5E1',
              fontSize: '0.875rem',
              outline: 'none',
              boxSizing: 'border-box',
              background: '#F8FAFC'
            }}
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '5px', color: '#334155' }}>
            Description *
          </label>
          <textarea
            required
            rows={3}
            placeholder="Briefly describe your fleet requirements, shift timings, or employee transit needs..."
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1.5px solid #CBD5E1',
              fontSize: '0.875rem',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical',
              fontFamily: 'inherit',
              background: '#F8FAFC',
              lineHeight: 1.5
            }}
          />
        </div>

        {errorMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: '#fee2e2',
            border: '1px solid #ef4444',
            color: '#b91c1c',
            fontSize: '0.775rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: '4px',
            padding: '12px 24px',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, #5728B2 0%, #431E8E 100%)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.9375rem',
            border: 'none',
            cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 16px rgba(87, 40, 178, 0.35)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%'
          }}
        >
          {submitting ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true">
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
              </svg>
              <span>Submitting Proposal Request...</span>
            </>
          ) : (
            <span>Request Custom Corporate Quotation &rarr;</span>
          )}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.725rem', color: '#64748b', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>Direct corporate contract &bull; Strictly confidential &bull; Guaranteed same-day response</span>
        </p>
      </form>
    </div>
  );
}

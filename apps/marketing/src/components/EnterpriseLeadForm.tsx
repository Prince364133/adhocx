import React, { useState } from 'react';

export default function EnterpriseLeadForm() {
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    city: 'Telangana (Hyderabad Tech Corridors)',
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  if (submitted) {
    return (
      <div style={{
        background: 'var(--color-surface, #ffffff)',
        border: '2px solid #1167EE',
        borderRadius: '1rem',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(25, 27, 28, 0.1))'
      }}>
        <div style={{
          width: '4rem',
          height: '4rem',
          borderRadius: '50%',
          background: '#CEE0FD',
          color: '#1167EE',
          fontSize: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem auto'
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#191B1C' }}>
          Corporate Demo Request Received!
        </h3>
        <p style={{ color: '#595F61', fontSize: '0.9375rem', maxWidth: '28rem', margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
          Thank you! Our enterprise transport specialist for <strong>{formData.companyName}</strong> ({formData.city}) will contact you at <strong>{formData.phone}</strong> or <strong>{formData.email}</strong> within 30 minutes with our verified 4 & 7 seater rate card.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          style={{
            background: '#EDEFF0',
            border: '1px solid #C2C9CC',
            padding: '0.625rem 1.25rem',
            borderRadius: '0.5rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.875rem',
            color: '#191B1C'
          }}
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--color-surface, #ffffff)',
      border: '1px solid var(--color-border, #C2C9CC)',
      borderRadius: '1rem',
      padding: '2rem 1.5rem',
      boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(25, 27, 28, 0.08))'
    }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#191B1C' }}>
          Book Corporate Demo & Rate Card
        </h3>
        <p style={{ color: '#595F61', fontSize: '0.875rem', margin: 0 }}>
          Commercial yellow-plate fleet dispatch, 15-minute SLA allocation, and unified GST invoicing.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: '#191B1C' }}>
              Company / Enterprise Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Infosys / Wipro / Google"
              value={formData.companyName}
              onChange={e => setFormData({ ...formData, companyName: e.target.value })}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: '0.5rem',
                border: '1px solid #C2C9CC',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: '#191B1C' }}>
              Official Work Email *
            </label>
            <input
              type="email"
              required
              placeholder="name@company.com"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: '0.5rem',
                border: '1px solid #C2C9CC',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: '#191B1C' }}>
              Mobile / WhatsApp Number *
            </label>
            <input
              type="tel"
              required
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: '0.5rem',
                border: '1px solid #C2C9CC',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem', color: '#191B1C' }}>
              Operating Region / Hub *
            </label>
            <select
              value={formData.city}
              onChange={e => setFormData({ ...formData, city: e.target.value })}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: '0.5rem',
                border: '1px solid #C2C9CC',
                fontSize: '0.9rem',
                outline: 'none',
                background: '#fff',
                boxSizing: 'border-box'
              }}
            >
              <option value="Telangana (Hyderabad Tech Corridors)">Telangana (Hyderabad Tech Corridors)</option>
              <option value="Telangana (Regional Hubs & Warangal)">Telangana (Regional Hubs & Warangal)</option>
              <option value="Pan-Telangana Corporate Hubs">Pan-Telangana Corporate Hubs</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: '0.5rem',
            padding: '0.875rem 1.5rem',
            borderRadius: '0.625rem',
            background: 'linear-gradient(135deg, #1167EE 0%, #0948AC 100%)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '1rem',
            border: 'none',
            cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(17, 103, 238, 0.35)',
            transition: 'transform 0.15s ease'
          }}
        >
          {submitting ? 'Submitting Corporate Request...' : 'Book a Demo & Get Rate Card →'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9BA3A8', margin: '0.25rem 0 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          Strictly confidential enterprise portal. Zero spam, guaranteed 30-min response.
        </p>
      </form>
    </div>
  );
}

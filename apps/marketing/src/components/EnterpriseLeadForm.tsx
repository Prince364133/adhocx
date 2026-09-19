import React, { useState } from 'react';

export default function EnterpriseLeadForm() {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    city: 'Hyderabad',
    fleetRequirements: 'Daily Employee Shift Drops',
    monthlyTripsEstimate: '100-500',
    preferredVehicles: ['4-Seater Sedan (Dzire/Etios)'],
    notes: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const vehicleOptions = [
    '4-Seater Sedan (Dzire/Etios)',
    '6/7-Seater MUV (Ertiga/XL6)',
    '7-Seater Executive (Innova Crysta)'
  ];

  const handleVehicleToggle = (v: string) => {
    setFormData(prev => {
      const exists = prev.preferredVehicles.includes(v);
      if (exists) {
        return { ...prev, preferredVehicles: prev.preferredVehicles.filter(item => item !== v) };
      } else {
        return { ...prev, preferredVehicles: [...prev.preferredVehicles, v] };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 750);
  };

  if (submitted) {
    return (
      <div style={{
        background: 'var(--color-surface, #ffffff)',
        border: '2px solid #5A30B0',
        borderRadius: '16px',
        padding: '40px 32px',
        textAlign: 'center',
        boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1))'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#ECE6FE',
          color: '#5A30B0',
          fontSize: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto'
        }}>
          ✓
        </div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>
          Corporate Demo Request Received!
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '440px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
          Thank you, <strong>{formData.contactName}</strong>. Our enterprise logistics specialist for <strong>{formData.companyName}</strong> will contact you at <strong>{formData.phone}</strong> or <strong>{formData.email}</strong> within 30 minutes with our 4-seater and 7-seater rate card.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.875rem',
            color: '#334155'
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
      border: '1px solid var(--color-border, #e2e8f0)',
      borderRadius: '16px',
      padding: '32px 24px',
      boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1))'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <span style={{
          display: 'inline-block',
          background: '#ECE6FE',
          color: '#5A30B0',
          fontWeight: 700,
          fontSize: '0.75rem',
          padding: '4px 14px',
          borderRadius: '9999px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px'
        }}>
          Enterprise Fleet Setup
        </span>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px 0', color: '#0f172a' }}>
          Request Corporate Demo & Rate Card
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
          4 & 7 Seater commercial fleet dispatch, 15-minute SLA allocation, and unified GST billing.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
              Company / Enterprise Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tech Mahindra / Infosys / Google"
              value={formData.companyName}
              onChange={e => setFormData({ ...formData, companyName: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
              Contact Person / Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma (Admin Head)"
              value={formData.contactName}
              onChange={e => setFormData({ ...formData, contactName: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
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
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
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
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
              Primary Requirement
            </label>
            <select
              value={formData.fleetRequirements}
              onChange={e => setFormData({ ...formData, fleetRequirements: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                background: '#fff',
                boxSizing: 'border-box'
              }}
            >
              <option value="Daily Employee Shift Drops">Daily Employee Shift Drops</option>
              <option value="Executive & Airport Transfers">Executive & Airport Transfers</option>
              <option value="Ad-hoc On-Demand Bulk Cabs">Ad-hoc On-Demand Bulk Cabs</option>
              <option value="Event & Corporate Logistics">Event & Corporate Logistics</option>
              <option value="Dedicated Monthly Fleet">Dedicated Monthly Fleet</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px', color: '#334155' }}>
              Estimated Monthly Trips
            </label>
            <select
              value={formData.monthlyTripsEstimate}
              onChange={e => setFormData({ ...formData, monthlyTripsEstimate: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                background: '#fff',
                boxSizing: 'border-box'
              }}
            >
              <option value="< 100 trips">&lt; 100 trips/month</option>
              <option value="100-500">100 - 500 trips/month</option>
              <option value="500-2000">500 - 2,000 trips/month</option>
              <option value="2000+">2,000+ trips/month (High Volume)</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '8px', color: '#334155' }}>
            Commercial Vehicle Types (4 & 7 Seater Yellow-Plate)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {vehicleOptions.map((v) => {
              const isChecked = formData.preferredVehicles.includes(v);
              return (
                <button
                  type="button"
                  key={v}
                  onClick={() => handleVehicleToggle(v)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isChecked ? '1.5px solid #5A30B0' : '1px solid #cbd5e1',
                    background: isChecked ? '#ECE6FE' : '#f8fafc',
                    color: isChecked ? '#5A30B0' : '#475569',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isChecked ? '✓ ' : '+ '}{v}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: '8px',
            padding: '14px 24px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #5A30B0 0%, #6A3FE0 100%)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '1rem',
            border: 'none',
            cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(90, 48, 176, 0.4)',
            transition: 'transform 0.15s ease'
          }}
        >
          {submitting ? 'Submitting Corporate Request...' : 'Get Custom Enterprise Rate Card →'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
          🔒 Your contact info is strictly confidential. No spam, guaranteed 30-min response.
        </p>
      </form>
    </div>
  );
}

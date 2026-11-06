import React, { useState } from 'react';

export default function CorporateEstimator() {
  const [commuters, setCommuters] = useState<number>(350);
  const [shiftModel, setShiftModel] = useState<'3-shift' | '2-shift' | 'general'>('3-shift');
  const [vehicleMix, setVehicleMix] = useState<'hybrid' | 'sedan' | 'muv'>('hybrid');

  // Calculation logic based on corporate ETS routing rules
  const shiftMultiplier = shiftModel === '3-shift' ? 1.0 : shiftModel === '2-shift' ? 0.85 : 0.7;
  const avgOccupancy = vehicleMix === 'muv' ? 5.8 : vehicleMix === 'sedan' ? 3.6 : 4.4;
  
  const estimatedCabs = Math.max(4, Math.round((commuters * 0.75 * shiftMultiplier) / avgOccupancy));
  const estimatedRoutes = Math.round(estimatedCabs * (shiftModel === '3-shift' ? 2.8 : 2.0));
  const adminHoursSaved = Math.round(commuters * 0.42);
  const escortCompliancePercent = 100;

  return (
    <div className="estimator-container">
      <div className="estimator-grid">
        {/* Controls Column */}
        <div className="estimator-controls">
          <div className="estimator-field">
            <div className="estimator-label-row">
              <label htmlFor="commuter-range" className="estimator-label">Daily Commuter Headcount</label>
              <span className="estimator-value-badge">{commuters.toLocaleString()} Employees</span>
            </div>
            <input
              id="commuter-range"
              type="range"
              min="50"
              max="2500"
              step="25"
              value={commuters}
              onChange={(e) => setCommuters(parseInt(e.target.value, 10))}
              className="estimator-slider"
              aria-label="Daily Commuter Headcount"
            />
            <div className="estimator-scale">
              <span>50</span>
              <span>500</span>
              <span>1,200</span>
              <span>2,500+</span>
            </div>
          </div>

          {/* Shift Model Selector */}
          <div className="estimator-field">
            <span className="estimator-label">Shift Operating Model</span>
            <div className="estimator-toggle-group">
              <button
                type="button"
                className={`estimator-toggle-btn ${shiftModel === '3-shift' ? 'active' : ''}`}
                onClick={() => setShiftModel('3-shift')}
              >
                24/7 (3 Shifts)
              </button>
              <button
                type="button"
                className={`estimator-toggle-btn ${shiftModel === '2-shift' ? 'active' : ''}`}
                onClick={() => setShiftModel('2-shift')}
              >
                Day & Evening (2 Shifts)
              </button>
              <button
                type="button"
                className={`estimator-toggle-btn ${shiftModel === 'general' ? 'active' : ''}`}
                onClick={() => setShiftModel('general')}
              >
                General Office
              </button>
            </div>
          </div>

          {/* Vehicle Mix Selector */}
          <div className="estimator-field">
            <span className="estimator-label">Fleet Mix Preference</span>
            <div className="estimator-toggle-group">
              <button
                type="button"
                className={`estimator-toggle-btn ${vehicleMix === 'hybrid' ? 'active' : ''}`}
                onClick={() => setVehicleMix('hybrid')}
              >
                Optimized Hybrid (Sedan + MUV)
              </button>
              <button
                type="button"
                className={`estimator-toggle-btn ${vehicleMix === 'sedan' ? 'active' : ''}`}
                onClick={() => setVehicleMix('sedan')}
              >
                4-Seater Sedans Only
              </button>
              <button
                type="button"
                className={`estimator-toggle-btn ${vehicleMix === 'muv' ? 'active' : ''}`}
                onClick={() => setVehicleMix('muv')}
              >
                6/7-Seater MUVs Only
              </button>
            </div>
          </div>
        </div>

        {/* Results Card Column */}
        <div className="estimator-card">
          <div className="estimator-card-header">
            <div>
              <span className="estimator-card-sub">ESTIMATED REQUIREMENTS</span>
              <h4 className="estimator-card-title">Corporate Commute Sizing</h4>
            </div>
            <span className="estimator-status-pill">● Telangana Corridors</span>
          </div>

          <div className="estimator-metrics">
            <div className="estimator-metric-box">
              <span className="metric-val">{estimatedCabs}</span>
              <span className="metric-lbl">Dedicated Cabs Needed</span>
            </div>
            <div className="estimator-metric-box">
              <span className="metric-val">{estimatedRoutes}</span>
              <span className="metric-lbl">Daily Optimized Shifts</span>
            </div>
            <div className="estimator-metric-box">
              <span className="metric-val text-green">{escortCompliancePercent}%</span>
              <span className="metric-lbl">Night Escort Compliance</span>
            </div>
            <div className="estimator-metric-box">
              <span className="metric-val text-purple">~{adminHoursSaved} hrs</span>
              <span className="metric-lbl">Monthly Admin Saved</span>
            </div>
          </div>

          <div className="estimator-features-list">
            <div className="estimator-feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>100% Yellow-Plate Commercial Cabs (Dzire, Etios, Ertiga, Innova)</span>
            </div>
            <div className="estimator-feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Audit-backed digital duty slips matched with driver GPS telemetry</span>
            </div>
            <div className="estimator-feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Direct ERP sync into SAP, Oracle, Zoho, or CSV with GST e-invoicing</span>
            </div>
          </div>

          <a href="#corporate-rfp" className="btn-pill-primary estimator-cta-btn">
            <span>Request Tailored Enterprise Rate Card</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </div>
  );
}

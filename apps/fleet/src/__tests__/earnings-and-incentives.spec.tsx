import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import FleetEarningsPage from '../app/earnings/page';
import FleetIncentivesPage from '../app/incentives/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/incentives',
}));

vi.mock('../lib/auth/session', () => ({
  getStoredFleetUser: () => ({
    id: 'owner-1',
    fleetId: 'fleet-1',
    fleetName: 'Metro Fleet',
    fleetCode: 'FLT-METRO1',
    fullName: 'Metro Owner',
    phone: '9999900001',
    role: 'FLEET_OWNER',
    permissions: ['VIEW_EARNINGS'],
  }),
  getFleetToken: () => 'mock-jwt',
}));

describe('Fleet Earnings & Incentives Pages (SSR Smoke & Controls)', () => {
  it('renders Earnings & Payouts workspace with period filters, payout submission & tabs', () => {
    const html = renderToStaticMarkup(<FleetEarningsPage />);
    expect(html).toContain('This Month');
    expect(html).toContain('Previous Month');
    expect(html).toContain('Custom Range');
    expect(html).toContain('Export CSV');
    expect(html).toContain('Request Payout Amount (INR)');
    expect(html).toContain('Payout History');
    expect(html).toContain('Driver-Wise Earnings');
    expect(html).toContain('Shortfall Compensation');
  });

  it('renders Incentives workspace for Fleet Owner with Create button', () => {
    const html = renderToStaticMarkup(<FleetIncentivesPage />);
    expect(html).toContain('Driver Incentives');
    expect(html).toContain('Create Incentive');
  });
});

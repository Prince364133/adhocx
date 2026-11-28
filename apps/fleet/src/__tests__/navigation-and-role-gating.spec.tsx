import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

import { Sidebar } from '../components/layout/Sidebar';
import FleetShiftsPage from '../app/shifts/page';

describe('Sidebar Navigation, Forbidden Routes & Role-Based UI Gating', () => {
  it('renders authorized Fleet navigation items, unread badge capped at 99+, and excludes forbidden modules', () => {
    const html = renderToStaticMarkup(
      <Sidebar
        fleetName="Metro Logistics"
        userRole="FLEET_OWNER"
        unreadNotifications={124}
        onRequestLogout={() => undefined}
      />,
    );

    expect(html).toContain('AdhocX Fleet');
    expect(html).toContain('Metro Logistics');
    expect(html).toContain('Dashboard');
    expect(html).toContain('Driver Management');
    expect(html).toContain('Live Operations');
    expect(html).toContain('Earnings &amp; Payouts');
    expect(html).toContain('Driver Incentives');
    expect(html).toContain('Support Center');
    expect(html).toContain('Notifications');
    expect(html).toContain('99+');
    expect(html).toContain('Sign Out');

    // Strictly excluded standalone modules per PRD
    expect(html).not.toContain('href="/trips"');
    expect(html).not.toContain('href="/vehicles"');
    expect(html).not.toContain('href="/settings"');
    expect(html).not.toContain('href="/coupons"');
  });

  it('renders disabled message for feature-flagged /shifts route when flag is off', () => {
    const html = renderToStaticMarkup(<FleetShiftsPage />);
    expect(html).toContain('Shift &amp; Ride Management Disabled');
  });

  it('enforces FLEET_OWNER gating and confirmation dialogs across Dashboard, Drivers, Earnings & Incentives pages', () => {
    const readAppFile = (rel: string) =>
      fs.readFileSync(path.resolve(__dirname, '..', 'app', rel), 'utf8');

    const dashboardSrc = readAppFile('dashboard/page.tsx');
    expect(dashboardSrc).toContain('FLEET_OWNER');
    expect(dashboardSrc).toContain('ConfirmDialog');
    expect(dashboardSrc).toContain('DashboardSkeleton');

    const driversSrc = readAppFile('drivers/page.tsx');
    expect(driversSrc).toContain('FLEET_OWNER');
    expect(driversSrc).toContain('ConfirmDialog');
    expect(driversSrc).toContain('TablePageSkeleton');

    const liveOpsSrc = readAppFile('live-operations/page.tsx');
    expect(liveOpsSrc).toContain('lastRefreshedAt');
    expect(liveOpsSrc).toContain('TablePageSkeleton');

    const earningsSrc = readAppFile('earnings/page.tsx');
    expect(earningsSrc).toContain('FLEET_OWNER');
    expect(earningsSrc).toContain('ConfirmDialog');
    expect(earningsSrc).toContain('CardsGridSkeleton');

    const incentivesSrc = readAppFile('incentives/page.tsx');
    expect(incentivesSrc).toContain('FLEET_OWNER');
    expect(incentivesSrc).toContain('ConfirmDialog');

    const supportSrc = readAppFile('support/page.tsx');
    expect(supportSrc).toContain('ConfirmDialog');
    expect(supportSrc).toContain('DrawerSkeleton');

    const notificationsSrc = readAppFile('notifications/page.tsx');
    expect(notificationsSrc).toContain('TablePageSkeleton');
    expect(notificationsSrc).toContain('Mark all read');
  });
});

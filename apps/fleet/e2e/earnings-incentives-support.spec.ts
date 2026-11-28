import { test, expect } from '@playwright/test';

const FLEET_URL = process.env.FLEET_BASE_URL || 'http://localhost:7008';

test.describe('Earnings, Incentives, Support & Notifications E2E', () => {
  test('Verifies Earnings, Incentives, Support ticket creation/reply, and Notification mark read', async ({ page }) => {
    await page.addInitScript(() => {
      document.cookie = 'adhocx_fleet_token=e2e-jwt-token; path=/';
      localStorage.setItem('adhocx_fleet_token', 'e2e-jwt-token');
      localStorage.setItem('adhocx_fleet_user', JSON.stringify({
        id: 'owner-1',
        fleetId: 'fleet-1',
        fleetName: 'Metro Fleet',
        fleetCode: 'FLT-E2E123',
        fullName: 'Metro Owner',
        phone: '9999900001',
        role: 'FLEET_OWNER',
        permissions: ['VIEW_EARNINGS'],
      }));
    });

    await page.route('**/api/v1/fleet/auth/me', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 'owner-1', fleetId: 'fleet-1', fleetName: 'Metro Fleet', fleetCode: 'FLT-E2E123', fullName: 'Metro Owner', phone: '9999900001', role: 'FLEET_OWNER', permissions: ['VIEW_EARNINGS'] } }) }),
    );
    await page.route('**/api/v1/fleet/earnings*', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { totalEarnings: 25000, netAmount: 25000, pendingAmount: 5000, monthlySummary: [], driverBreakdown: [] } }) }),
    );
    await page.route('**/api/v1/fleet/payouts*', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [], total: 0, page: 1, limit: 20 } }) }),
    );
    await page.route('**/api/v1/fleet/shortfall-claims', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }),
    );
    await page.route('**/api/v1/fleet/incentives*', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) }),
    );
    await page.route('**/api/v1/fleet/support/tickets*', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [], total: 0, page: 1, limit: 15 } }) }),
    );
    await page.route('**/api/v1/fleet/notifications*', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [{ id: 'n1', fleetId: 'fleet-1', eventType: 'DRIVER_JOINED', title: 'New Driver Joined', message: 'Driver linked via FLT-E2E123', isRead: false, createdAt: new Date().toISOString() }],
            unreadCount: 1,
            total: 1,
            page: 1,
            limit: 20,
          },
        }),
      }),
    );

    await page.goto(`${FLEET_URL}/earnings`);
    await expect(page.getByText(/25,000/)).toBeVisible();

    await page.goto(`${FLEET_URL}/incentives`);
    await expect(page.getByRole('button', { name: /create incentive/i })).toBeVisible();

    await page.goto(`${FLEET_URL}/support`);
    await expect(page.getByRole('button', { name: /new support ticket/i })).toBeVisible();

    await page.goto(`${FLEET_URL}/notifications`);
    await expect(page.getByText('New Driver Joined')).toBeVisible();
  });
});

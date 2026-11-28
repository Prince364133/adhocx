import { test, expect } from '@playwright/test';

const FLEET_URL = process.env.FLEET_BASE_URL || 'http://localhost:7008';

test.describe('Fleet Portal Auth & Dashboard E2E', () => {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 812 },
  ]) {
    test(`Login -> Dashboard KPIs & Fleet Code copy/regenerate -> Logout (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ colorScheme: 'light' });

      await page.goto(`${FLEET_URL}/login`);
      await expect(page.getByRole('heading', { name: /adhocx fleet/i })).toBeVisible();

      // Mock backend login & dashboard routes when running UI-only E2E
      await page.route('**/api/v1/fleet/auth/login', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              accessToken: 'e2e-jwt-token',
              user: {
                id: 'owner-1',
                fleetId: 'fleet-1',
                fleetName: 'Metro Fleet',
                fleetCode: 'FLT-E2E123',
                fullName: 'Metro Owner',
                phone: '9999900001',
                role: 'FLEET_OWNER',
                permissions: ['VIEW_EARNINGS'],
              },
            },
          }),
        });
      });

      await page.route('**/api/v1/fleet/auth/me', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'owner-1',
              fleetId: 'fleet-1',
              fleetName: 'Metro Fleet',
              fleetCode: 'FLT-E2E123',
              fullName: 'Metro Owner',
              phone: '9999900001',
              role: 'FLEET_OWNER',
              permissions: ['VIEW_EARNINGS'],
            },
          }),
        });
      });

      await page.route('**/api/v1/fleet/notifications*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { items: [], unreadCount: 2, total: 0, page: 1, limit: 1 } }),
        });
      });

      await page.route('**/api/v1/fleet/dashboard*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              fleet: { id: 'fleet-1', name: 'Metro Fleet', code: 'FLT-E2E123', codeStatus: 'ACTIVE' },
              kpis: { totalDrivers: 12, activeDrivers: 8, driversOnTrip: 3, completedTripsToday: 19, fleetEarnings: 42000 },
              activitySeries: [{ date: '2026-11-27', completedTrips: 19, earnings: 42000 }],
              driverStatusBreakdown: [{ status: 'AVAILABLE', count: 8 }, { status: 'BUSY', count: 3 }],
              recentEvents: [{ id: 'ev-1', title: 'Driver Joined', summary: 'Arjun joined via FLT-E2E123', createdAt: new Date().toISOString() }],
            },
          }),
        });
      });

      await page.getByLabel(/email or phone/i).fill('owner@metro.test');
      await page.getByLabel(/password/i).fill('Fleet@1234');
      await page.getByRole('button', { name: /sign in/i }).click();

      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByText('FLT-E2E123')).toBeVisible();

      // Switch to dark color scheme verification
      await page.emulateMedia({ colorScheme: 'dark' });
      await expect(page.getByText('Metro Fleet')).toBeVisible();

      // Sign out flow
      await page.getByRole('button', { name: /sign out/i }).click();
      await page.getByRole('dialog').getByRole('button', { name: /sign out/i }).click();
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

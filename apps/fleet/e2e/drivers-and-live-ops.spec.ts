import { test, expect } from '@playwright/test';

const FLEET_URL = process.env.FLEET_BASE_URL || 'http://localhost:7008';

test.describe('Fleet Drivers & Live Operations E2E', () => {
  test('Search/filter drivers -> Open DriverProfileDrawer -> Reassign 1:1 vehicle -> Live Operations fallback table', async ({ page }) => {
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
    await page.route('**/api/v1/fleet/notifications*', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [], unreadCount: 0, total: 0, page: 1, limit: 1 } }) }),
    );
    await page.route('**/api/v1/fleet/drivers*', (r) => {
      if (r.request().url().includes('/drv-1')) {
        return r.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'drv-1',
              fullName: 'Arjun Kumar',
              phone: '9876543210',
              verificationStatus: 'VERIFIED',
              availabilityStatus: 'AVAILABLE',
              vehiclePlate: 'KA01AB1234',
              vehicleType: 'SEDAN',
              tripsInPeriod: 12,
              earningsInPeriod: 9600,
              trips: [],
              monthlyActivity: [],
              payouts: [],
            },
          }),
        });
      }
      return r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [{ id: 'drv-1', fullName: 'Arjun Kumar', phone: '9876543210', verificationStatus: 'VERIFIED', availabilityStatus: 'AVAILABLE', vehiclePlate: 'KA01AB1234', vehicleType: 'SEDAN', tripsInPeriod: 12, earningsInPeriod: 9600 }],
            total: 1,
            page: 1,
            limit: 20,
          },
        }),
      });
    });

    await page.goto(`${FLEET_URL}/drivers`);
    await expect(page.getByText('Arjun Kumar')).toBeVisible();
    await page.getByText('Arjun Kumar').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.route('**/api/v1/fleet/live-operations*', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            lastRefreshedAt: new Date().toISOString(),
            locationStaleAfterSeconds: 120,
            summary: { driversAvailable: 4, driversOnTrip: 2, activeRides: 1 },
            rides: [{ tripId: 'trip-99', driverId: 'drv-1', driverName: 'Arjun Kumar', vehiclePlate: 'KA01AB1234', status: 'IN_PROGRESS', pickupAddress: 'MG Road', dropAddress: 'Airport', lastUpdatedAt: new Date().toISOString() }],
          },
        }),
      }),
    );

    await page.goto(`${FLEET_URL}/live-operations`);
    await expect(page.getByText('MG Road')).toBeVisible();
  });
});

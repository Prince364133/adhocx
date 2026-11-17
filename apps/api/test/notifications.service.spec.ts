import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "../src/modules/notifications/notifications.service";
import { NotificationQueueService } from "../src/modules/notifications/notification-queue.service";
import { RedisService } from "../src/redis/redis.service";
import { DatabaseService } from "../src/database/database.service";
import { ConfigService } from "@nestjs/config";
import { DevicePlatform, NotificationType, UserRole } from "@adhocx/contracts";
import { firstValueFrom } from "rxjs";
import * as firebaseApp from "firebase-admin/app";
import * as firebaseMessaging from "firebase-admin/messaging";

describe("NotificationsService", () => {
  let service: NotificationsService;
  let queueService: NotificationQueueService;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(async () => {
    mockRedis = {
      set: jest.fn().mockResolvedValue("OK"),
      get: jest.fn().mockResolvedValue(null),
    };

    mockDb = {
      deviceToken: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: "tok-1", ...data }),
          ),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: "tok-1", ...data }),
          ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([
          {
            token: "fcm_token_123",
            platform: DevicePlatform.ANDROID,
            isActive: true,
          },
        ]),
      },
      notification: {
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: "notif-1", ...data }),
          ),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: "notif-1",
            userId: "usr-1",
            title: "Trip Confirmed",
            body: "Your driver is on the way",
            type: NotificationType.TRIP_ASSIGNED,
            data: { tripId: "trp-1" },
            isRead: false,
            createdAt: new Date(),
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      notificationPreference: {
        findUnique: jest.fn().mockResolvedValue({
          id: "pref-1",
          userId: "usr-1",
          pushEnabled: true,
          emailEnabled: true,
          smsEnabled: true,
          tripAlerts: true,
          marketingPromos: true,
        }),
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: "pref-1", ...data }),
          ),
        upsert: jest
          .fn()
          .mockImplementation(({ create, update }) =>
            Promise.resolve({ id: "pref-1", ...create, ...update }),
          ),
      },
      notificationCampaign: {
        create: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: "cmp-1", ...data }),
          ),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
      },
      notificationCampaignRecipient: {
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest
        .fn()
        .mockResolvedValue([
          {
            hasTrackingColumn: true,
            hasRecipientTable: true,
            hasRecipientDetails: true,
          },
        ]),
      $executeRaw: jest.fn().mockResolvedValue(1),
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "usr-1",
            fullName: "Test Recipient",
            phone: "+919876543210",
            deviceTokens: [
              {
                id: "device-1",
                token: "fcm_token_123",
                platform: DevicePlatform.ANDROID,
                deviceModel: "Pixel 8",
                appVersion: "1.0.0",
                isActive: true,
                lastActiveAt: new Date("2026-11-17T00:00:00.000Z"),
                createdAt: new Date("2026-11-01T00:00:00.000Z"),
                updatedAt: new Date("2026-11-17T00:00:00.000Z"),
              },
            ],
          },
        ]),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: "usr-1", phone: "+919876543210" }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        NotificationQueueService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: RedisService, useValue: mockRedis },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === "FIREBASE_PROJECT_ID") return "adhocx-507407";
              return defaultValue ?? "";
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    service["fcmInitialized"] = false;
    queueService = module.get<NotificationQueueService>(
      NotificationQueueService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
    expect(queueService).toBeDefined();
  });

  it("should emit and receive real-time SSE event on channel", async () => {
    const stream = service.getEventStream("driver:drv-1");
    const eventPromise = firstValueFrom(stream);

    service.emitEvent("driver:drv-1", "OFFER_RECEIVED", { offerId: "ofr-1" });

    const received = await eventPromise;
    expect(received.data.channel).toBe("driver:drv-1");
    expect(received.data.event).toBe("OFFER_RECEIVED");
    expect(received.data.payload).toEqual({ offerId: "ofr-1" });
  });

  it("should register a new device token", async () => {
    const result = await service.registerDeviceToken("usr-1", {
      token: "fcm_tok_abc123",
      platform: DevicePlatform.ANDROID,
      deviceModel: "Pixel 8",
      appVersion: "1.0.0",
    });

    expect(result).toBeDefined();
    expect(mockDb.deviceToken.create).toHaveBeenCalled();
  });

  it("does not report FCM success when saving an in-app notification", async () => {
    const result = await service.sendPushToUser("usr-1", {
      title: "Ride Confirmed",
      body: "Your driver is arriving in 5 mins",
      type: NotificationType.TRIP_ASSIGNED,
      data: { tripId: "trip-1" },
      saveInApp: true,
    });

    expect(result.success).toBe(false);
    expect(mockDb.notification.create).toHaveBeenCalled();
  });

  it('should estimate audience reach based on filters and device platforms', async () => {
    const estimate = await service.estimateAudience({
      role: UserRole.DRIVER,
      platform: DevicePlatform.ANDROID,
    });

    expect(estimate.matchingUsers).toBe(1);
    expect(estimate.matchingDevices).toBe(1);
    expect(estimate.platformBreakdown.android).toBe(1);
    expect(mockDb.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: UserRole.DRIVER,
          deviceTokens: expect.objectContaining({
            some: { isActive: true, platform: DevicePlatform.ANDROID },
          }),
        }),
      }),
    );
  });

  it("targets active users for the All Users audience", async () => {
    await service.estimateAudience({ role: "ALL" });

    expect(mockDb.user.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { status: "ACTIVE" } }),
    );
  });

  it("targets only drivers for the Drivers Only audience", async () => {
    await service.estimateAudience({ role: UserRole.DRIVER });

    expect(mockDb.user.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE", role: UserRole.DRIVER },
      }),
    );
  });

  it("targets only vendors for the Vendors Only audience", async () => {
    await service.estimateAudience({ role: UserRole.VENDOR });

    expect(mockDb.user.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { status: "ACTIVE", role: UserRole.VENDOR },
      }),
    );
  });

  it("matches selected user IDs or manually entered phones for Specific Users", async () => {
    await service.estimateAudience({
      role: "ALL",
      userIds: ["usr-1", "usr-2"],
      phones: ["+919876543210"],
    });

    expect(mockDb.user.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          status: "ACTIVE",
          AND: [
            {
              OR: [
                { id: { in: ["usr-1", "usr-2"] } },
                { phone: { in: ["+919876543210", "9876543210"] } },
              ],
            },
          ],
        },
      }),
    );
  });

  it('should target corporate employees when role is EMPLOYEE', async () => {
    await service.broadcastPush(
      {
        title: 'Commute Update',
        body: 'Scheduled office routes are ready',
        filter: { role: 'EMPLOYEE' as any },
      },
      'admin-1',
    );

    expect(mockDb.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: { in: [UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER] },
        }),
      }),
    );
  });

  it('should broadcast push campaign to filtered audience with platform targeting', async () => {
    const res = await service.broadcastPush(
      {
        title: 'Surge Alert',
        body: 'High demand in your area',
        filter: { role: UserRole.DRIVER, platform: DevicePlatform.ANDROID },
      },
      'admin-1',
    );

    expect(res.campaignId).toBeDefined();
    expect(mockDb.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: UserRole.DRIVER,
          deviceTokens: expect.objectContaining({
            some: { isActive: true, platform: DevicePlatform.ANDROID },
          }),
        }),
      }),
    );
  });

  it("should broadcast push campaign to filtered audience", async () => {
    const res = await service.broadcastPush(
      {
        title: "Surge Alert",
        body: "High demand in your area",
        filter: { role: UserRole.DRIVER },
      },
      "admin-1",
    );
    const progress = await service.getBroadcastProgress(res.operationId);

    expect(res.campaignId).toBe("cmp-1");
    expect(res.totalTargetedUsers).toBe(1);
    expect(mockDb.notificationCampaign.create).toHaveBeenCalled();
    const createData = mockDb.notificationCampaign.create.mock.calls[0][0].data;
    expect(createData.status).toBe("PENDING");
    expect(createData.recipientTrackingEnabled).toBe(true);
    expect(createData.recipients.createMany.skipDuplicates).toBe(true);
    expect(createData.recipients.createMany.data[0]).toMatchObject({
      userId: "usr-1",
      recipientName: "Test Recipient",
      recipientPhone: "+919876543210",
      status: "PENDING",
      deviceCount: 1,
      providerAcceptedCount: 0,
    });
    expect(res.recipientCounts).toEqual({
      sent: 1,
      delivered: 0,
      failed: 0,
      pending: 1,
    });
    expect(res.status).toBe("PENDING");
    expect(progress).toMatchObject({
      phase: "COMPLETED",
      counts: {
        targetedUsers: 1,
        targetedDevices: 1,
        providerResponses: 0,
        providerNotAttempted: 1,
        providerAccepted: 0,
        providerFailed: 0,
        awaitingProviderResponse: 0,
      },
      recipients: [
        {
          devices: [
            {
              status: "PENDING",
              providerAccepted: null,
              failureReason: expect.stringContaining(
                "FCM provider is not configured",
              ),
            },
          ],
        },
      ],
    });
  });

  it("keeps campaigns pending when matched users have no active device tokens", async () => {
    mockDb.user.findMany.mockResolvedValueOnce([
      {
        id: "usr-1",
        fullName: "Test Recipient",
        phone: "+919876543210",
        deviceTokens: [],
      },
    ]);

    const result = await service.broadcastPush(
      { title: "No tokens", body: "No active devices" },
      "admin-1",
    );
    const campaign = mockDb.notificationCampaign.create.mock.calls[0][0].data;

    expect(result.totalTargetedDevices).toBe(0);
    expect(result.successCount).toBe(0);
    expect(result.status).toBe("PENDING");
    expect(campaign.status).toBe("PENDING");
    expect(campaign.recipients.createMany.data[0]).toMatchObject({
      status: "PENDING",
      deviceCount: 0,
      providerAcceptedCount: 0,
    });
  });

  it("keeps an FCM-accepted recipient pending until device delivery is confirmed", async () => {
    type MockProviderResponse = {
      successCount: number;
      failureCount: 0;
      responses: Array<{
        success: boolean;
        messageId?: string;
      }>;
    };
    let resolveProviderResponse:
      | ((response: MockProviderResponse) => void)
      | undefined;
    const sendEachForMulticast = jest.fn(
      () =>
        new Promise<MockProviderResponse>((resolve) => {
          resolveProviderResponse = resolve;
        }),
    );
    jest
      .spyOn(firebaseApp, "getApps")
      .mockReturnValue([{ name: "[DEFAULT]" } as firebaseApp.App]);
    jest.spyOn(firebaseMessaging, "getMessaging").mockReturnValue({
      sendEachForMulticast,
    } as unknown as firebaseMessaging.Messaging);
    service["fcmInitialized"] = true;

    const operationId = "d67b2f3f-2ae1-4f13-8b5a-102b88a3c9f0";
    const pendingBroadcast = service.broadcastPush(
      { title: "Accepted", body: "Awaiting device confirmation" },
      "admin-1",
      operationId,
    );
    await new Promise<void>((resolve) => setImmediate(resolve));
    const liveProgress = await service.getBroadcastProgress(operationId);

    expect(liveProgress).toMatchObject({
      phase: "SENDING",
      counts: {
        targetedUsers: 1,
        targetedDevices: 1,
        providerResponses: 0,
        awaitingProviderResponse: 1,
      },
      recipients: [
        {
          status: "SENDING",
          devices: [
            {
              status: "SENDING",
              providerAccepted: null,
              maskedToken: "••••en_123",
            },
          ],
        },
      ],
    });
    if (!resolveProviderResponse) {
      throw new Error("The FCM request did not start");
    }
    resolveProviderResponse({
      successCount: 1,
      failureCount: 0,
      responses: [
        {
          success: true,
          messageId: "projects/test/messages/provider-message-1",
        },
      ],
    });

    const result = await pendingBroadcast;
    const recipient =
      mockDb.notificationCampaign.create.mock.calls[0][0].data.recipients
        .createMany.data[0];
    const progress = await service.getBroadcastProgress(result.operationId);

    expect(sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(recipient.status).toBe("PENDING");
    expect(recipient.providerAcceptedCount).toBe(1);
    expect(recipient.providerMessageIds).toEqual([
      "projects/test/messages/provider-message-1",
    ]);
    expect(recipient.deliveredAt).toBeUndefined();
    expect(result.recipientCounts).toEqual({
      sent: 1,
      delivered: 0,
      failed: 0,
      pending: 1,
    });
    expect(result.status).toBe("SENT");
    expect(progress).toMatchObject({
      phase: "COMPLETED",
      counts: {
        targetedUsers: 1,
        targetedDevices: 1,
        providerResponses: 1,
        providerNotAttempted: 0,
        providerAccepted: 1,
        providerFailed: 0,
        confirmedDelivered: 0,
      },
      recipients: [
        {
          userId: "usr-1",
          name: "Test Recipient",
          status: "PENDING",
          devices: [
            {
              deviceTokenId: "device-1",
              maskedToken: "••••en_123",
              status: "PENDING",
              providerAccepted: true,
              providerMessageId: "projects/test/messages/provider-message-1",
            },
          ],
        },
      ],
    });
    expect(progress.recipients[0].devices[0].maskedToken).not.toContain(
      "fcm_token_123",
    );
  });

  it("records provider rejections as failed instead of reporting success", async () => {
    const sendEachForMulticast = jest.fn().mockResolvedValue({
      successCount: 0,
      failureCount: 1,
      responses: [
        {
          success: false,
          error: {
            code: "messaging/invalid-registration-token",
            message: "Invalid registration token",
          },
        },
      ],
    });
    jest
      .spyOn(firebaseApp, "getApps")
      .mockReturnValue([{ name: "[DEFAULT]" } as firebaseApp.App]);
    jest.spyOn(firebaseMessaging, "getMessaging").mockReturnValue({
      sendEachForMulticast,
    } as unknown as firebaseMessaging.Messaging);
    service["fcmInitialized"] = true;

    const result = await service.broadcastPush(
      { title: "Rejected", body: "Provider rejection" },
      "admin-1",
    );
    const campaign = mockDb.notificationCampaign.create.mock.calls[0][0].data;
    const recipient = campaign.recipients.createMany.data[0];

    expect(sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(campaign.status).toBe("FAILED");
    expect(recipient.status).toBe("FAILED");
    expect(recipient.failureReason).toContain(
      "messaging/invalid-registration-token",
    );
    expect(result.successCount).toBe(0);
    expect(result.status).toBe("FAILED");
  });

  it("records partial provider acceptance accurately", async () => {
    mockDb.user.findMany.mockResolvedValueOnce([
      {
        id: "usr-1",
        fullName: "Test Recipient",
        phone: "+919876543210",
        deviceTokens: [
          {
            id: "device-1",
            token: "fcm_token_1",
            platform: DevicePlatform.ANDROID,
            deviceModel: "Pixel 8",
            appVersion: "1.0.0",
            isActive: true,
            createdAt: new Date("2026-11-01T00:00:00.000Z"),
            updatedAt: new Date("2026-11-17T00:00:00.000Z"),
          },
          {
            id: "device-2",
            token: "fcm_token_2",
            platform: DevicePlatform.ANDROID,
            deviceModel: "Pixel 8",
            appVersion: "1.0.0",
            isActive: true,
            createdAt: new Date("2026-11-01T00:00:00.000Z"),
            updatedAt: new Date("2026-11-17T00:00:00.000Z"),
          },
        ],
      },
    ]);
    const sendEachForMulticast = jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: true, messageId: "provider-message-1" },
        {
          success: false,
          error: {
            code: "messaging/invalid-argument",
            message: "Invalid token",
          },
        },
      ],
    });
    jest
      .spyOn(firebaseApp, "getApps")
      .mockReturnValue([{ name: "[DEFAULT]" } as firebaseApp.App]);
    jest.spyOn(firebaseMessaging, "getMessaging").mockReturnValue({
      sendEachForMulticast,
    } as unknown as firebaseMessaging.Messaging);
    service["fcmInitialized"] = true;

    const result = await service.broadcastPush(
      { title: "Partial", body: "Partial provider response" },
      "admin-1",
    );
    const campaign = mockDb.notificationCampaign.create.mock.calls[0][0].data;
    const recipient = campaign.recipients.createMany.data[0];

    expect(campaign.status).toBe("PARTIAL");
    expect(recipient.status).toBe("PENDING");
    expect(recipient.providerAcceptedCount).toBe(1);
    expect(recipient.providerFailedCount).toBe(1);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
    expect(result.status).toBe("PARTIAL");
  });

  it("stores the provider failure reason and marks a fully failed recipient failed", async () => {
    const sendEachForMulticast = jest.fn().mockResolvedValue({
      successCount: 0,
      failureCount: 1,
      responses: [
        {
          success: false,
          error: {
            code: "messaging/invalid-registration-token",
            message: "Requested entity was not found.",
          },
        },
      ],
    });
    jest
      .spyOn(firebaseApp, "getApps")
      .mockReturnValue([{ name: "[DEFAULT]" } as firebaseApp.App]);
    jest.spyOn(firebaseMessaging, "getMessaging").mockReturnValue({
      sendEachForMulticast,
    } as unknown as firebaseMessaging.Messaging);
    service["fcmInitialized"] = true;

    const result = await service.broadcastPush(
      { title: "Rejected", body: "Provider failure" },
      "admin-1",
    );
    const recipient =
      mockDb.notificationCampaign.create.mock.calls[0][0].data.recipients
        .createMany.data[0];

    expect(recipient.status).toBe("FAILED");
    expect(recipient.failureReason).toBe(
      "messaging/invalid-registration-token: Requested entity was not found.",
    );
    expect(recipient.failedAt).toBeInstanceOf(Date);
    expect(result.recipientCounts).toEqual({
      sent: 1,
      delivered: 0,
      failed: 1,
      pending: 0,
    });
  });

  it("returns recipient details and counts for an existing campaign", async () => {
    const now = new Date();
    mockDb.notificationCampaign.findUnique.mockResolvedValue({
      id: "cmp-1",
      recipientTrackingEnabled: true,
    });
    mockDb.notificationCampaignRecipient.findMany.mockResolvedValue([
      {
        id: "recipient-1",
        userId: "usr-1",
        recipientName: "Test Recipient",
        recipientPhone: "+919876543210",
        status: "FAILED",
        deviceCount: 1,
        providerAcceptedCount: 0,
        providerFailedCount: 1,
        attemptedAt: now,
        deliveredAt: null,
        failedAt: now,
        failureReason: "Provider rejection",
        createdAt: now,
      },
    ]);

    const result = await service.getCampaignRecipients("cmp-1");

    expect(result.counts).toEqual({
      sent: 1,
      delivered: 0,
      failed: 1,
      pending: 0,
    });
    expect(result.recipients[0]).toMatchObject({
      userId: "usr-1",
      name: "Test Recipient",
      phone: "+919876543210",
      status: "FAILED",
      failureReason: "Provider rejection",
    });
  });

  it("uses recipient statuses rather than FCM acceptance counts in campaign history", async () => {
    mockDb.notificationCampaign.findMany.mockResolvedValue([
      {
        id: "cmp-1",
        title: "Delivery check",
        body: "Test",
        imageUrl: null,
        actionUrl: null,
        targetRole: "ALL",
        targetFilter: null,
        totalTargeted: 4,
        successCount: 3,
        failureCount: 1,
        status: "SENT",
        sentBy: "admin-1",
        recipientTrackingEnabled: true,
        createdAt: new Date(),
      },
    ]);
    mockDb.notificationCampaignRecipient.groupBy.mockResolvedValue([
      { campaignId: "cmp-1", status: "PENDING", _count: { _all: 3 } },
      { campaignId: "cmp-1", status: "FAILED", _count: { _all: 1 } },
    ]);

    const result = await service.getCampaigns();

    expect(result.campaigns[0].recipientCounts).toEqual({
      sent: 4,
      delivered: 0,
      failed: 1,
      pending: 3,
    });
  });

  it("loads existing campaign history when recipient tracking schema is absent", async () => {
    const createdAt = new Date("2026-11-17T09:15:00.000Z");
    mockDb.$queryRaw
      .mockResolvedValueOnce([
        {
          hasTrackingColumn: false,
          hasRecipientTable: false,
          hasRecipientDetails: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "cmp-legacy",
          title: "Existing campaign",
          body: "Previously sent message",
          imageUrl: null,
          actionUrl: null,
          targetRole: "DRIVER",
          targetFilter: null,
          totalTargeted: 4,
          successCount: 3,
          failureCount: 1,
          status: "SENT",
          sentBy: "admin-1",
          createdAt,
        },
      ])
      .mockResolvedValueOnce([{ total: 1 }]);

    const result = await service.getCampaigns({ page: 1, limit: 100 });

    expect(result).toMatchObject({
      total: 1,
      campaigns: [
        {
          id: "cmp-legacy",
          title: "Existing campaign",
          targetRole: "DRIVER",
          totalTargeted: 4,
          successCount: 3,
          failureCount: 1,
          status: "SENT",
          recipientTrackingEnabled: false,
          createdAt: createdAt.toISOString(),
        },
      ],
    });
    expect(mockDb.notificationCampaign.findMany).not.toHaveBeenCalled();
  });

  it("persists broadcasts to the legacy campaign schema without claiming delivery", async () => {
    mockDb.$queryRaw
      .mockResolvedValueOnce([
        {
          hasTrackingColumn: false,
          hasRecipientTable: false,
          hasRecipientDetails: false,
        },
      ])
      .mockResolvedValueOnce([{ id: "cmp-legacy", status: "PENDING" }]);

    const result = await service.broadcastPush(
      { title: "Legacy campaign", body: "Schema-compatible save" },
      "admin-1",
    );

    const insertQuery = mockDb.$queryRaw.mock.calls[1][0].join("");
    expect(insertQuery).toContain("INSERT INTO notification_campaigns");
    expect(insertQuery).not.toContain("recipient_tracking_enabled");
    expect(mockDb.notificationCampaign.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      campaignId: "cmp-legacy",
      status: "PENDING",
    });
  });

  it("builds legacy delivery metrics from provider responses without inventing deliveries", async () => {
    mockDb.notificationCampaign.count.mockResolvedValue(5);
    mockDb.$queryRaw
      .mockResolvedValueOnce([
        {
          hasTrackingColumn: false,
          hasRecipientTable: false,
          hasRecipientDetails: false,
        },
      ])
      .mockResolvedValueOnce([{ successCount: 8, failureCount: 2 }]);

    const result = await service.getMetrics();

    expect(result).toMatchObject({
      totalSent: 10,
      totalDelivered: 0,
      totalFailed: 2,
      totalPending: 8,
      totalCampaigns: 5,
      deliverySuccessRate: 0,
    });
    expect(mockDb.notificationCampaignRecipient.groupBy).not.toHaveBeenCalled();
  });

  it("shows a just-sent campaign in history using persisted recipient results", async () => {
    const storedCampaigns: any[] = [];
    mockDb.notificationCampaign.create.mockImplementation(
      ({ data }: { data: Record<string, any> }) => {
        const campaign = {
          id: "cmp-send-history",
          createdAt: new Date(),
          ...data,
        };
        storedCampaigns.unshift(campaign);
        return Promise.resolve(campaign);
      },
    );
    mockDb.notificationCampaign.findMany.mockImplementation(
      ({ skip, take }: { skip: number; take: number }) =>
        Promise.resolve(storedCampaigns.slice(skip, skip + take)),
    );
    mockDb.notificationCampaign.count.mockImplementation(() =>
      Promise.resolve(storedCampaigns.length),
    );
    mockDb.notificationCampaignRecipient.groupBy.mockResolvedValue([
      {
        campaignId: "cmp-send-history",
        status: "PENDING",
        _count: { _all: 1 },
      },
    ]);
    const sendEachForMulticast = jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true, messageId: "provider-message-history" }],
    });
    jest
      .spyOn(firebaseApp, "getApps")
      .mockReturnValue([{ name: "[DEFAULT]" } as firebaseApp.App]);
    jest.spyOn(firebaseMessaging, "getMessaging").mockReturnValue({
      sendEachForMulticast,
    } as unknown as firebaseMessaging.Messaging);
    service["fcmInitialized"] = true;

    const sent = await service.broadcastPush(
      { title: "Fresh campaign", body: "Appears in history" },
      "admin-1",
    );
    const history = await service.getCampaigns({ page: 1, limit: 100 });

    expect(sent.campaignId).toBe("cmp-send-history");
    expect(history.total).toBe(1);
    expect(history.campaigns[0]).toMatchObject({
      id: "cmp-send-history",
      title: "Fresh campaign",
      recipientTrackingEnabled: true,
      recipientCounts: {
        sent: 1,
        delivered: 0,
        failed: 0,
        pending: 1,
      },
    });
  });

  it("reports delivery metrics from confirmed recipient statuses only", async () => {
    mockDb.notificationCampaign.count.mockResolvedValue(1);
    mockDb.notificationCampaignRecipient.groupBy.mockResolvedValue([
      { status: "PENDING", _count: { _all: 2 } },
      { status: "FAILED", _count: { _all: 1 } },
    ]);

    const result = await service.getMetrics();

    expect(result).toMatchObject({
      totalSent: 3,
      totalDelivered: 0,
      totalFailed: 1,
      totalPending: 2,
    });
  });

  it("should retrieve in-app notifications and mark as read", async () => {
    const feed = await service.getUserNotifications("usr-1");
    expect(feed.notifications.length).toBe(1);
    expect(feed.unreadCount).toBe(1);

    const markRes = await service.markAsRead("usr-1", "notif-1");
    expect(markRes.success).toBe(true);
    expect(mockDb.notification.updateMany).toHaveBeenCalled();
  });

  it("should manage user notification delivery preferences", async () => {
    const pref = await service.getPreferences("usr-1");
    expect(pref.pushEnabled).toBe(true);

    const updated = await service.updatePreferences("usr-1", {
      marketingPromos: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
    });
    expect(updated).toBeDefined();
    expect(mockDb.notificationPreference.upsert).toHaveBeenCalled();
  });

  it("should track notification interaction clicks and CTR", async () => {
    const result = await service.trackInteraction("usr-1", "notif-1");
    expect(result.success).toBe(true);
    expect(mockDb.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isClicked: true }),
      }),
    );
  });

  it("should sanitize unsafe HTML text and deduplicate idempotent keys", async () => {
    const dirty = '<script>alert("hack")</script>Hello <b>World</b>';
    const clean = queueService.sanitizeText(dirty);
    expect(clean).not.toContain("<script>");

    const key = "trip_offer_123_drv1";
    const isFirstDupe = await queueService.isDuplicate(key, 60);
    expect(isFirstDupe).toBe(false);
  });

  it("should delete a single in-app notification and clear all notifications for a user", async () => {
    const uuid = "11111111-1111-1111-1111-111111111111";
    mockDb.notification.count.mockResolvedValueOnce(2);
    const delRes = await service.deleteNotification("usr-1", uuid);
    expect(delRes.success).toBe(true);
    expect(delRes.deletedCount).toBe(1);
    expect(delRes.unreadCount).toBe(2);
    expect(mockDb.notification.deleteMany).toHaveBeenCalledWith({
      where: { id: uuid, userId: "usr-1" },
    });

    mockDb.notification.deleteMany.mockResolvedValueOnce({ count: 5 });
    const clearRes = await service.clearAllNotifications("usr-1");
    expect(clearRes.success).toBe(true);
    expect(clearRes.deletedCount).toBe(5);
    expect(clearRes.unreadCount).toBe(0);
    expect(mockDb.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: "usr-1" },
    });
  });
});

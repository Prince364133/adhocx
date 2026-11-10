'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Send,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Radio,
  Users,
  Car,
  Building2,
  RefreshCw,
  Search,
  Eye,
  Check,
  X,
  Layers,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  Clock,
  Calendar,
  Filter,
} from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import {
  NotificationCampaignItem,
  NotificationMetrics,
  AudienceFilter,
  BroadcastPushPayload,
  TestPushPayload,
  AudienceEstimateResult,
} from '../../lib/api/types';
import { PageHeader, MetricCard, Button, StatusBadge, DataTable, Card } from '../../components/common';
import { Modal } from '../../components/Modal';

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Metrics
  const [metrics, setMetrics] = useState<NotificationMetrics>({
    totalDelivered: 0,
    totalCampaigns: 0,
    activeDevicesCount: 0,
    devicesByPlatform: { android: 0, ios: 0, web: 0 },
    deliverySuccessRate: 0,
    inAppNotificationsCount: 0,
  });

  // Campaigns list
  const [campaigns, setCampaigns] = useState<NotificationCampaignItem[]>([]);
  const [campaignPage, setCampaignPage] = useState(1);
  const [totalCampaignsCount, setTotalCampaignsCount] = useState(0);

  // Create Notification Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Audience Selection State ('ALL' | 'DRIVER' | 'VENDOR')
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'DRIVER' | 'VENDOR'>('ALL');
  const [specificPhone, setSpecificPhone] = useState('');

  // Live Audience Estimate
  const [audienceEstimate, setAudienceEstimate] = useState<AudienceEstimateResult>({
    matchingUsers: 0,
    matchingDevices: 0,
    platformBreakdown: { android: 0, ios: 0, web: 0 },
  });

  // Campaign History Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELIVERED' | 'SENT' | 'FAILED'>('ALL');
  const [audienceFilter, setAudienceFilter] = useState<'ALL' | 'ALL_USERS' | 'DRIVER' | 'VENDOR'>('ALL');

  // Modals
  const [isConfirmBroadcastOpen, setIsConfirmBroadcastOpen] = useState(false);
  const [isTestPushOpen, setIsTestPushOpen] = useState(false);
  const [testPhoneOrToken, setTestPhoneOrToken] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [testBody, setTestBody] = useState('');
  const [testImageUrl, setTestImageUrl] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<NotificationCampaignItem | null>(null);

  // Load initial metrics & campaign history
  useEffect(() => {
    loadData();
  }, [campaignPage]);

  // Re-estimate audience reach when audience parameters change
  useEffect(() => {
    const timer = setTimeout(() => {
      recomputeEstimate();
    }, 350);
    return () => clearTimeout(timer);
  }, [targetAudience, specificPhone]);

  async function loadData() {
    setLoading(true);
    try {
      const [metricData, campaignData] = await Promise.all([
        adminApi.getNotificationMetrics().catch(() => ({
          totalDelivered: 0,
          totalCampaigns: 0,
          activeDevicesCount: 0,
          devicesByPlatform: { android: 0, ios: 0, web: 0 },
          deliverySuccessRate: 0,
          inAppNotificationsCount: 0,
        })),
        adminApi.getNotificationCampaigns(campaignPage, 25).catch(() => ({
          campaigns: [],
          total: 0,
        })),
      ]);
      setMetrics(metricData);
      setCampaigns(campaignData.campaigns || []);
      setTotalCampaignsCount(campaignData.total || 0);
    } finally {
      setLoading(false);
    }
  }

  async function recomputeEstimate() {
    setEstimating(true);
    try {
      const filter: AudienceFilter = {
        role: targetAudience,
        phones: specificPhone.trim() ? [specificPhone.trim()] : undefined,
      };
      const res = await adminApi.estimateNotificationAudience(filter).catch(() => null);
      if (res && typeof res.matchingUsers === 'number') {
        setAudienceEstimate(res);
      }
    } finally {
      setEstimating(false);
    }
  }

  // Summary Overview calculations
  const overviewStats = useMemo(() => {
    const campaignTotalSent = campaigns.reduce(
      (acc, c) => acc + (c.totalTargeted || (c.successCount + c.failureCount) || 0),
      0,
    );
    const campaignSuccess = campaigns.reduce((acc, c) => acc + (c.successCount || 0), 0);
    const campaignFailed = campaigns.reduce((acc, c) => acc + (c.failureCount || 0), 0);

    const totalSent = Math.max(metrics.totalDelivered + campaignFailed, campaignTotalSent);
    const totalDelivered = Math.max(metrics.totalDelivered, campaignSuccess);
    const totalFailed = campaignFailed;
    const totalCampaigns = Math.max(metrics.totalCampaigns || 0, campaigns.length, totalCampaignsCount);

    return {
      totalSent,
      totalDelivered,
      totalFailed,
      totalCampaigns,
    };
  }, [campaigns, metrics, totalCampaignsCount]);

  // Handle Broadcast Dispatch
  async function handleBroadcastPush() {
    if (!title.trim() || !body.trim()) {
      setAlert({
        type: 'error',
        message: 'Please provide both Notification Title and Notification Message before broadcasting.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload: BroadcastPushPayload = {
        title: title.trim(),
        body: body.trim(),
        imageUrl: imageUrl.trim() || undefined,
        filter: {
          role: targetAudience,
          phones: specificPhone.trim() ? [specificPhone.trim()] : undefined,
        },
      };

      const res = await adminApi.broadcastPushNotification(payload);
      setAlert({
        type: 'success',
        message: `Notification broadcast sent successfully! Targeted ${
          res.totalTargetedUsers || audienceEstimate.matchingUsers || 1
        } user(s) across ${res.totalTargetedDevices || audienceEstimate.matchingDevices || 1} active device(s).`,
      });

      // Clear form and reload data
      setTitle('');
      setBody('');
      setImageUrl('');
      setSpecificPhone('');
      setIsConfirmBroadcastOpen(false);
      loadData();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Failed to dispatch broadcast push notification. Please check FCM credentials.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Open Test Push Modal
  function openTestPushModal() {
    setTestTitle(title.trim() || 'AdhocX Test Notification');
    setTestBody(body.trim() || 'This is a live test notification from AdhocX Admin Portal.');
    setTestImageUrl(imageUrl.trim());
    setIsTestPushOpen(true);
  }

  // Handle Send Test Push
  async function handleSendTestPush() {
    if (!testPhoneOrToken.trim()) {
      setAlert({
        type: 'error',
        message: 'Please enter a target phone number or FCM registration token to send the test push.',
      });
      return;
    }

    setSendingTest(true);
    try {
      const isToken = testPhoneOrToken.length > 25;
      const payload: TestPushPayload = {
        title: testTitle.trim() || 'AdhocX Test Notification',
        body: testBody.trim() || 'This is a live test notification from AdhocX Admin Portal.',
        imageUrl: testImageUrl.trim() || undefined,
        targetToken: isToken ? testPhoneOrToken.trim() : undefined,
        targetPhone: !isToken ? testPhoneOrToken.trim() : undefined,
        data: { test: 'true', sentAt: new Date().toISOString() },
      };

      const res = await adminApi.sendTestPushNotification(payload);
      if (res && res.totalTokens === 0) {
        setAlert({
          type: 'success',
          message: `Target user identified! In-app notification added to feed (no active FCM device token was registered for this user yet).`,
        });
      } else {
        setAlert({
          type: 'success',
          message: `Test push sent successfully to ${testPhoneOrToken}! Delivered to ${
            (res as any)?.successCount ?? 1
          } device(s).`,
        });
      }
      setIsTestPushOpen(false);
      loadData();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err.message || 'Failed to send test push notification. Verify phone or device token.',
      });
    } finally {
      setSendingTest(false);
    }
  }

  // Filtered campaigns for history table
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = c.title?.toLowerCase().includes(q);
        const matchesBody = c.body?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesBody) return false;
      }

      // Delivery Status filter
      if (statusFilter !== 'ALL') {
        const isDelivered = c.status === 'DELIVERED' || (c.status === 'SENT' && c.failureCount === 0);
        const isFailed = c.status === 'FAILED' || (c.totalTargeted > 0 && c.successCount === 0 && c.failureCount > 0);
        const isSent = c.status === 'SENT' || c.status === 'PROCESSING' || c.status === 'SCHEDULED';

        if (statusFilter === 'DELIVERED' && !isDelivered) return false;
        if (statusFilter === 'FAILED' && !isFailed) return false;
        if (statusFilter === 'SENT' && (!isSent || isDelivered)) return false;
      }

      // Target Audience filter
      if (audienceFilter !== 'ALL') {
        const role = (c.targetRole || c.targetFilter?.role || 'ALL').toUpperCase();
        if (audienceFilter === 'ALL_USERS' && role !== 'ALL') return false;
        if (audienceFilter === 'DRIVER' && role !== 'DRIVER') return false;
        if (audienceFilter === 'VENDOR' && role !== 'VENDOR') return false;
      }

      return true;
    });
  }, [campaigns, searchQuery, statusFilter, audienceFilter]);

  // Helper to format Date
  function formatDate(isoString?: string) {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  }

  // Audience helper badge
  function renderAudienceBadge(c: NotificationCampaignItem) {
    const phones = c.targetFilter?.phones;
    if (phones && phones.length > 0) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.6rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(217, 119, 6, 0.12)',
            color: '#b45309',
            border: '1px solid rgba(217, 119, 6, 0.25)',
          }}
        >
          <Smartphone size={12} />
          {phones[0]}
        </span>
      );
    }

    const role = (c.targetRole || c.targetFilter?.role || 'ALL').toUpperCase();
    if (role === 'DRIVER') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(22, 163, 74, 0.12)',
            color: '#15803d',
            border: '1px solid rgba(22, 163, 74, 0.25)',
          }}
        >
          <Car size={12} />
          Drivers Only
        </span>
      );
    }
    if (role === 'VENDOR') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.65rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(87, 40, 178, 0.12)',
            color: '#5728b2',
            border: '1px solid rgba(87, 40, 178, 0.25)',
          }}
        >
          <Building2 size={12} />
          Vendors Only
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.65rem',
          borderRadius: 'var(--radius-pill)',
          fontSize: '0.75rem',
          fontWeight: 600,
          background: 'rgba(37, 99, 235, 0.12)',
          color: '#1d4ed8',
          border: '1px solid rgba(37, 99, 235, 0.25)',
        }}
      >
        <Users size={12} />
        All Users
      </span>
    );
  }

  // Delivery Status badge helper
  function renderStatusBadge(c: NotificationCampaignItem) {
    const isFailed = c.status === 'FAILED' || (c.totalTargeted > 0 && c.successCount === 0 && c.failureCount > 0);
    const isDelivered = c.status === 'DELIVERED' || (c.status === 'SENT' && c.failureCount === 0);
    const hasPartialFailure = c.failureCount > 0 && c.successCount > 0;

    if (isFailed) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.65rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(220, 38, 38, 0.12)',
            color: '#dc2626',
            border: '1px solid rgba(220, 38, 38, 0.25)',
          }}
        >
          <XCircle size={13} />
          Failed
        </span>
      );
    }

    if (hasPartialFailure) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.65rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(217, 119, 6, 0.12)',
            color: '#b45309',
            border: '1px solid rgba(217, 119, 6, 0.25)',
          }}
        >
          <AlertTriangle size={13} />
          Sent ({c.successCount}/{c.totalTargeted})
        </span>
      );
    }

    if (isDelivered || c.successCount > 0) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.65rem',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(22, 163, 74, 0.12)',
            color: '#15803d',
            border: '1px solid rgba(22, 163, 74, 0.25)',
          }}
        >
          <CheckCircle2 size={13} />
          Delivered
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.3rem 0.65rem',
          borderRadius: 'var(--radius-pill)',
          fontSize: '0.75rem',
          fontWeight: 700,
          background: 'rgba(37, 99, 235, 0.12)',
          color: '#2563eb',
          border: '1px solid rgba(37, 99, 235, 0.25)',
        }}
      >
        <Send size={13} />
        Sent
      </span>
    );
  }

  return (
    <div
      style={{
        padding: '1.75rem 2rem 3rem 2rem',
        maxWidth: '1600px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
        color: 'var(--text-primary)',
      }}
    >
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <PageHeader
        title="Push Notifications & Campaign Studio"
        subtitle="Compose and broadcast Firebase Cloud Messaging (FCM) notifications to drivers, vendors, and marketplace users."
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Smartphone size={16} />}
              onClick={openTestPushModal}
              title="Send a quick test push notification"
            >
              Send Test Notification
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw size={15} className={loading ? 'animate-spin' : ''} />}
              onClick={loadData}
              disabled={loading}
              title="Refresh campaigns and delivery telemetry"
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* ─── Alert Banner ────────────────────────────────────────────── */}
      {alert && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            background:
              alert.type === 'success' ? 'var(--color-success-bg, rgba(22, 163, 74, 0.1))' : 'var(--color-danger-bg, rgba(220, 38, 38, 0.1))',
            border: `1px solid ${
              alert.type === 'success'
                ? 'var(--color-success-border, rgba(22, 163, 74, 0.3))'
                : 'var(--color-danger-border, rgba(220, 38, 38, 0.3))'
            }`,
            color: alert.type === 'success' ? '#15803d' : '#b91c1c',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{alert.message}</span>
          </div>
          <button
            onClick={() => setAlert(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ─── 1. CAMPAIGN OVERVIEW (Top 4 Summary Cards) ──────────────── */}
      <section>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* Card 1: Total Notifications Sent */}
          <MetricCard
            label="TOTAL NOTIFICATIONS SENT"
            value={overviewStats.totalSent.toLocaleString()}
            subtext="Total push notifications dispatched"
            accentColor="#2563eb"
            icon={<Send size={22} color="#2563eb" />}
          />

          {/* Card 2: Successful Deliveries */}
          <MetricCard
            label="SUCCESSFUL DELIVERIES"
            value={overviewStats.totalDelivered.toLocaleString()}
            subtext="Successfully delivered to devices"
            accentColor="#16a34a"
            icon={<CheckCircle2 size={22} color="#16a34a" />}
          />

          {/* Card 3: Failed Notifications */}
          <MetricCard
            label="FAILED NOTIFICATIONS"
            value={overviewStats.totalFailed.toLocaleString()}
            subtext="Invalid tokens or delivery errors"
            accentColor="#dc2626"
            icon={<AlertTriangle size={22} color="#dc2626" />}
          />

          {/* Card 4: Total Campaigns */}
          <MetricCard
            label="TOTAL CAMPAIGNS"
            value={overviewStats.totalCampaigns.toLocaleString()}
            subtext="Broadcast & targeted campaigns"
            accentColor="#5728b2"
            icon={<Layers size={22} color="#5728b2" />}
          />
        </div>
      </section>

      {/* ─── 2 & 3. CREATE NOTIFICATION & AUDIENCE SELECTION ─────────── */}
      <section>
        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Create Notification
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                Compose announcement copy, configure audience targeting, and broadcast via Firebase Cloud Messaging.
              </p>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8125rem',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-pill)',
                background: 'rgba(87, 40, 178, 0.08)',
                color: 'var(--brand-primary, #5728b2)',
                fontWeight: 600,
                border: '1px solid rgba(87, 40, 178, 0.2)',
              }}
            >
              <Users size={14} />
              <span>
                {estimating
                  ? 'Calculating audience reach...'
                  : specificPhone.trim()
                  ? `Targeting 1 Specific User (${specificPhone.trim()})`
                  : `Estimated Reach: ${audienceEstimate.matchingUsers} users (${audienceEstimate.matchingDevices} active devices)`}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingTop: '0.5rem' }}>
            {/* 3. AUDIENCE SELECTION */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-secondary)',
                  marginBottom: '0.75rem',
                }}
              >
                Target Audience Selection
              </label>

              {/* 3 Main Audience Options */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                {/* Option 1: All Users */}
                <div
                  onClick={() => setTargetAudience('ALL')}
                  style={{
                    padding: '1.1rem 1.25rem',
                    borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${
                      targetAudience === 'ALL' ? 'var(--brand-primary, #5728b2)' : 'var(--border-subtle, #e2e8f0)'
                    }`,
                    background:
                      targetAudience === 'ALL'
                        ? 'rgba(87, 40, 178, 0.04)'
                        : 'var(--bg-card, #ffffff)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: targetAudience === 'ALL' ? 'var(--brand-primary, #5728b2)' : '#f1f5f9',
                      color: targetAudience === 'ALL' ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Users size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        All Users
                      </span>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: `2px solid ${
                            targetAudience === 'ALL' ? 'var(--brand-primary, #5728b2)' : '#cbd5e1'
                          }`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {targetAudience === 'ALL' && (
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: 'var(--brand-primary, #5728b2)',
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <p
                      style={{
                        margin: '0.35rem 0 0 0',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.4,
                      }}
                    >
                      Broadcast notification across all drivers, vendors, and marketplace clients.
                    </p>
                  </div>
                </div>

                {/* Option 2: Drivers Only */}
                <div
                  onClick={() => setTargetAudience('DRIVER')}
                  style={{
                    padding: '1.1rem 1.25rem',
                    borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${
                      targetAudience === 'DRIVER' ? 'var(--brand-primary, #5728b2)' : 'var(--border-subtle, #e2e8f0)'
                    }`,
                    background:
                      targetAudience === 'DRIVER'
                        ? 'rgba(87, 40, 178, 0.04)'
                        : 'var(--bg-card, #ffffff)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: targetAudience === 'DRIVER' ? 'var(--brand-primary, #5728b2)' : '#f1f5f9',
                      color: targetAudience === 'DRIVER' ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Car size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        Drivers Only
                      </span>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: `2px solid ${
                            targetAudience === 'DRIVER' ? 'var(--brand-primary, #5728b2)' : '#cbd5e1'
                          }`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {targetAudience === 'DRIVER' && (
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: 'var(--brand-primary, #5728b2)',
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <p
                      style={{
                        margin: '0.35rem 0 0 0',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.4,
                      }}
                    >
                      Target registered driver fleet for trip alerts, incentive bonuses, and updates.
                    </p>
                  </div>
                </div>

                {/* Option 3: Vendors Only */}
                <div
                  onClick={() => setTargetAudience('VENDOR')}
                  style={{
                    padding: '1.1rem 1.25rem',
                    borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${
                      targetAudience === 'VENDOR' ? 'var(--brand-primary, #5728b2)' : 'var(--border-subtle, #e2e8f0)'
                    }`,
                    background:
                      targetAudience === 'VENDOR'
                        ? 'rgba(87, 40, 178, 0.04)'
                        : 'var(--bg-card, #ffffff)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: targetAudience === 'VENDOR' ? 'var(--brand-primary, #5728b2)' : '#f1f5f9',
                      color: targetAudience === 'VENDOR' ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Building2 size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        Vendors Only
                      </span>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: `2px solid ${
                            targetAudience === 'VENDOR' ? 'var(--brand-primary, #5728b2)' : '#cbd5e1'
                          }`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {targetAudience === 'VENDOR' && (
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: 'var(--brand-primary, #5728b2)',
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <p
                      style={{
                        margin: '0.35rem 0 0 0',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.4,
                      }}
                    >
                      Target registered business partners and transport vendors for compliance.
                    </p>
                  </div>
                </div>
              </div>

              {/* Specific User Target (Optional) */}
              <div
                style={{
                  background: 'var(--bg-card-elevated, #f8fafc)',
                  border: '1px dashed var(--border, #cbd5e1)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1.15rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <Smartphone size={16} color="var(--text-secondary)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Target Specific User (Optional):
                  </span>
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Enter phone number (e.g. +91 98765 43210) to deliver only to this user"
                    value={specificPhone}
                    onChange={(e) => setSpecificPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 2rem 0.45rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle, #cbd5e1)',
                      fontSize: '0.85rem',
                      background: 'var(--bg-card, #ffffff)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                  {specificPhone && (
                    <button
                      onClick={() => setSpecificPhone('')}
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: '0.2rem',
                      }}
                      title="Clear specific user"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {specificPhone.trim() && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#b45309',
                      background: 'rgba(217, 119, 6, 0.1)',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      flexShrink: 0,
                    }}
                  >
                    Direct Push Mode
                  </span>
                )}
              </div>
            </div>

            {/* 2. NOTIFICATION CONTENT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-secondary)',
                }}
              >
                Notification Message Details
              </label>

              {/* Notification Title */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.4rem',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Notification Title <span style={{ color: '#dc2626' }}>*</span>
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{title.length} / 65</span>
                </div>
                <input
                  type="text"
                  maxLength={65}
                  placeholder="e.g. 🚗 Special Weekend Surge Bonus or Route Announcement"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
                    fontSize: '0.925rem',
                    background: 'var(--bg-card, #ffffff)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
                  }}
                />
              </div>

              {/* Notification Message */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.4rem',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Notification Message <span style={{ color: '#dc2626' }}>*</span>
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{body.length} / 240</span>
                </div>
                <textarea
                  rows={4}
                  maxLength={240}
                  placeholder="Write clear, engaging notification copy describing the announcement, opportunity, or system alert..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
                    fontSize: '0.925rem',
                    background: 'var(--bg-card, #ffffff)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.5,
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
                  }}
                />
              </div>

              {/* Optional Image URL */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.4rem',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Optional Image URL
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Displays banner image on compatible Android & iOS push alerts
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="url"
                    placeholder="https://example.com/banner-image.jpg (Optional)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.7rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle, #cbd5e1)',
                      fontSize: '0.9rem',
                      background: 'var(--bg-card, #ffffff)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                  {imageUrl.trim() && (
                    <button
                      onClick={() => setImageUrl('')}
                      style={{
                        padding: '0.7rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle, #cbd5e1)',
                        background: '#f8fafc',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      Remove Image
                    </button>
                  )}
                </div>

                {/* Inline Image Preview */}
                {imageUrl.trim() && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      background: '#f8fafc',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle, #cbd5e1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt="Banner Preview"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      style={{
                        height: '60px',
                        width: '110px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                      }}
                    />
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Banner Image Attached:</span>
                      <p style={{ margin: '0.2rem 0 0 0', wordBreak: 'break-all', color: 'var(--text-muted)' }}>
                        {imageUrl}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── ACTION BUTTONS BAR ───────────────────────────────── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-subtle, #e2e8f0)',
              }}
            >
              {/* Send Test Notification Button */}
              <Button
                variant="outline"
                size="md"
                leftIcon={<Smartphone size={16} />}
                onClick={openTestPushModal}
              >
                Send Test Notification
              </Button>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setTitle('');
                    setBody('');
                    setImageUrl('');
                    setSpecificPhone('');
                  }}
                  disabled={!title && !body && !imageUrl && !specificPhone}
                >
                  Clear Form
                </Button>

                {/* Send / Broadcast Notification button */}
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Send size={16} />}
                  onClick={() => setIsConfirmBroadcastOpen(true)}
                  disabled={!title.trim() || !body.trim() || submitting}
                  loading={submitting}
                >
                  Send / Broadcast Notification
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* ─── 4 & 5. CAMPAIGN HISTORY & NOTIFICATION STATUS ───────────── */}
      <section>
        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Campaign History
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
                Simple overview of dispatched push notifications, recipient counts, and delivery statuses.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Search input */}
              <div style={{ position: 'relative', width: '240px' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
                    fontSize: '0.825rem',
                    background: 'var(--bg-card, #ffffff)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle, #cbd5e1)',
                  fontSize: '0.825rem',
                  background: 'var(--bg-card, #ffffff)',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="ALL">All Delivery Statuses</option>
                <option value="DELIVERED">Delivered</option>
                <option value="SENT">Sent</option>
                <option value="FAILED">Failed</option>
              </select>

              {/* Target Audience Filter */}
              <select
                value={audienceFilter}
                onChange={(e) => setAudienceFilter(e.target.value as any)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle, #cbd5e1)',
                  fontSize: '0.825rem',
                  background: 'var(--bg-card, #ffffff)',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="ALL">All Target Audiences</option>
                <option value="ALL_USERS">All Users</option>
                <option value="DRIVER">Drivers Only</option>
                <option value="VENDOR">Vendors Only</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
              <p style={{ fontSize: '0.9rem', margin: 0 }}>Loading campaign history...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div
              style={{
                padding: '3.5rem 1.5rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                  color: '#94a3b8',
                }}
              >
                <Radio size={24} />
              </div>
              <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                No Notification Campaigns Found
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {searchQuery || statusFilter !== 'ALL' || audienceFilter !== 'ALL'
                  ? 'No campaigns match the selected filters. Try clearing your search.'
                  : 'Broadcast notifications and test alerts will appear here once dispatched.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem',
                  textAlign: 'left',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
                      background: 'var(--bg-card-elevated, #f8fafc)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.775rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Campaign Name</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Target Audience</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Date</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Total Recipients</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Delivery Status</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((c) => {
                    const recipientCount = c.totalTargeted || (c.successCount + c.failureCount) || 1;
                    return (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-surface-hover, #f8fafc)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        {/* 1. Campaign Name */}
                        <td style={{ padding: '1rem', maxWidth: '340px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            {c.imageUrl && (
                              <img
                                src={c.imageUrl}
                                alt=""
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '6px',
                                  objectFit: 'cover',
                                  border: '1px solid #e2e8f0',
                                  flexShrink: 0,
                                }}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: 'var(--text-primary)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {c.title || 'Untitled Notification'}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--text-muted)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  marginTop: '0.15rem',
                                }}
                              >
                                {c.body || '—'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Target Audience */}
                        <td style={{ padding: '1rem' }}>{renderAudienceBadge(c)}</td>

                        {/* 3. Date */}
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calendar size={13} color="var(--text-muted)" />
                            {formatDate(c.createdAt)}
                          </div>
                        </td>

                        {/* 4. Total Recipients */}
                        <td style={{ padding: '1rem' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                            }}
                          >
                            <Users size={14} color="var(--text-muted)" />
                            {recipientCount.toLocaleString()} {recipientCount === 1 ? 'recipient' : 'recipients'}
                          </span>
                        </td>

                        {/* 5. Delivery Status */}
                        <td style={{ padding: '1rem' }}>{renderStatusBadge(c)}</td>

                        {/* 6. Action (View Details) */}
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye size={14} />}
                            onClick={() => setSelectedCampaign(c)}
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {/* ─── MODAL: VIEW DETAILS ──────────────────────────────────────── */}
      {selectedCampaign && (
        <Modal
          isOpen={!!selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
          title="Campaign Details"
          maxWidth="640px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="secondary" size="md" onClick={() => setSelectedCampaign(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Status Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '1rem',
                borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  CAMPAIGN STATUS
                </span>
                <div style={{ marginTop: '0.25rem' }}>{renderStatusBadge(selectedCampaign)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  SENT TIMESTAMP
                </span>
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {formatDate(selectedCampaign.createdAt)}
                </div>
              </div>
            </div>

            {/* Notification Card Preview */}
            <div
              style={{
                background: 'var(--bg-card-elevated, #f8fafc)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                border: '1px solid var(--border-subtle, #e2e8f0)',
              }}
            >
              {selectedCampaign.imageUrl && (
                <img
                  src={selectedCampaign.imageUrl}
                  alt="Campaign Banner"
                  style={{
                    width: '100%',
                    maxHeight: '180px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    border: '1px solid #e2e8f0',
                  }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedCampaign.title || 'Untitled Notification'}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedCampaign.body || 'No message content.'}
              </p>
            </div>

            {/* Target Audience & Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card, #ffffff)',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  TARGET AUDIENCE
                </span>
                <div style={{ marginTop: '0.4rem' }}>{renderAudienceBadge(selectedCampaign)}</div>
              </div>

              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card, #ffffff)',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  TOTAL RECIPIENTS
                </span>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {(
                    selectedCampaign.totalTargeted ||
                    (selectedCampaign.successCount + selectedCampaign.failureCount) ||
                    1
                  ).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Delivery Telemetry Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: '#f8fafc',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                textAlign: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>DELIVERED</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d', marginTop: '0.2rem' }}>
                  {selectedCampaign.successCount ?? selectedCampaign.totalTargeted ?? 0}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>FAILED</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>
                  {selectedCampaign.failureCount ?? 0}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--brand-primary, #5728b2)', fontWeight: 600 }}>
                  SUCCESS RATE
                </span>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'var(--brand-primary, #5728b2)',
                    marginTop: '0.2rem',
                  }}
                >
                  {selectedCampaign.totalTargeted
                    ? Math.round(((selectedCampaign.successCount || 0) / selectedCampaign.totalTargeted) * 100)
                    : 100}
                  %
                </div>
              </div>
            </div>

            {/* Metadata Footer */}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Campaign Identifier: <code style={{ color: 'var(--text-secondary)' }}>{selectedCampaign.id}</code>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL: SEND TEST NOTIFICATION ────────────────────────────── */}
      <Modal
        isOpen={isTestPushOpen}
        onClose={() => setIsTestPushOpen(false)}
        title="Send Test Notification"
        maxWidth="520px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <Button variant="ghost" size="md" onClick={() => setIsTestPushOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Send size={15} />}
              onClick={handleSendTestPush}
              disabled={!testPhoneOrToken.trim() || sendingTest}
              loading={sendingTest}
            >
              Send Test Push
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Dispatch an instant test notification to a specific phone number or FCM device token to verify push delivery.
          </p>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '0.35rem',
              }}
            >
              Recipient Phone Number or Device Token <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. +91 98765 43210 or device FCM token"
              value={testPhoneOrToken}
              onChange={(e) => setTestPhoneOrToken(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                fontSize: '0.875rem',
                background: 'var(--bg-card, #ffffff)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '0.35rem',
              }}
            >
              Test Notification Title
            </label>
            <input
              type="text"
              placeholder="e.g. AdhocX Test Notification"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                fontSize: '0.875rem',
                background: 'var(--bg-card, #ffffff)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '0.35rem',
              }}
            >
              Test Notification Message
            </label>
            <textarea
              rows={3}
              placeholder="Live test push delivery from AdhocX Push Notification & Campaign Studio."
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                fontSize: '0.875rem',
                background: 'var(--bg-card, #ffffff)',
                color: 'var(--text-primary)',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '0.35rem',
              }}
            >
              Optional Banner Image URL
            </label>
            <input
              type="url"
              placeholder="https://example.com/banner.jpg (Optional)"
              value={testImageUrl}
              onChange={(e) => setTestImageUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                fontSize: '0.875rem',
                background: 'var(--bg-card, #ffffff)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </Modal>

      {/* ─── MODAL: CONFIRM BROADCAST ─────────────────────────────────── */}
      <Modal
        isOpen={isConfirmBroadcastOpen}
        onClose={() => setIsConfirmBroadcastOpen(false)}
        title="Confirm Notification Broadcast"
        maxWidth="500px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <Button variant="ghost" size="md" onClick={() => setIsConfirmBroadcastOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Send size={15} />}
              onClick={handleBroadcastPush}
              loading={submitting}
            >
              Confirm & Broadcast Now
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Are you sure you want to broadcast this push notification? This will trigger live Firebase Cloud Messaging
            alerts to target devices immediately.
          </p>

          <div
            style={{
              padding: '0.9rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: '#f8fafc',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              fontSize: '0.85rem',
            }}
          >
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Target Audience: </strong>
              <span style={{ color: 'var(--brand-primary, #5728b2)', fontWeight: 600 }}>
                {specificPhone.trim()
                  ? `Specific User (${specificPhone.trim()})`
                  : targetAudience === 'ALL'
                  ? 'All Users (Pan-Marketplace)'
                  : targetAudience === 'DRIVER'
                  ? 'Drivers Only'
                  : 'Vendors Only'}
              </span>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Estimated Reach: </strong>
              <span>
                {specificPhone.trim() ? '1 targeted user' : `${audienceEstimate.matchingUsers} users (~${audienceEstimate.matchingDevices} active devices)`}
              </span>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Title: </strong>
              <span>{title}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

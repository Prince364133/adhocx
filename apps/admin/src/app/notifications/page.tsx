'use client';

import React, { useEffect, useState } from 'react';
import {
  BellRing,
  Send,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Users,
  Car,
  ShieldCheck,
  Globe,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sliders,
  Image as ImageIcon,
  Zap,
  Info,
  Laptop,
  Check,
  X,
  Eye,
  Trash2,
  Clock,
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
import { PageHeader, MetricCard, Button, FilterBar, DataTable, StatusBadge } from '../../components/common';
import { Modal } from '../../components/Modal';

const VEHICLE_TYPES = [
  'SEDAN',
  'SUV',
  'HATCHBACK',
  'TEMPO_TRAVELLER',
  'BUS',
  'TATA_ACE',
  'PICKUP_TRUCK',
];

const PRESET_ROUTES = [
  { label: 'Trips Hub (/trips)', value: '/trips' },
  { label: 'Requirements & Opportunities (/requirements)', value: '/requirements' },
  { label: 'Driver Wallet & Booker Payments (/wallet)', value: '/wallet' },
  { label: 'KYC & Verification Center (/verifications)', value: '/verifications' },
  { label: 'Notifications Feed (/notifications)', value: '/notifications' },
  { label: 'Coupons & Promos (/coupons)', value: '/coupons' },
  { label: 'Help & Support Desk (/support)', value: '/support' },
];

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'COMPOSE' | 'CAMPAIGNS' | 'TELEMETRY'>('COMPOSE');
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
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignPage, setCampaignPage] = useState(1);
  const [totalCampaignsCount, setTotalCampaignsCount] = useState(0);

  // Live Audience Estimate
  const [audienceEstimate, setAudienceEstimate] = useState<AudienceEstimateResult>({
    matchingUsers: 0,
    matchingDevices: 0,
    platformBreakdown: { android: 0, ios: 0, web: 0 },
  });

  // Compose State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [actionUrl, setActionUrl] = useState('/trips');
  const [customActionUrl, setCustomActionUrl] = useState('');
  const [priority, setPriority] = useState<'high' | 'normal'>('high');
  const [customPayloadKey, setCustomPayloadKey] = useState('');
  const [customPayloadVal, setCustomPayloadVal] = useState('');

  // Filter State
  const [targetRole, setTargetRole] = useState<'ALL' | 'DRIVER' | 'VENDOR' | 'ADMIN'>('ALL');
  const [driverAvailability, setDriverAvailability] = useState<'ALL' | 'AVAILABLE' | 'BUSY' | 'OFFLINE'>('ALL');
  const [verificationStatus, setVerificationStatus] = useState<'ALL' | 'VERIFIED' | 'PENDING' | 'REJECTED'>('ALL');
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState('ALL');
  const [phoneFilter, setPhoneFilter] = useState('');

  // Device Preview State: 'android' | 'ios' | 'web'
  const [previewDevice, setPreviewDevice] = useState<'android' | 'ios' | 'web'>('android');

  // Modals
  const [isConfirmBroadcastOpen, setIsConfirmBroadcastOpen] = useState(false);
  const [isTestPushOpen, setIsTestPushOpen] = useState(false);
  const [testPhoneOrToken, setTestPhoneOrToken] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<NotificationCampaignItem | null>(null);

  useEffect(() => {
    loadData();
  }, [campaignPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      recomputeEstimate();
    }, 400);
    return () => clearTimeout(timer);
  }, [targetRole, driverAvailability, verificationStatus, selectedVehicles, cityFilter, phoneFilter]);

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
        adminApi.getNotificationCampaigns(campaignPage, 20).catch(() => ({
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
        role: targetRole,
        availability: targetRole === 'DRIVER' ? driverAvailability : 'ALL',
        verificationStatus: targetRole === 'DRIVER' ? verificationStatus : 'ALL',
        vehicleTypes: targetRole === 'DRIVER' && selectedVehicles.length > 0 ? selectedVehicles : undefined,
        city: cityFilter !== 'ALL' ? cityFilter : undefined,
        phones: phoneFilter.trim() ? [phoneFilter.trim()] : undefined,
      };
      const res = await adminApi.estimateNotificationAudience(filter).catch(() => null);
      if (res && typeof res.matchingUsers === 'number') {
        setAudienceEstimate(res);
      }
    } finally {
      setEstimating(false);
    }
  }

  function toggleVehicle(vType: string) {
    setSelectedVehicles((prev) =>
      prev.includes(vType) ? prev.filter((v) => v !== vType) : [...prev, vType],
    );
  }

  async function handleBroadcastPush() {
    if (!title.trim() || !body.trim()) {
      setAlert({ type: 'error', message: 'Please enter both Title and Body for the broadcast campaign before dispatching.' });
      return;
    }
    setSubmitting(true);
    try {
      const finalRoute = actionUrl === 'CUSTOM' ? customActionUrl : actionUrl;
      const payload: BroadcastPushPayload = {
        title: title.trim(),
        body: body.trim(),
        imageUrl: imageUrl.trim() || undefined,
        actionUrl: finalRoute.trim() || undefined,
        priority,
        filter: {
          role: targetRole,
          availability: targetRole === 'DRIVER' ? driverAvailability : 'ALL',
          verificationStatus: targetRole === 'DRIVER' ? verificationStatus : 'ALL',
          vehicleTypes: targetRole === 'DRIVER' && selectedVehicles.length > 0 ? selectedVehicles : undefined,
          city: cityFilter !== 'ALL' ? cityFilter : undefined,
          phones: phoneFilter.trim() ? [phoneFilter.trim()] : undefined,
        },
        data: customPayloadKey.trim() ? { [customPayloadKey.trim()]: customPayloadVal } : undefined,
      };

      const res = await adminApi.broadcastPushNotification(payload);
      setAlert({
        type: 'success',
        message: `Campaign broadcast dispatched successfully! Targeted ${res.totalTargetedUsers || audienceEstimate.matchingUsers} users across ${res.totalTargetedDevices || audienceEstimate.matchingDevices} active devices.`,
      });
      setIsConfirmBroadcastOpen(false);
      loadData();
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to dispatch broadcast campaign' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendTestPush() {
    if (!testPhoneOrToken.trim()) {
      setAlert({ type: 'error', message: 'Please enter a target phone number or FCM token for testing' });
      return;
    }
    setSubmitting(true);
    try {
      const finalRoute = actionUrl === 'CUSTOM' ? customActionUrl : actionUrl;
      const isToken = testPhoneOrToken.length > 25;
      const payload: TestPushPayload = {
        title: title.trim() || 'AdhocX Test Notification',
        body: body.trim() || 'Live test push delivery from AdhocX Push Notification & Campaign Studio.',
        imageUrl: imageUrl.trim() || undefined,
        actionUrl: finalRoute.trim() || undefined,
        targetToken: isToken ? testPhoneOrToken.trim() : undefined,
        targetPhone: !isToken ? testPhoneOrToken.trim() : undefined,
        data: { test: 'true', sentAt: new Date().toISOString() },
      };

      const res = await adminApi.sendTestPushNotification(payload);
      if (res && res.totalTokens === 0) {
        setAlert({
          type: 'success',
          message: `Target user found! In-app test notification stored in feed. (Note: No active FCM device token was registered for this user yet).`,
        });
      } else {
        setAlert({
          type: 'success',
          message: `Test push sent successfully to ${testPhoneOrToken}! Delivered to ${(res as any)?.successCount ?? 1} device(s).`,
        });
      }
      setIsTestPushOpen(false);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to send test push' });
    } finally {
      setSubmitting(false);
    }
  }

  const effectiveRoute = actionUrl === 'CUSTOM' ? customActionUrl : actionUrl;

  return (
    <div className="admin-page-container" style={{ padding: '1.75rem 2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Page Header */}
      <PageHeader
        title="Push Notifications & Campaign Studio"
        subtitle="Enterprise Firebase Cloud Messaging (FCM) broadcast center with audience segmentation, live device preview, and real-time telemetry."
        actions={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              variant="secondary"
              onClick={() => setIsTestPushOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Smartphone size={16} />
              <span>Send Test Push</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsConfirmBroadcastOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Send size={16} />
              <span>Broadcast Campaign</span>
            </Button>
          </div>
        }
      />

      {/* Global Alert */}
      {alert && (
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '0.9rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: alert.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            border: `1px solid ${alert.type === 'success' ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
            color: alert.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{alert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlert(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <MetricCard
          label="Total Push Delivered"
          value={metrics.totalDelivered.toLocaleString()}
          trend={{ value: '+14.2% vs last week', isPositive: true }}
          icon={<Send size={20} color="var(--brand-primary)" />}
          accentColor="var(--brand-primary)"
        />
        <MetricCard
          label="Active Registered Devices"
          value={metrics.activeDevicesCount.toLocaleString()}
          subtext={`${metrics.devicesByPlatform.android} Android • ${metrics.devicesByPlatform.ios} iOS • ${metrics.devicesByPlatform.web} Web`}
          icon={<Smartphone size={20} color="#10b981" />}
          accentColor="#10b981"
        />
        <MetricCard
          label="FCM Delivery Success Rate"
          value={`${metrics.deliverySuccessRate}%`}
          trend={{ value: 'Target: >98.0%', isPositive: true }}
          icon={<CheckCircle2 size={20} color="#6366f1" />}
          accentColor="#6366f1"
        />
        <MetricCard
          label="Campaigns & System Alerts"
          value={metrics.totalCampaigns.toLocaleString()}
          subtext={`${metrics.inAppNotificationsCount.toLocaleString()} In-App Alerts`}
          icon={<Radio size={20} color="#f59e0b" />}
          accentColor="#f59e0b"
        />
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border)',
          marginBottom: '1.75rem',
        }}
      >
        {[
          { id: 'COMPOSE', label: 'Compose & Broadcast Campaign', icon: Send },
          { id: 'CAMPAIGNS', label: 'Campaign Logs & History', icon: Layers },
          { id: 'TELEMETRY', label: 'FCM Device Fleet & Health', icon: Radio },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--brand-primary)' : '3px solid transparent',
                color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <tab.icon size={17} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: COMPOSE & BROADCAST STUDIO */}
      {activeTab === 'COMPOSE' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '1.75rem' }}>
          {/* Left Column: Form & Audience Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Step 1: Audience Segmentation */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--brand-primary-subtle)',
                      color: 'var(--brand-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                    }}
                  >
                    1
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      Audience Segmentation & Filters
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.1rem 0 0 0' }}>
                      Pinpoint target users, active driver fleet, and regional corridors
                    </p>
                  </div>
                </div>

                {/* Real-time Audience Counter Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.4rem 0.85rem',
                    borderRadius: 'var(--radius-pill)',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    color: 'var(--brand-primary)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                  title="Computed via active device tokens"
                >
                  <Users size={14} />
                  <span>
                    {estimating ? 'Calculating...' : `${audienceEstimate.matchingUsers} users (${audienceEstimate.matchingDevices} devices)`}
                  </span>
                  {estimating && <RefreshCw size={12} className="spin" />}
                </div>
              </div>

              {/* Target Role Selector */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Target Role Scope
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {[
                    { id: 'ALL', label: 'All Users', icon: Globe },
                    { id: 'DRIVER', label: 'Drivers Only', icon: Car },
                    { id: 'VENDOR', label: 'Vendors Only', icon: Users },
                    { id: 'ADMIN', label: 'Admins Only', icon: ShieldCheck },
                  ].map((role) => {
                    const isSelected = targetRole === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setTargetRole(role.id as any)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.45rem',
                          padding: '0.65rem 0.5rem',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border)'}`,
                          background: isSelected ? 'var(--brand-primary-subtle)' : 'var(--bg-surface-elevated)',
                          color: isSelected ? 'var(--brand-primary)' : 'var(--text-secondary)',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <role.icon size={15} />
                        <span>{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Driver-Specific Filters (when DRIVER or ALL selected) */}
              {(targetRole === 'DRIVER' || targetRole === 'ALL') && (
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border)',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Availability */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        Driver Availability
                      </label>
                      <select
                        value={driverAvailability}
                        onChange={(e) => setDriverAvailability(e.target.value as any)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '0.84rem',
                        }}
                      >
                        <option value="ALL">All Availabilities (Online & Offline)</option>
                        <option value="AVAILABLE">Available & Ready for Trips</option>
                        <option value="BUSY">Currently on Trip (Busy)</option>
                        <option value="OFFLINE">Offline Drivers</option>
                      </select>
                    </div>

                    {/* KYC Verification */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                        Verification Status
                      </label>
                      <select
                        value={verificationStatus}
                        onChange={(e) => setVerificationStatus(e.target.value as any)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '0.84rem',
                        }}
                      >
                        <option value="ALL">All Verification States</option>
                        <option value="VERIFIED">Verified Drivers Only (Active Fleet)</option>
                        <option value="PENDING">Pending KYC Verification</option>
                        <option value="REJECTED">Rejected Documents</option>
                      </select>
                    </div>
                  </div>

                  {/* Vehicle Types Multiselect */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Target Vehicle Fleet ({selectedVehicles.length} selected)
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {VEHICLE_TYPES.map((v) => {
                        const isSelected = selectedVehicles.includes(v);
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => toggleVehicle(v)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: 'var(--radius-pill)',
                              border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border)'}`,
                              background: isSelected ? 'var(--brand-primary)' : 'var(--bg-surface)',
                              color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                              fontSize: '0.75rem',
                              fontWeight: isSelected ? 700 : 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isSelected && <Check size={12} />}
                            <span>{v.replace('_', ' ')}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* City & Direct Phone filter */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Corridor / City Filter
                  </label>
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                    }}
                  >
                    <option value="ALL">All Cities & Pan-India Corridors</option>
                    <option value="Delhi">Delhi NCR Corridor</option>
                    <option value="Mumbai">Mumbai Metropolitan</option>
                    <option value="Bengaluru">Bengaluru Urban</option>
                    <option value="Hyderabad">Hyderabad Corridor</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Specific Phone Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="+919876543210"
                    value={phoneFilter}
                    onChange={(e) => setPhoneFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Message Content Builder */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--brand-primary-subtle)',
                    color: 'var(--brand-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                  }}
                >
                  2
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Message Content & Deep Links
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.1rem 0 0 0' }}>
                    Compose rich push notification headers, banners, and action triggers
                  </p>
                </div>
              </div>

              {/* Title */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Notification Title *
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{title.length}/65 chars</span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 🚖 Special Weekend Surge Bonus"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                />
              </div>

              {/* Body */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Notification Message Body *
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{body.length}/240 chars</span>
                </div>
                <textarea
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write clear, engaging copy describing the alert or opportunity..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.84rem',
                    lineHeight: 1.45,
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Image URL Banner */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Banner Image URL (Optional Rich Push)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/banner.jpg"
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                    }}
                  />
                  {imageUrl && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setImageUrl('')}
                      style={{ padding: '0.55rem 0.75rem' }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Deep Link Destination */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Action / Deep Link Route
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                  <select
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                    }}
                  >
                    {PRESET_ROUTES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                    <option value="CUSTOM">Custom URL / External Link</option>
                  </select>

                  {actionUrl === 'CUSTOM' ? (
                    <input
                      type="text"
                      placeholder="https://... or /custom-route"
                      value={customActionUrl}
                      onChange={(e) => setCustomActionUrl(e.target.value)}
                      style={{
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-surface-elevated)',
                        color: 'var(--text-primary)',
                        fontSize: '0.84rem',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        padding: '0.55rem 0',
                      }}
                    >
                      <ExternalLink size={13} color="var(--brand-primary)" />
                      <span>Opens {actionUrl} screen on tap</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Priority & Custom Key-Value Payload */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Channel Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-surface-elevated)',
                      color: 'var(--text-primary)',
                      fontSize: '0.84rem',
                    }}
                  >
                    <option value="high">High (Instant Alert & Heads-up)</option>
                    <option value="normal">Normal (Standard Delivery)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Custom Metadata Data Key & Value
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Key (e.g. promo_tag)"
                      value={customPayloadKey}
                      onChange={(e) => setCustomPayloadKey(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-surface-elevated)',
                        color: 'var(--text-primary)',
                        fontSize: '0.84rem',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={customPayloadVal}
                      onChange={(e) => setCustomPayloadVal(e.target.value)}
                      style={{
                        flex: 1.2,
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-surface-elevated)',
                        color: 'var(--text-primary)',
                        fontSize: '0.84rem',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Triple-Device Mockup */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                position: 'sticky',
                top: '1rem',
              }}
            >
              {/* Preview Header & Device Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Eye size={18} color="var(--brand-primary)" />
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Live Device Preview
                  </span>
                </div>

                {/* Device Tabs */}
                <div
                  style={{
                    display: 'flex',
                    background: 'var(--bg-surface-elevated)',
                    padding: '0.2rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {[
                    { id: 'android', label: 'Android' },
                    { id: 'ios', label: 'iOS' },
                    { id: 'web', label: 'Web' },
                  ].map((dev) => {
                    const isSelected = previewDevice === dev.id;
                    return (
                      <button
                        key={dev.id}
                        type="button"
                        onClick={() => setPreviewDevice(dev.id as any)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          background: isSelected ? 'var(--brand-primary)' : 'transparent',
                          color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {dev.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PREVIEW 1: ANDROID MATERIAL 3 MOCKUP */}
              {previewDevice === 'android' && (
                <div
                  style={{
                    background: '#121212',
                    borderRadius: '24px',
                    padding: '1.25rem',
                    border: '4px solid #2a2a2a',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                    color: '#ffffff',
                    fontFamily: '-apple-system, Roboto, sans-serif',
                  }}
                >
                  {/* Status bar */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      color: '#a0a0a0',
                      marginBottom: '1rem',
                      padding: '0 0.25rem',
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>10:45</span>
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <Radio size={12} />
                      <span>5G</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Android Notification Shade Card */}
                  <div
                    style={{
                      background: '#1e1e1e',
                      borderRadius: '16px',
                      padding: '1rem',
                      border: '1px solid #333',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            background: 'var(--brand-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 900,
                            fontSize: '11px',
                          }}
                        >
                          A
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e0e0e0' }}>AdhocX</span>
                        <span style={{ fontSize: '0.68rem', color: '#888' }}>• now</span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#6366f1', fontWeight: 600 }}>PRIORITY</span>
                    </div>

                    {/* Notification Title & Body */}
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.3rem' }}>
                      {title || 'Notification Title'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#b0b0b0', lineHeight: 1.4, marginBottom: imageUrl ? '0.75rem' : '0' }}>
                      {body || 'Notification message text appears here...'}
                    </div>

                    {/* Rich Banner Image */}
                    {imageUrl && (
                      <div
                        style={{
                          width: '100%',
                          height: '140px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          marginBottom: '0.75rem',
                          background: '#0a0a0a',
                        }}
                      >
                        <img
                          src={imageUrl}
                          alt="Banner"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Android Action Buttons */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        borderTop: '1px solid #2c2c2c',
                        paddingTop: '0.65rem',
                        marginTop: '0.4rem',
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#818cf8',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        OPEN ADHOCX
                      </button>
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#888',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        DISMISS
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PREVIEW 2: APPLE iOS MOCKUP */}
              {previewDevice === 'ios' && (
                <div
                  style={{
                    background: 'linear-gradient(180deg, #1c1917, #0c0a09)',
                    borderRadius: '32px',
                    padding: '1.25rem',
                    border: '4px solid #333',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                    color: '#ffffff',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro", sans-serif',
                  }}
                >
                  {/* Dynamic Island */}
                  <div
                    style={{
                      width: '90px',
                      height: '24px',
                      background: '#000',
                      borderRadius: '16px',
                      margin: '0 auto 1.25rem',
                    }}
                  />

                  {/* iOS Frosted Glass Notification Card */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.12)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: '18px',
                      padding: '1rem',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '5px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 900,
                            fontSize: '10px',
                          }}
                        >
                          A
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>ADHOCX</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>now</span>
                    </div>

                    {/* Content */}
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.25rem' }}>
                      {title || 'Notification Title'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, marginBottom: imageUrl ? '0.65rem' : '0' }}>
                      {body || 'Notification message text appears here...'}
                    </div>

                    {/* Banner */}
                    {imageUrl && (
                      <div
                        style={{
                          width: '100%',
                          height: '120px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: 'rgba(0,0,0,0.3)',
                        }}
                      >
                        <img src={imageUrl} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PREVIEW 3: WEB BROWSER TOAST MOCKUP */}
              {previewDevice === 'web' && (
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontFamily: '-apple-system, sans-serif',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem' }}>
                    Google Chrome • adhocx.com
                  </div>

                  {/* Browser Push Window */}
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      padding: '1rem',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      display: 'flex',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: 'var(--brand-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 900,
                        fontSize: '18px',
                        flexShrink: 0,
                      }}
                    >
                      A
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>
                        {title || 'Notification Title'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4, marginBottom: '0.5rem' }}>
                        {body || 'Notification message body...'}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.55rem',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#334155',
                          }}
                        >
                          View Details
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.25rem 0.55rem',
                            borderRadius: '4px',
                            background: 'transparent',
                            color: '#94a3b8',
                          }}
                        >
                          Dismiss
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons Summary */}
              <div
                style={{
                  marginTop: '1.25rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <Button
                  variant="primary"
                  onClick={() => setIsConfirmBroadcastOpen(true)}
                  style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontWeight: 700 }}
                >
                  <Send size={16} />
                  <span>Broadcast to {audienceEstimate.matchingUsers} Target Users</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setIsTestPushOpen(true)}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Smartphone size={16} />
                  <span>Send Single Test Push</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAMPAIGN HISTORY & DELIVERY LOGS */}
      {activeTab === 'CAMPAIGNS' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Notification Broadcast History
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                Complete audit trail of dispatched push campaigns, targeting metrics, and recipient reach.
              </p>
            </div>

            <Button variant="secondary" size="sm" onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <RefreshCw size={14} />
              <span>Refresh Logs</span>
            </Button>
          </div>

          {loading ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem' }} />
              <p>Loading campaign history...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Layers size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No Broadcast Campaigns Found</p>
              <p style={{ fontSize: '0.78rem' }}>Broadcast your first push campaign from the Compose tab above.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Campaign Title</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Target Audience</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Targeted</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Delivered</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Sent At</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr
                      key={c.id}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-elevated)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '280px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.body}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-pill)',
                            background: 'var(--brand-primary-subtle)',
                            color: 'var(--brand-primary)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          {c.targetRole || 'ALL'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {c.totalTargeted}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#10b981', fontWeight: 700 }}>
                        {c.successCount}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <StatusBadge status={c.status} />
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCampaign(c)}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FCM DEVICE FLEET & TELEMETRY */}
      {activeTab === 'TELEMETRY' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
              FCM Cluster & Device Token Health
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1.5rem 0' }}>
              Authoritative Firebase Cloud Messaging service connected to Google Cloud Project <code>adhocx-507407</code>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Smartphone size={18} color="#10b981" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Android Devices</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginBottom: '0.25rem' }}>
                  {metrics.devicesByPlatform.android.toLocaleString()}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  Active tokens with heads-up push channel and sound enabled
                </p>
              </div>

              <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Smartphone size={18} color="#6366f1" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Apple iOS (APNs)</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1', marginBottom: '0.25rem' }}>
                  {metrics.devicesByPlatform.ios.toLocaleString()}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  APNs payload bridged via Firebase Cloud Messaging
                </p>
              </div>

              <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Laptop size={18} color="#f59e0b" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Web Push (Browsers)</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', marginBottom: '0.25rem' }}>
                  {metrics.devicesByPlatform.web.toLocaleString()}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                  Chrome, Edge, Safari Web Push notification tokens
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BROADCAST CONFIRMATION */}
      {isConfirmBroadcastOpen && (
        <Modal
          isOpen={isConfirmBroadcastOpen}
          onClose={() => setIsConfirmBroadcastOpen(false)}
          title="Confirm Broadcast Dispatch"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              You are about to push this notification to all matching devices immediately:
            </p>

            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                {title}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                {body}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
                Target: {targetRole} ({audienceEstimate.matchingUsers} users, {audienceEstimate.matchingDevices} active devices)
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setIsConfirmBroadcastOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleBroadcastPush} disabled={submitting}>
                {submitting ? 'Dispatching...' : 'Yes, Send Broadcast Now'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: TEST PUSH */}
      {isTestPushOpen && (
        <Modal
          isOpen={isTestPushOpen}
          onClose={() => setIsTestPushOpen(false)}
          title="Send Instant Test Push"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
              Send an immediate test push of your composed notification to a specific phone number or FCM device token.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Target Phone Number or FCM Registration Token *
              </label>
              <input
                type="text"
                value={testPhoneOrToken}
                onChange={(e) => setTestPhoneOrToken(e.target.value)}
                placeholder="e.g. +919876543210 or fcm_token_string..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setIsTestPushOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSendTestPush} disabled={submitting}>
                {submitting ? 'Sending Test...' : 'Send Test Notification'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: CAMPAIGN DETAILS */}
      {selectedCampaign && (
        <Modal
          isOpen={!!selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
          title="Campaign Dispatch Audit"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Campaign Title</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedCampaign.title}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Message Body</span>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {selectedCampaign.body}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target Role</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  {selectedCampaign.targetRole || 'ALL'}
                </div>
              </div>

              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Delivered / Targeted</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>
                  {selectedCampaign.successCount} / {selectedCampaign.totalTargeted}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setSelectedCampaign(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

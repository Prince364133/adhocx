'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  Users,
  X,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  Edit3,
  Mail,
  Phone,
  Copy,
  Check,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  Activity,
  FileText,
  ExternalLink,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  Navigation,
  Briefcase,
} from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import {
  VendorListItem,
  UserListItem,
  CorporateVendorDetail,
  UserProfileDetail,
  VendorOrderItem,
  UserOrderItem,
} from '../../lib/api/types';
import {
  PageHeader,
  FilterBar,
  DataTable,
  Column,
  StatusBadge,
  Button,
  Card,
  MetricCard,
} from '../../components/common';

const VENDOR_STATUS_TABS = [
  { id: 'ALL', label: 'All Accounts' },
  { id: 'PENDING', label: 'Pending Approval' },
  { id: 'VERIFIED', label: 'Verified' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'SUSPENDED', label: 'Suspended' },
];

const USER_STATUS_TABS = [
  { id: 'ALL', label: 'All Users' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'SUSPENDED', label: 'Inactive / Suspended' },
  { id: 'DEACTIVATED', label: 'Blocked' },
];

const USER_ROLE_FILTERS = [
  { id: 'ALL', label: 'All Roles' },
  { id: 'EMPLOYEE', label: 'Corporate Employees' },
  { id: 'CORPORATE_MANAGER', label: 'Corporate Managers' },
  { id: 'CORPORATE_ADMIN', label: 'Corporate Admins' },
  { id: 'VENDOR', label: 'Vendor Partners' },
  { id: 'DRIVER', label: 'Drivers' },
];

export default function UsersAndVendorsPage() {
  // Top Level Section Switcher: 'VENDORS' | 'USERS'
  const [activeSection, setActiveSection] = useState<'VENDORS' | 'USERS'>('VENDORS');

  // Vendor listing state
  const [vendorTab, setVendorTab] = useState('ALL');
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  // User listing state
  const [userTab, setUserTab] = useState('ALL');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Dedicated Full-Page Selection States
  const [selectedVendor, setSelectedVendor] = useState<CorporateVendorDetail | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfileDetail | null>(null);
  const [, setDetailsLoading] = useState(false);

  // Edit Modals
  const [editingVendor, setEditingVendor] = useState<CorporateVendorDetail | VendorListItem | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfileDetail | UserListItem | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);

  // Status Action Modals / Banners
  const [actionType, setActionType] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'VENDOR' | 'USER';
    id: string;
    name: string;
    phone?: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Feedback Notification Toast
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Order History Filter Timeframes: 'ALL' | 'DAILY' | 'MONTHLY' | 'YEARLY'
  const [orderTimeframe, setOrderTimeframe] = useState<'ALL' | 'DAILY' | 'MONTHLY' | 'YEARLY'>('ALL');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');

  // Vendor Analytics Chart Metric: 'REVENUE' | 'COMPLETED' | 'ACTIVE_DAYS' | 'PERFORMANCE'
  const [analyticsMetric, setAnalyticsMetric] = useState<'REVENUE' | 'COMPLETED' | 'ACTIVE_DAYS' | 'PERFORMANCE'>('REVENUE');
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  // Initial Data Load
  useEffect(() => {
    loadVendors(vendorTab);
  }, [vendorTab]);

  useEffect(() => {
    loadUsers(userTab, userRoleFilter);
  }, [userTab, userRoleFilter]);

  async function loadVendors(status: string) {
    setVendorsLoading(true);
    try {
      const data = await adminApi.getVendors(status).catch(() => [] as VendorListItem[]);
      const list = Array.isArray(data) ? data : ((data as any)?.items || []);
      setVendors(list);
    } finally {
      setVendorsLoading(false);
    }
  }

  async function loadUsers(status: string, role: string) {
    setUsersLoading(true);
    try {
      const data = await adminApi.getUsers({
        status: status !== 'ALL' ? status : undefined,
        role: role !== 'ALL' ? role : undefined,
      }).catch(() => [] as UserListItem[]);
      const list = Array.isArray(data) ? data : ((data as any)?.items || []);
      setUsers(list);
    } finally {
      setUsersLoading(false);
    }
  }

  // Filtered Vendor List
  const filteredVendors = useMemo(() => {
    if (!vendorSearch) return vendors;
    const q = vendorSearch.toLowerCase().trim();
    return vendors.filter(
      (v) =>
        (v.companyName && v.companyName.toLowerCase().includes(q)) ||
        (v.organizationName && v.organizationName.toLowerCase().includes(q)) ||
        (v.contactPerson && v.contactPerson.toLowerCase().includes(q)) ||
        (v.phone && v.phone.toLowerCase().includes(q)) ||
        (v.email && v.email.toLowerCase().includes(q)) ||
        (v.gstNumber && v.gstNumber.toLowerCase().includes(q))
    );
  }, [vendors, vendorSearch]);

  // Filtered User List
  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase().trim();
    return users.filter(
      (u) =>
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q)) ||
        (u.companyName && u.companyName.toLowerCase().includes(q))
    );
  }, [users, userSearch]);

  // Open Full-Page Vendor Details
  async function handleOpenVendorDetails(vendor: VendorListItem) {
    setDetailsLoading(true);
    try {
      const details = await adminApi.getVendorDetails(vendor.id);
      setSelectedVendor(details);
      setSelectedUser(null);
      setOrderTimeframe('ALL');
      setOrderSearchQuery('');
      setOrderStatusFilter('ALL');
      setHoveredMonthIndex(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setAlert({ type: 'error', message: 'Failed to load comprehensive vendor details.' });
    } finally {
      setDetailsLoading(false);
    }
  }

  // Open Full-Page User Details
  async function handleOpenUserDetails(user: UserListItem) {
    setDetailsLoading(true);
    try {
      const details = await adminApi.getUserDetails(user.id);
      setSelectedUser(details);
      setSelectedVendor(null);
      setOrderTimeframe('ALL');
      setOrderSearchQuery('');
      setOrderStatusFilter('ALL');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setAlert({ type: 'error', message: 'Failed to load user profile details.' });
    } finally {
      setDetailsLoading(false);
    }
  }

  // Trigger Edit Modal for Vendor
  function handleOpenEditVendor(vendor: VendorListItem | CorporateVendorDetail) {
    setEditingVendor(vendor);
    setEditFormData({
      organizationName: vendor.companyName || (vendor as any).organizationName || '',
      contactPerson: vendor.contactPerson || (vendor as any).fullName || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      gstNumber: vendor.gstNumber || '',
      address: (vendor as any).companyAddress || (vendor as any).address || '',
    });
  }

  // Trigger Edit Modal for User
  function handleOpenEditUser(user: UserListItem | UserProfileDetail) {
    setEditingUser(user);
    setEditFormData({
      fullName: user.fullName || '',
      phone: user.phone || '',
      email: user.email || '',
      address: user.address || '',
      status: user.status || 'ACTIVE',
    });
  }

  // Save Edit Vendor
  async function handleSaveVendorEdit() {
    if (!editingVendor) return;
    setEditLoading(true);
    try {
      await adminApi.updateVendor(editingVendor.id, {
        organizationName: editFormData.organizationName,
        fullName: editFormData.contactPerson,
        phone: editFormData.phone,
        email: editFormData.email,
        gstNumber: editFormData.gstNumber,
        address: editFormData.address,
      });

      setAlert({ type: 'success', message: 'Corporate vendor details updated successfully.' });
      setEditingVendor(null);

      // Refresh data
      loadVendors(vendorTab);
      if (selectedVendor && selectedVendor.id === editingVendor.id) {
        handleOpenVendorDetails(editingVendor as VendorListItem);
      }
    } catch (err: unknown) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save vendor details.' });
    } finally {
      setEditLoading(false);
    }
  }

  // Save Edit User
  async function handleSaveUserEdit() {
    if (!editingUser) return;
    setEditLoading(true);
    try {
      await adminApi.updateUser(editingUser.id, {
        fullName: editFormData.fullName,
        phone: editFormData.phone,
        email: editFormData.email,
        status: editFormData.status,
        address: editFormData.address,
      });

      setAlert({ type: 'success', message: 'User profile details updated successfully.' });
      setEditingUser(null);

      // Refresh data
      loadUsers(userTab, userRoleFilter);
      if (selectedUser && selectedUser.id === editingUser.id) {
        handleOpenUserDetails(editingUser as UserListItem);
      }
    } catch (err: unknown) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save user profile.' });
    } finally {
      setEditLoading(false);
    }
  }

  // Execute Account Status Transition
  async function handleExecuteStatusAction(entityType: 'VENDOR' | 'USER', id: string) {
    if (!actionType) return;
    setActionLoading(true);
    try {
      if (entityType === 'VENDOR') {
        await adminApi.updateVendorStatus(id, actionType, actionReason);
        setAlert({ type: 'success', message: `Vendor account transitioned to ${actionType}.` });
        loadVendors(vendorTab);
        if (selectedVendor) {
          handleOpenVendorDetails(selectedVendor as unknown as VendorListItem);
        }
      } else {
        await adminApi.updateUserStatus(id, actionType, actionReason);
        setAlert({ type: 'success', message: `User account transitioned to ${actionType}.` });
        loadUsers(userTab, userRoleFilter);
        if (selectedUser) {
          handleOpenUserDetails(selectedUser as unknown as UserListItem);
        }
      }
      setActionType(null);
      setActionReason('');
    } catch (err: unknown) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Status update failed.' });
    } finally {
      setActionLoading(false);
    }
  }

  // Permanently Delete from Database
  async function handleExecuteDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      if (deleteTarget.type === 'VENDOR') {
        await adminApi.deleteVendor(deleteTarget.id);
        setAlert({
          type: 'success',
          message: `Corporate vendor "${deleteTarget.name}" permanently deleted from database.`,
        });
        if (selectedVendor?.id === deleteTarget.id) setSelectedVendor(null);
        loadVendors(vendorTab);
      } else {
        await adminApi.deleteUser(deleteTarget.id);
        setAlert({
          type: 'success',
          message: `User account "${deleteTarget.name}" permanently deleted from database.`,
        });
        if (selectedUser?.id === deleteTarget.id) setSelectedUser(null);
        loadUsers(userTab, userRoleFilter);
      }
      setDeleteTarget(null);
    } catch (err: unknown) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Failed to delete record from database.' });
    } finally {
      setDeleteLoading(false);
    }
  }

  // Copy to clipboard helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper: Filter order records by timeframe & search
  const filterOrders = <T extends { orderDate: string; orderId: string; orderStatus: string; pickupLocation?: string; deliveryLocation?: string }>(
    orders: T[]
  ): T[] => {
    return orders.filter((o) => {
      // 1. Timeframe filter
      if (orderTimeframe !== 'ALL') {
        const orderDate = new Date(o.orderDate);
        const now = new Date();
        if (orderTimeframe === 'DAILY') {
          const isToday =
            orderDate.getDate() === now.getDate() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (orderTimeframe === 'MONTHLY') {
          const isThisMonth =
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear();
          if (!isThisMonth) return false;
        } else if (orderTimeframe === 'YEARLY') {
          const isThisYear = orderDate.getFullYear() === now.getFullYear();
          if (!isThisYear) return false;
        }
      }

      // 2. Status filter
      if (orderStatusFilter !== 'ALL' && o.orderStatus !== orderStatusFilter) {
        return false;
      }

      // 3. Search query
      if (orderSearchQuery) {
        const q = orderSearchQuery.toLowerCase();
        const matchId = o.orderId.toLowerCase().includes(q);
        const matchPickup = (o.pickupLocation || '').toLowerCase().includes(q);
        const matchDrop = (o.deliveryLocation || '').toLowerCase().includes(q);
        if (!matchId && !matchPickup && !matchDrop) return false;
      }

      return true;
    });
  };

  /* =========================================================================
   * 1. FULL-PAGE VIEW: CORPORATE VENDOR DETAILS (Matches Driver Details)
   * ========================================================================= */
  if (selectedVendor) {
    const filteredVendorOrders = filterOrders(selectedVendor.orders || []);
    const analytics = selectedVendor.performanceAnalytics || [];

    // Interactive chart calculations
    const chartHeight = 220;
    const chartWidth = 660;
    const paddingX = 40;
    const paddingY = 30;
    const plotWidth = chartWidth - paddingX * 2;
    const plotHeight = chartHeight - paddingY * 2;

    const metricValues = analytics.map((a) => {
      if (analyticsMetric === 'REVENUE') return a.revenue;
      if (analyticsMetric === 'COMPLETED') return a.completedOrders;
      if (analyticsMetric === 'ACTIVE_DAYS') return a.activeDays;
      return a.fulfillmentRate;
    });

    const maxVal = Math.max(...metricValues, 1);
    const colStep = analytics.length > 0 ? plotWidth / analytics.length : 60;
    const barWidth = Math.min(36, colStep * 0.55);

    return (
      <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
        {/* Top Navigation Bar with Back Button and Quick Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedVendor(null);
                setActionType(null);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              <ArrowLeft size={16} />
              <span>Back to Corporate Vendors</span>
            </Button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>Vendors</span>
              <span>/</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedVendor.companyName}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenEditVendor(selectedVendor)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Edit3 size={15} />
              <span>Edit Details</span>
            </Button>

            {selectedVendor.verificationStatus !== 'VERIFIED' && (
              <Button variant="success" size="sm" onClick={() => setActionType('VERIFIED')}>
                Verify Vendor
              </Button>
            )}

            {selectedVendor.verificationStatus === 'VERIFIED' && (
              <Button variant="danger" size="sm" onClick={() => setActionType('SUSPENDED')}>
                Suspend Account
              </Button>
            )}

            {selectedVendor.verificationStatus === 'SUSPENDED' && (
              <Button variant="success" size="sm" onClick={() => setActionType('VERIFIED')}>
                Reactivate Vendor
              </Button>
            )}

            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                setDeleteTarget({
                  type: 'VENDOR',
                  id: selectedVendor.id,
                  name: selectedVendor.companyName,
                  phone: selectedVendor.phone,
                })
              }
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </Button>
          </div>
        </div>

        {/* Global Toast Alert */}
        {alert && (
          <div
            style={{
              padding: '0.875rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: alert.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              border: `1px solid ${alert.type === 'success' ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
              color: alert.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            <span>{alert.message}</span>
            <button
              onClick={() => setAlert(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Action Reason Banner / Confirm Dialog */}
        {actionType && (
          <Card
            variant="accent"
            style={{
              marginBottom: '1.5rem',
              border: `1px solid ${
                actionType === 'VERIFIED' ? 'var(--color-success-border)' : 'var(--color-danger-border)'
              }`,
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9375rem' }}>
                <AlertTriangle
                  size={18}
                  color={actionType === 'VERIFIED' ? 'var(--color-success)' : 'var(--color-danger)'}
                />
                <span>
                  Confirm Transition: {actionType === 'VERIFIED' ? 'Approve & Verify Vendor' : `${actionType} Vendor`}
                </span>
              </div>
              <button
                onClick={() => setActionType(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.8125rem' }}>
              {actionType === 'REJECTED' && 'Mandatory Reason for Rejection:'}
              {actionType === 'SUSPENDED' && 'Mandatory Reason for Suspension:'}
              {actionType === 'VERIFIED' && 'Optional Verification Notes:'}
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Add administrative notes for the compliance audit trail..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                marginBottom: '1rem',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button variant="outline" size="sm" onClick={() => setActionType(null)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                variant={actionType === 'VERIFIED' ? 'success' : 'danger'}
                size="sm"
                onClick={() => handleExecuteStatusAction('VENDOR', selectedVendor.id)}
                isLoading={actionLoading}
              >
                Execute {actionType}
              </Button>
            </div>
          </Card>
        )}

        {/* 1. TOP PROFILE DETAILS HEADER CARD */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem 1.75rem',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}
        >
          {/* Company identity & Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, rgba(87, 40, 178, 0.18), rgba(91, 66, 243, 0.08))',
                border: '1.5px solid rgba(87, 40, 178, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 900,
                color: 'var(--brand-primary)',
                flexShrink: 0,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {selectedVendor.companyLogoUrl ? (
                <img
                  src={selectedVendor.companyLogoUrl}
                  alt={selectedVendor.companyName}
                  style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }}
                />
              ) : (
                <Building2 size={32} />
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {selectedVendor.companyName}
                </h2>
                <StatusBadge status={selectedVendor.verificationStatus} size="sm" />
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: selectedVendor.accountStatus === 'ACTIVE' ? 'var(--color-success-bg)' : 'var(--bg-surface-elevated)',
                    border: `1px solid ${selectedVendor.accountStatus === 'ACTIVE' ? 'var(--color-success-border)' : 'var(--border)'}`,
                    color: selectedVendor.accountStatus === 'ACTIVE' ? 'var(--color-success)' : 'var(--text-muted)',
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: selectedVendor.accountStatus === 'ACTIVE' ? 'var(--color-success)' : 'var(--text-muted)',
                    }}
                  />
                  {selectedVendor.accountStatus}
                </span>
              </div>

              {/* Subtitle details: Contact person, Phone, Email */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginTop: '0.5rem',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Users size={14} color="var(--brand-primary)" />
                  <span style={{ fontWeight: 600 }}>Contact: {selectedVendor.contactPerson}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Phone size={14} color="var(--brand-primary)" />
                  <span>{selectedVendor.phone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Mail size={14} color="var(--brand-primary)" />
                  <span>{selectedVendor.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Identifier & Registration Metadata */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              flexWrap: 'wrap',
              borderLeft: '1px solid var(--border)',
              paddingLeft: '1.5rem',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Vendor ID
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                <span className="code-tag" style={{ fontSize: '0.8125rem' }}>{selectedVendor.id.slice(0, 12)}...</span>
                <button
                  onClick={() => copyToClipboard(selectedVendor.id, 'vendor-id')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem', color: 'var(--text-muted)' }}
                  title="Copy Full Vendor ID"
                >
                  {copiedId === 'vendor-id' ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Registration Date
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                <Calendar size={14} color="var(--brand-primary)" />
                <span>{new Date(selectedVendor.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>

            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Escrow Balance
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--color-success)', marginTop: '0.15rem' }}>
                ₹{selectedVendor.escrowBalance.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* Corporate Profile Extended Grid (Address, GST, City & State) */}
        <div
          style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Company Address
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
              <MapPin size={15} color="var(--brand-primary)" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
              <span>{selectedVendor.companyAddress}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              City & State
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {selectedVendor.city}{selectedVendor.state && selectedVendor.state !== 'Not Available' ? `, ${selectedVendor.state}` : ''}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              GST / Business Registration
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: selectedVendor.gstNumber ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: '0.25rem' }}>
              {selectedVendor.gstNumber || 'Not Available'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Industry / Service Domain
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {selectedVendor.businessType || 'Commercial Logistics & Corporate Transport'}
            </div>
          </div>
        </div>

        {/* 2. VENDOR SUMMARY CARDS (5 Cards) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <MetricCard
            label="Total Orders Received"
            value={selectedVendor.totalOrdersReceived}
            subtext="All historical demands"
            icon={<Briefcase size={18} color="var(--brand-primary)" />}
            accentColor="var(--brand-primary)"
          />
          <MetricCard
            label="Completed Orders"
            value={selectedVendor.completedOrders}
            subtext={`${selectedVendor.totalOrdersReceived > 0 ? Math.round((selectedVendor.completedOrders / selectedVendor.totalOrdersReceived) * 100) : 0}% fulfillment rate`}
            icon={<CheckCircle2 size={18} color="var(--color-success)" />}
            accentColor="var(--color-success)"
          />
          <MetricCard
            label="Pending Orders"
            value={selectedVendor.pendingOrders}
            subtext="In fulfillment & dispatch"
            icon={<Clock size={18} color="var(--color-warning)" />}
            accentColor="var(--color-warning)"
          />
          <MetricCard
            label="Cancelled Orders"
            value={selectedVendor.cancelledOrders}
            subtext="Unassigned or aborted"
            icon={<AlertTriangle size={18} color="var(--color-danger)" />}
            accentColor="var(--color-danger)"
          />
          <MetricCard
            label="Total Revenue Generated"
            value={`₹${selectedVendor.totalRevenue.toLocaleString('en-IN')}`}
            subtext="Cumulative gross billings"
            icon={<DollarSign size={18} color="var(--brand-primary)" />}
            accentColor="var(--brand-purple)"
          />
        </div>

        {/* 3. PERFORMANCE & ANALYTICS GRAPH (Interactive Month-Wise Analytics) */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} color="var(--brand-primary)" />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Vendor Performance & Operational Analytics
                </h3>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Month-by-month demand trends, fulfillment consistency, and revenue trajectory
              </div>
            </div>

            {/* Metric Selector Tabs */}
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-surface-elevated)',
                padding: '0.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                gap: '0.25rem',
              }}
            >
              {[
                { id: 'REVENUE', label: 'Monthly Revenue' },
                { id: 'COMPLETED', label: 'Completed Orders' },
                { id: 'ACTIVE_DAYS', label: 'Active Days' },
                { id: 'PERFORMANCE', label: 'Order Performance' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setAnalyticsMetric(m.id as any);
                    setHoveredMonthIndex(null);
                  }}
                  style={{
                    background: analyticsMetric === m.id ? 'var(--brand-primary)' : 'transparent',
                    color: analyticsMetric === m.id ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Interactive Chart */}
          <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{ width: '100%', maxWidth: '900px', height: '240px', display: 'block', margin: '0 auto' }}
            >
              <defs>
                <linearGradient id="vendorBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0.25" />
                </linearGradient>
                <linearGradient id="vendorBarHoverGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.35" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = paddingY + plotHeight * (1 - pct);
                return (
                  <g key={idx}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="var(--border)"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 3}
                      fill="var(--text-muted)"
                      fontSize="9"
                      textAnchor="end"
                      fontFamily="inherit"
                    >
                      {analyticsMetric === 'REVENUE'
                        ? `₹${Math.round(maxVal * pct).toLocaleString('en-IN')}`
                        : Math.round(maxVal * pct)}
                    </text>
                  </g>
                );
              })}

              {/* Bars & Interactive Points */}
              {analytics.map((item, idx) => {
                const val =
                  analyticsMetric === 'REVENUE'
                    ? item.revenue
                    : analyticsMetric === 'COMPLETED'
                    ? item.completedOrders
                    : analyticsMetric === 'ACTIVE_DAYS'
                    ? item.activeDays
                    : item.fulfillmentRate;

                const barH = maxVal > 0 ? (val / maxVal) * plotHeight : 0;
                const x = paddingX + idx * colStep + (colStep - barWidth) / 2;
                const y = paddingY + (plotHeight - barH);
                const isHovered = hoveredMonthIndex === idx;

                return (
                  <g
                    key={idx}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredMonthIndex(idx)}
                    onMouseLeave={() => setHoveredMonthIndex(null)}
                  >
                    {/* Bar rectangle */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(4, barH)}
                      rx="4"
                      fill={isHovered ? 'url(#vendorBarHoverGrad)' : 'url(#vendorBarGrad)'}
                      stroke={isHovered ? '#10B981' : 'var(--brand-primary)'}
                      strokeWidth={isHovered ? '2' : '1'}
                      style={{ transition: 'all 0.2s ease' }}
                    />

                    {/* Month label at bottom */}
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight - 8}
                      fill={isHovered ? 'var(--text-primary)' : 'var(--text-muted)'}
                      fontSize="10"
                      fontWeight={isHovered ? '700' : '500'}
                      textAnchor="middle"
                      fontFamily="inherit"
                    >
                      {item.month}
                    </text>

                    {/* Value indicator on top of bar */}
                    <text
                      x={x + barWidth / 2}
                      y={Math.max(paddingY - 6, y - 6)}
                      fill={isHovered ? 'var(--text-primary)' : 'var(--text-muted)'}
                      fontSize="9"
                      fontWeight="700"
                      textAnchor="middle"
                      fontFamily="inherit"
                    >
                      {analyticsMetric === 'REVENUE' ? `₹${val}` : val}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Interactive Tooltip Card */}
          {hoveredMonthIndex !== null && analytics[hoveredMonthIndex] && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.85rem 1.25rem',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Period</span>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{analytics[hoveredMonthIndex].month}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Revenue</span>
                <div style={{ fontWeight: 800, color: 'var(--color-success)' }}>
                  ₹{analytics[hoveredMonthIndex].revenue.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completed Orders</span>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                  {analytics[hoveredMonthIndex].completedOrders} / {analytics[hoveredMonthIndex].totalOrders}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Days</span>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                  {analytics[hoveredMonthIndex].activeDays} days
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fulfillment</span>
                <div style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>
                  {analytics[hoveredMonthIndex].fulfillmentRate}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. VENDOR ORDER HISTORY TABLE */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} color="var(--brand-primary)" />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Vendor Order History & Fulfilled Demands
                </h3>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Complete audit records of vehicle bookings and logistics requirements
              </div>
            </div>

            {/* Timeframe Filter Buttons: Daily, Monthly, Yearly */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  background: 'var(--bg-surface-elevated)',
                  padding: '0.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  gap: '0.25rem',
                }}
              >
                {[
                  { id: 'ALL', label: 'All Time' },
                  { id: 'DAILY', label: 'Daily (Today)' },
                  { id: 'MONTHLY', label: 'Monthly' },
                  { id: 'YEARLY', label: 'Yearly' },
                ].map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => setOrderTimeframe(tf.id as any)}
                    style={{
                      background: orderTimeframe === tf.id ? 'var(--brand-primary)' : 'transparent',
                      color: orderTimeframe === tf.id ? '#ffffff' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* Status Filter Dropdown */}
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="POSTED">POSTED</option>
                <option value="DISPATCHING">DISPATCHING</option>
                <option value="FULFILLED">FULFILLED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="NO_DRIVER_AVAILABLE">NO DRIVER AVAILABLE</option>
              </select>

              {/* Search Orders */}
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Filter orders..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  style={{
                    padding: '0.4rem 0.75rem 0.4rem 2.2rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                    width: '180px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <DataTable
            columns={[
              {
                key: 'orderId',
                label: 'Order ID',
                sortable: true,
                render: (o: VendorOrderItem) => (
                  <span className="code-tag" style={{ fontWeight: 700 }}>
                    {o.orderId}
                  </span>
                ),
              },
              {
                key: 'orderDate',
                label: 'Order Date',
                sortable: true,
                render: (o: VendorOrderItem) => (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {new Date(o.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                ),
              },
              {
                key: 'customerName',
                label: 'Customer / Organization',
                render: (o: VendorOrderItem) => (
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{o.customerName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{o.customerContact}</div>
                  </div>
                ),
              },
              {
                key: 'serviceRequirement',
                label: 'Service / Requirement',
                render: (o: VendorOrderItem) => (
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {o.serviceRequirement}
                  </span>
                ),
              },
              {
                key: 'pickupLocation',
                label: 'Pickup Location',
                render: (o: VendorOrderItem) => (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={o.pickupLocation}>
                    {o.pickupLocation}
                  </div>
                ),
              },
              {
                key: 'deliveryLocation',
                label: 'Delivery Location',
                render: (o: VendorOrderItem) => (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={o.deliveryLocation}>
                    {o.deliveryLocation}
                  </div>
                ),
              },
              {
                key: 'assignedDriver',
                label: 'Assigned Driver',
                render: (o: VendorOrderItem) => (
                  <div style={{ fontSize: '0.8125rem' }}>
                    <div style={{ fontWeight: 600, color: o.assignedDriver !== 'Not Assigned' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {o.assignedDriver}
                    </div>
                    {o.driverPhone && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{o.driverPhone}</div>}
                  </div>
                ),
              },
              {
                key: 'orderAmount',
                label: 'Order Amount',
                sortable: true,
                render: (o: VendorOrderItem) => (
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    ₹{o.orderAmount.toLocaleString('en-IN')}
                  </span>
                ),
              },
              {
                key: 'paymentStatus',
                label: 'Payment',
                render: (o: VendorOrderItem) => <StatusBadge status={o.paymentStatus} size="sm" />,
              },
              {
                key: 'orderStatus',
                label: 'Order Status',
                render: (o: VendorOrderItem) => <StatusBadge status={o.orderStatus} size="sm" />,
              },
            ]}
            data={filteredVendorOrders}
            keyExtractor={(o) => o.id}
            loading={false}
            emptyTitle="No orders match the selected criteria"
            emptySubtitle="Adjust your search, status, or timeframe filters."
          />
        </div>
      </div>
    );
  }

  /* =========================================================================
   * 2. FULL-PAGE VIEW: USER DETAILS (Matches Driver Details)
   * ========================================================================= */
  if (selectedUser) {
    const filteredUserOrders = filterOrders(selectedUser.orders || []);

    return (
      <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
        {/* Top Navigation Bar with Back Button and Quick Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedUser(null);
                setActionType(null);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              <ArrowLeft size={16} />
              <span>Back to Users List</span>
            </Button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>Users</span>
              <span>/</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedUser.fullName}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenEditUser(selectedUser)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Edit3 size={15} />
              <span>Edit Profile</span>
            </Button>

            {selectedUser.status !== 'ACTIVE' && (
              <Button variant="success" size="sm" onClick={() => setActionType('ACTIVE')}>
                Activate Account
              </Button>
            )}

            {selectedUser.status === 'ACTIVE' && (
              <Button variant="danger" size="sm" onClick={() => setActionType('SUSPENDED')}>
                Deactivate / Suspend
              </Button>
            )}

            {selectedUser.status !== 'DEACTIVATED' && (
              <Button variant="secondary" size="sm" onClick={() => setActionType('DEACTIVATED')}>
                Block Account
              </Button>
            )}

            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                setDeleteTarget({
                  type: 'USER',
                  id: selectedUser.id,
                  name: selectedUser.fullName,
                  phone: selectedUser.phone,
                })
              }
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </Button>
          </div>
        </div>

        {/* Global Toast Alert */}
        {alert && (
          <div
            style={{
              padding: '0.875rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: alert.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              border: `1px solid ${alert.type === 'success' ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
              color: alert.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            <span>{alert.message}</span>
            <button
              onClick={() => setAlert(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Action Reason Banner */}
        {actionType && (
          <Card
            variant="accent"
            style={{
              marginBottom: '1.5rem',
              border: `1px solid ${actionType === 'ACTIVE' ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9375rem' }}>
                <AlertTriangle size={18} color={actionType === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-danger)'} />
                <span>Confirm User Status: {actionType === 'ACTIVE' ? 'Reactivate Account' : actionType === 'SUSPENDED' ? 'Deactivate Account' : 'Block Account'}</span>
              </div>
              <button
                onClick={() => setActionType(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block', fontSize: '0.8125rem' }}>
              Optional Reason / Audit Notes:
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Enter administrative notes for audit logging..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                marginBottom: '1rem',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button variant="outline" size="sm" onClick={() => setActionType(null)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                variant={actionType === 'ACTIVE' ? 'success' : 'danger'}
                size="sm"
                onClick={() => handleExecuteStatusAction('USER', selectedUser.id)}
                isLoading={actionLoading}
              >
                Execute {actionType}
              </Button>
            </div>
          </Card>
        )}

        {/* 1. TOP PROFILE DETAILS HEADER CARD */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem 1.75rem',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}
        >
          {/* User Avatar & Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(87, 40, 178, 0.25), rgba(91, 66, 243, 0.12))',
                border: '1.5px solid rgba(87, 40, 178, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 900,
                color: 'var(--brand-primary)',
                flexShrink: 0,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {selectedUser.profilePhotoUrl ? (
                <img
                  src={selectedUser.profilePhotoUrl}
                  alt={selectedUser.fullName}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                selectedUser.fullName.slice(0, 2).toUpperCase()
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {selectedUser.fullName}
                </h2>
                <StatusBadge status={selectedUser.status} size="sm" />
                <span className="code-tag" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  {selectedUser.role.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Subtitle details: Phone, Email, Location */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginTop: '0.5rem',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Phone size={14} color="var(--brand-primary)" />
                  <span>{selectedUser.phone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Mail size={14} color="var(--brand-primary)" />
                  <span>{selectedUser.email}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={14} color="var(--brand-orange)" />
                  <span>{selectedUser.city}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick User ID & Registration Details */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              flexWrap: 'wrap',
              borderLeft: '1px solid var(--border)',
              paddingLeft: '1.5rem',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                User ID
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                <span className="code-tag" style={{ fontSize: '0.8125rem' }}>{selectedUser.id.slice(0, 12)}...</span>
                <button
                  onClick={() => copyToClipboard(selectedUser.id, 'user-id')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem', color: 'var(--text-muted)' }}
                  title="Copy Full User ID"
                >
                  {copiedId === 'user-id' ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Registration Date
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                <Calendar size={14} color="var(--brand-primary)" />
                <span>{new Date(selectedUser.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>

            {selectedUser.corporateTenantName && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Enterprise Client
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--brand-primary)', marginTop: '0.25rem' }}>
                  {selectedUser.corporateTenantName}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. USER SUMMARY CARDS (5 Cards) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <MetricCard
            label="Total Orders"
            value={selectedUser.totalOrders}
            subtext="All booking demands"
            icon={<Briefcase size={18} color="var(--brand-primary)" />}
            accentColor="var(--brand-primary)"
          />
          <MetricCard
            label="Completed Orders"
            value={selectedUser.completedOrders}
            subtext={`${selectedUser.totalOrders > 0 ? Math.round((selectedUser.completedOrders / selectedUser.totalOrders) * 100) : 0}% completion`}
            icon={<CheckCircle2 size={18} color="var(--color-success)" />}
            accentColor="var(--color-success)"
          />
          <MetricCard
            label="Pending Orders"
            value={selectedUser.pendingOrders}
            subtext="Active in queue"
            icon={<Clock size={18} color="var(--color-warning)" />}
            accentColor="var(--color-warning)"
          />
          <MetricCard
            label="Cancelled Orders"
            value={selectedUser.cancelledOrders}
            subtext="Aborted or expired"
            icon={<AlertTriangle size={18} color="var(--color-danger)" />}
            accentColor="var(--color-danger)"
          />
          <MetricCard
            label="Total Amount Spent"
            value={`₹${selectedUser.totalAmountSpent.toLocaleString('en-IN')}`}
            subtext="Gross fulfilled value"
            icon={<DollarSign size={18} color="var(--brand-primary)" />}
            accentColor="var(--brand-purple)"
          />
        </div>

        {/* 3. USER LOCATION AND ACTIVITY SECTION */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Left: Location & Map View */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Navigation size={18} color="var(--brand-primary)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                User Location & Geocoding
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Registered Address
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {selectedUser.address}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    City & State
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                    {selectedUser.city}{selectedUser.state && selectedUser.state !== 'Not Available' ? `, ${selectedUser.state}` : ''}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Coordinates
                  </div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: selectedUser.latitude ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {selectedUser.latitude && selectedUser.longitude
                      ? `${selectedUser.latitude.toFixed(4)}° N, ${selectedUser.longitude.toFixed(4)}° E`
                      : 'Coordinates not provided'}
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Map View Preview */}
            <div
              style={{
                width: '100%',
                height: '180px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Background styled grid pattern mimicking map routes */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.15,
                  backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Pinpoint Indicator */}
              <div
                style={{
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'var(--brand-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 0 16px rgba(87, 40, 178, 0.6)',
                  }}
                >
                  <MapPin size={20} />
                </div>
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(4px)',
                    padding: '0.25rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                >
                  {selectedUser.city !== 'Not Available' ? selectedUser.city : 'Registered Base'}
                </div>
              </div>

              {selectedUser.latitude && selectedUser.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${selectedUser.latitude},${selectedUser.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    background: 'rgba(0, 0, 0, 0.75)',
                    color: '#ffffff',
                    padding: '0.3rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    zIndex: 3,
                  }}
                >
                  <span>Open Maps</span>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>

          {/* Right: Recent Activity History */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Activity size={18} color="var(--brand-primary)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Recent Login & Audit History
              </h3>
            </div>

            {selectedUser.activityLogs && selectedUser.activityLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, overflowY: 'auto', maxHeight: '310px' }}>
                {selectedUser.activityLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {log.action}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {log.details || 'System event recorded'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                }}
              >
                No administrative audit anomalies recorded for this user.
              </div>
            )}
          </div>
        </div>

        {/* 4. USER ORDER HISTORY TABLE */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} color="var(--brand-primary)" />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  User Booking & Order History
                </h3>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Breakdown of vehicle reservations, driver assignments, and trip fulfillments
              </div>
            </div>

            {/* Filter controls: Daily, Monthly, Yearly */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  background: 'var(--bg-surface-elevated)',
                  padding: '0.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  gap: '0.25rem',
                }}
              >
                {[
                  { id: 'ALL', label: 'All Time' },
                  { id: 'DAILY', label: 'Daily (Today)' },
                  { id: 'MONTHLY', label: 'Monthly' },
                  { id: 'YEARLY', label: 'Yearly' },
                ].map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => setOrderTimeframe(tf.id as any)}
                    style={{
                      background: orderTimeframe === tf.id ? 'var(--brand-primary)' : 'transparent',
                      color: orderTimeframe === tf.id ? '#ffffff' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="POSTED">POSTED</option>
                <option value="DISPATCHING">DISPATCHING</option>
                <option value="FULFILLED">FULFILLED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>

              {/* Search Orders */}
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  style={{
                    padding: '0.4rem 0.75rem 0.4rem 2.2rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                    width: '180px',
                  }}
                />
              </div>
            </div>
          </div>

          <DataTable
            columns={[
              {
                key: 'orderId',
                label: 'Order ID',
                sortable: true,
                render: (o: UserOrderItem) => <span className="code-tag">{o.orderId}</span>,
              },
              {
                key: 'orderDate',
                label: 'Order Date',
                sortable: true,
                render: (o: UserOrderItem) => (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {new Date(o.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                ),
              },
              {
                key: 'serviceDetails',
                label: 'Service / Requirement',
                render: (o: UserOrderItem) => (
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {o.serviceDetails}
                  </span>
                ),
              },
              {
                key: 'assignedDriver',
                label: 'Assigned Driver / Vendor',
                render: (o: UserOrderItem) => (
                  <div style={{ fontSize: '0.8125rem' }}>
                    <div style={{ fontWeight: 600, color: o.assignedDriver !== 'Not Assigned' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {o.assignedDriver}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{o.assignedVendor}</div>
                  </div>
                ),
              },
              {
                key: 'pickupLocation',
                label: 'Pickup Location',
                render: (o: UserOrderItem) => (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={o.pickupLocation}>
                    {o.pickupLocation}
                  </div>
                ),
              },
              {
                key: 'deliveryLocation',
                label: 'Delivery Location',
                render: (o: UserOrderItem) => (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={o.deliveryLocation}>
                    {o.deliveryLocation}
                  </div>
                ),
              },
              {
                key: 'orderAmount',
                label: 'Amount',
                sortable: true,
                render: (o: UserOrderItem) => (
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    ₹{o.orderAmount.toLocaleString('en-IN')}
                  </span>
                ),
              },
              {
                key: 'paymentStatus',
                label: 'Payment',
                render: (o: UserOrderItem) => <StatusBadge status={o.paymentStatus} size="sm" />,
              },
              {
                key: 'orderStatus',
                label: 'Status',
                render: (o: UserOrderItem) => <StatusBadge status={o.orderStatus} size="sm" />,
              },
            ]}
            data={filteredUserOrders}
            keyExtractor={(o) => o.id}
            loading={false}
            emptyTitle="No orders on file"
            emptySubtitle="No booking transactions match the active criteria for this user account."
          />
        </div>
      </div>
    );
  }

  /* =========================================================================
   * 3. MAIN LISTING VIEW: CORPORATE VENDORS & USERS HUB
   * ========================================================================= */
  const vendorColumns: Column<VendorListItem>[] = [
    {
      key: 'companyName',
      label: 'Organization & Contact',
      sortable: true,
      render: (u) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-primary-subtle)',
              border: '1px solid rgba(87, 40, 178, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-primary)',
              flexShrink: 0,
            }}
          >
            <Building2 size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
              {u.companyName || u.organizationName || 'Corporate Partner'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              {u.contactPerson && u.contactPerson !== u.companyName
                ? `${u.contactPerson}${u.phone ? ` • ${u.phone}` : ''}`
                : (u.phone || u.email || 'Corporate Account')}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (u) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {u.email || '—'}
        </span>
      ),
    },
    {
      key: 'verificationStatus',
      label: 'Verification Status',
      sortable: true,
      render: (u) => <StatusBadge status={u.verificationStatus} size="sm" />,
    },
    {
      key: 'requirementsCount',
      label: 'Demands Posted',
      sortable: true,
      render: (u) => (
        <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
          {u.requirementsCount ?? 0}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Registered Date',
      sortable: true,
      render: (u) => (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'right',
      render: (u) => (
        <div style={{ display: 'flex', gap: '0.45rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button
            variant={u.verificationStatus === 'PENDING' ? 'primary' : 'secondary'}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenVendorDetails(u);
            }}
          >
            {u.verificationStatus === 'PENDING' ? 'Review Application →' : 'View Details →'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditVendor(u);
            }}
            title="Edit Vendor Details"
            style={{ padding: '0.35rem 0.65rem' }}
          >
            <Edit3 size={13} style={{ marginRight: '0.25rem' }} /> Edit
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget({
                type: 'VENDOR',
                id: u.id,
                name: u.companyName || u.contactPerson,
                phone: u.phone,
              });
            }}
            title="Permanently Delete Vendor from Database"
            style={{ padding: '0.35rem 0.65rem' }}
          >
            <Trash2 size={13} style={{ marginRight: '0.25rem' }} /> Delete
          </Button>
        </div>
      ),
    },
  ];

  const userColumns: Column<UserListItem>[] = [
    {
      key: 'fullName',
      label: 'User Name & Contact',
      sortable: true,
      render: (u) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(87, 40, 178, 0.2), rgba(91, 66, 243, 0.08))',
              border: '1px solid rgba(87, 40, 178, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem',
              color: 'var(--brand-primary)',
              flexShrink: 0,
            }}
          >
            {u.fullName ? u.fullName.slice(0, 2).toUpperCase() : 'U'}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
              {u.fullName}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              {u.phone !== 'Not Available' ? u.phone : (u.email || 'Platform User')}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role & Type',
      sortable: true,
      render: (u) => (
        <span className="code-tag" style={{ fontSize: '0.72rem', textTransform: 'uppercase' }}>
          {u.role.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Account Status',
      sortable: true,
      render: (u) => <StatusBadge status={u.status} size="sm" />,
    },
    {
      key: 'email',
      label: 'Email Address',
      render: (u) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {u.email}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Registered Date',
      sortable: true,
      render: (u) => (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      align: 'right',
      render: (u) => (
        <div style={{ display: 'flex', gap: '0.45rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenUserDetails(u);
            }}
          >
            View Details →
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditUser(u);
            }}
            title="Edit User Profile"
            style={{ padding: '0.35rem 0.65rem' }}
          >
            <Edit3 size={13} style={{ marginRight: '0.25rem' }} /> Edit
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget({
                type: 'USER',
                id: u.id,
                name: u.fullName,
                phone: u.phone,
              });
            }}
            title="Permanently Delete User from Database"
            style={{ padding: '0.35rem 0.65rem' }}
          >
            <Trash2 size={13} style={{ marginRight: '0.25rem' }} /> Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Users & Corporate Vendors"
        subtitle="Lifecycle oversight of enterprise clients, retail passengers, and vendor accounts across the AdhocX platform"
        liveStatus="Accounts Active"
      />

      {/* Global Toast / Feedback */}
      {alert && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: alert.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            border: `1px solid ${alert.type === 'success' ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
            color: alert.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <span>{alert.message}</span>
          <button
            onClick={() => setAlert(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* TOP-LEVEL DUAL-SECTION SWITCHER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--bg-surface-elevated)',
          padding: '0.35rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          width: 'fit-content',
          marginBottom: '1.5rem',
        }}
      >
        <button
          onClick={() => setActiveSection('VENDORS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeSection === 'VENDORS' ? 'var(--brand-primary)' : 'transparent',
            color: activeSection === 'VENDORS' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Building2 size={16} />
          <span>Corporate Vendors</span>
          <span
            style={{
              padding: '0.1rem 0.45rem',
              borderRadius: 'var(--radius-pill)',
              background: activeSection === 'VENDORS' ? 'rgba(255, 255, 255, 0.22)' : 'var(--bg-card)',
              fontSize: '0.72rem',
              fontWeight: 800,
            }}
          >
            {vendors.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('USERS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeSection === 'USERS' ? 'var(--brand-primary)' : 'transparent',
            color: activeSection === 'USERS' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Users size={16} />
          <span>Users & Enterprise Accounts</span>
          <span
            style={{
              padding: '0.1rem 0.45rem',
              borderRadius: 'var(--radius-pill)',
              background: activeSection === 'USERS' ? 'rgba(255, 255, 255, 0.22)' : 'var(--bg-card)',
              fontSize: '0.72rem',
              fontWeight: 800,
            }}
          >
            {users.length}
          </span>
        </button>
      </div>

      {/* SECTION 1: CORPORATE VENDORS TABLE */}
      {activeSection === 'VENDORS' && (
        <div>
          <FilterBar
            tabs={VENDOR_STATUS_TABS}
            activeTab={vendorTab}
            onTabChange={setVendorTab}
            search={vendorSearch}
            onSearchChange={setVendorSearch}
            searchPlaceholder="Search by company name, contact, phone, or email..."
          />

          <DataTable
            columns={vendorColumns}
            data={filteredVendors}
            keyExtractor={(u) => u.id}
            loading={vendorsLoading}
            onRowClick={(u) => handleOpenVendorDetails(u)}
            emptyTitle="No corporate vendor accounts found"
            emptySubtitle={`No vendor organizations match the filter criteria "${vendorTab}".`}
          />
        </div>
      )}

      {/* SECTION 2: PLATFORM USERS TABLE */}
      {activeSection === 'USERS' && (
        <div>
          <FilterBar
            tabs={USER_STATUS_TABS}
            activeTab={userTab}
            onTabChange={setUserTab}
            search={userSearch}
            onSearchChange={setUserSearch}
            searchPlaceholder="Search by user name, phone, email, or user ID..."
            extraFilters={
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={15} color="var(--text-muted)" />
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                  }}
                >
                  {USER_ROLE_FILTERS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            }
          />

          <DataTable
            columns={userColumns}
            data={filteredUsers}
            keyExtractor={(u) => u.id}
            loading={usersLoading}
            onRowClick={(u) => handleOpenUserDetails(u)}
            emptyTitle="No platform user accounts found"
            emptySubtitle={`No user records match the filter criteria "${userTab}".`}
          />
        </div>
      )}

      {/* EDIT CORPORATE VENDOR MODAL */}
      {editingVendor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => !editLoading && setEditingVendor(null)}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Edit Corporate Vendor
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Update enterprise credentials and contact information
                </div>
              </div>
              <button
                onClick={() => setEditingVendor(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  value={editFormData.organizationName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, organizationName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={editFormData.contactPerson || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, contactPerson: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    GST / Tax Identifier
                  </label>
                  <input
                    type="text"
                    value={editFormData.gstNumber || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, gstNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Registered Address
                </label>
                <textarea
                  rows={2}
                  value={editFormData.address || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <Button variant="secondary" size="md" onClick={() => setEditingVendor(null)} disabled={editLoading}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" onClick={handleSaveVendorEdit} isLoading={editLoading}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER PROFILE MODAL */}
      {editingUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => !editLoading && setEditingUser(null)}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Edit User Profile
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Update user information, contact details, and account standing
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Full Legal Name
                </label>
                <input
                  type="text"
                  value={editFormData.fullName || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Account Standing
                </label>
                <select
                  value={editFormData.status || 'ACTIVE'}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="ACTIVE">ACTIVE — Normal Operations</option>
                  <option value="SUSPENDED">SUSPENDED — Temporary Hold</option>
                  <option value="DEACTIVATED">DEACTIVATED / BLOCKED</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Registered Address
                </label>
                <textarea
                  rows={2}
                  value={editFormData.address || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <Button variant="secondary" size="md" onClick={() => setEditingUser(null)} disabled={editLoading}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" onClick={handleSaveUserEdit} isLoading={editLoading}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => !deleteLoading && setDeleteTarget(null)}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '460px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-danger)',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Permanently Delete {deleteTarget.type === 'VENDOR' ? 'Corporate Vendor' : 'User Account'}?
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Irreversible database removal
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 1.25rem 0' }}>
              Are you sure you want to permanently delete{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {deleteTarget.name} {deleteTarget.phone ? `(${deleteTarget.phone})` : ''}
              </strong>{' '}
              from the AdhocX database? All associated vendor records, requirements, trips, and authentication sessions will be permanently purged.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="secondary" size="md" disabled={deleteLoading} onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="md" loading={deleteLoading} onClick={handleExecuteDelete}>
                Permanently Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

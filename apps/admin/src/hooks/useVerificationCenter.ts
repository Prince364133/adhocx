'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { adminApi } from '../lib/api/client';
import { VerificationItem, DriverListItem, VendorListItem } from '../lib/api/types';

export type EntityFilter = 'ALL' | 'DRIVER' | 'VENDOR';
export type StatusFilter = 'ALL' | 'UNDER_REVIEW' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export function useVerificationCenter() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('UNDER_REVIEW');
  const [selectedItem, setSelectedItem] = useState<VerificationItem | null>(null);

  const loadVerifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [drivers, vendors] = await Promise.all([
        adminApi.getDrivers().catch(() => [] as DriverListItem[]),
        adminApi.getVendors().catch(() => [] as VendorListItem[]),
      ]);

      const normalizedDrivers: VerificationItem[] = (drivers || []).map((d: any) => {
        let docs: any[] = [];
        if (Array.isArray(d.kycDocuments) && d.kycDocuments.length > 0) {
          docs = d.kycDocuments.map((doc: any, idx: number) => ({
            id: `${d.id}_doc_${idx}`,
            documentType: doc.type || 'DOCUMENT',
            title: doc.title || doc.type || `Document ${idx + 1}`,
            fileUrl: doc.url || doc.fileUrl,
            verified: d.verificationStatus === 'VERIFIED',
            uploadedAt: d.updatedAt || d.createdAt,
          }));
        } else if (Array.isArray(d.documents) && d.documents.length > 0) {
          docs = d.documents;
        } else {
          docs = [
            ...(d.dlFrontUrl ? [{ id: `${d.id}_dl_front`, documentType: 'DRIVING_LICENSE_FRONT', title: 'Driving License (Front)', fileUrl: d.dlFrontUrl, verified: d.verificationStatus === 'VERIFIED', uploadedAt: d.createdAt }] : []),
            ...(d.dlBackUrl ? [{ id: `${d.id}_dl_back`, documentType: 'DRIVING_LICENSE_BACK', title: 'Driving License (Back)', fileUrl: d.dlBackUrl, verified: d.verificationStatus === 'VERIFIED', uploadedAt: d.createdAt }] : []),
            ...(d.rcDocUrl ? [{ id: `${d.id}_rc`, documentType: 'RC_BOOK', title: 'Vehicle RC Book', fileUrl: d.rcDocUrl, verified: d.verificationStatus === 'VERIFIED', uploadedAt: d.createdAt }] : []),
            ...(d.insuranceDocUrl ? [{ id: `${d.id}_ins`, documentType: 'INSURANCE', title: 'Vehicle Insurance', fileUrl: d.insuranceDocUrl, verified: d.verificationStatus === 'VERIFIED', uploadedAt: d.createdAt }] : []),
            ...(d.vehiclePhotoUrl ? [{ id: `${d.id}_veh`, documentType: 'VEHICLE_PHOTO', title: 'Vehicle Photo', fileUrl: d.vehiclePhotoUrl, verified: d.verificationStatus === 'VERIFIED', uploadedAt: d.createdAt }] : []),
            ...(d.aadharFrontUrl ? [{ id: `${d.id}_aadhar_front`, documentType: 'AADHAR_FRONT', title: 'Aadhar Card (Front)', fileUrl: d.aadharFrontUrl, verified: d.verificationStatus === 'VERIFIED', uploadedAt: d.createdAt }] : []),
            ...(d.aadharBackUrl ? [{ id: `${d.id}_aadhar_back`, documentType: 'AADHAR_BACK', title: 'Aadhar Card (Back)', fileUrl: d.aadharBackUrl, verified: d.verificationStatus === 'VERIFIED', uploadedAt: d.createdAt }] : []),
            ...(d.panDocUrl ? [{ id: `${d.id}_pan`, documentType: 'PAN_CARD', title: 'PAN Card', fileUrl: d.panDocUrl, verified: d.verificationStatus === 'VERIFIED', uploadedAt: d.createdAt }] : []),
          ];
        }

        return {
          id: d.id,
          entityType: 'DRIVER',
          name: d.fullName || 'Driver Applicant',
          phone: d.phone || '',
          verificationStatus: d.verificationStatus || 'UNDER_REVIEW',
          rejectionReason: d.rejectionReason,
          vehiclePlate: d.vehiclePlate || d.rcNumber || '',
          vehicleType: d.vehicleType || '',
          vehicleModel: d.vehicleModel || '',
          location: d.currentLocationAddress ? {
            latitude: d.currentLat || 0,
            longitude: d.currentLng || 0,
            address: d.currentLocationAddress,
          } : undefined,
          documents: docs,
          submittedAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt,
        };
      });

      const normalizedVendors: VerificationItem[] = (vendors || []).map((v: any) => ({
        id: v.id,
        entityType: 'VENDOR',
        name: v.fullName || v.contactPerson || 'Vendor Partner',
        organizationName: v.organizationName || v.companyName || '',
        phone: v.phone || '',
        verificationStatus: v.verificationStatus || 'UNDER_REVIEW',
        rejectionReason: v.rejectionReason,
        gstNumber: v.gstNumber || '',
        address: v.address || '',
        location: v.address ? {
          latitude: 0,
          longitude: 0,
          address: v.address,
        } : undefined,
        documents: Array.isArray(v.documents) ? v.documents : [],
        submittedAt: v.createdAt || new Date().toISOString(),
        updatedAt: v.updatedAt,
      }));

      const combined = [...normalizedDrivers, ...normalizedVendors];
      setItems(combined);
    } catch (e: any) {
      setError(e.message || 'Failed to load verification queue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVerifications();
  }, [loadVerifications]);

  // Filtered Items Computation
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Entity filter
      if (entityFilter !== 'ALL' && item.entityType !== entityFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && item.verificationStatus !== statusFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesOrg = item.organizationName?.toLowerCase().includes(query) || false;
        const matchesPhone = item.phone.includes(query);
        const matchesPlate = item.vehiclePlate?.toLowerCase().includes(query) || false;
        const matchesGst = item.gstNumber?.toLowerCase().includes(query) || false;

        return matchesName || matchesOrg || matchesPhone || matchesPlate || matchesGst;
      }

      return true;
    });
  }, [items, entityFilter, statusFilter, searchQuery]);

  // Summary Metrics Computation
  const stats = useMemo(() => {
    const underReview = items.filter((i) => i.verificationStatus === 'UNDER_REVIEW').length;
    const driversPending = items.filter(
      (i) => i.entityType === 'DRIVER' && i.verificationStatus === 'UNDER_REVIEW',
    ).length;
    const vendorsPending = items.filter(
      (i) => i.entityType === 'VENDOR' && i.verificationStatus === 'UNDER_REVIEW',
    ).length;
    const verifiedTotal = items.filter((i) => i.verificationStatus === 'VERIFIED').length;
    const rejectedTotal = items.filter((i) => i.verificationStatus === 'REJECTED').length;

    return {
      underReview,
      driversPending,
      vendorsPending,
      verifiedTotal,
      rejectedTotal,
      totalQueue: items.length,
    };
  }, [items]);

  const updateItemStatus = useCallback(
    (id: string, status: 'VERIFIED' | 'REJECTED', reason?: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                verificationStatus: status,
                rejectionReason: reason,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );

      if (selectedItem && selectedItem.id === id) {
        setSelectedItem((prev) =>
          prev
            ? {
                ...prev,
                verificationStatus: status,
                rejectionReason: reason,
                updatedAt: new Date().toISOString(),
              }
            : null,
        );
      }
    },
    [selectedItem],
  );

  return {
    items: filteredItems,
    allItems: items,
    stats,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    entityFilter,
    setEntityFilter,
    statusFilter,
    setStatusFilter,
    selectedItem,
    setSelectedItem,
    refreshQueue: loadVerifications,
    updateItemStatus,
  };
}

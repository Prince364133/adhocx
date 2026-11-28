'use client';

import React from 'react';
import { ContentLoadingSkeleton, PageLoadingSkeleton, SkeletonBone } from '@adhocx/ui/page-loading';

export const DashboardSkeleton: React.FC = () => (
  <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading fleet dashboard">
    <div className="fleet-card flex items-center justify-between gap-4">
      <div className="flex flex-col gap-2" style={{ width: '260px' }}>
        <SkeletonBone style={{ height: '22px', width: '75%' }} />
        <SkeletonBone style={{ height: '14px', width: '55%' }} />
      </div>
      <SkeletonBone style={{ height: '36px', width: '160px' }} />
    </div>
    <PageLoadingSkeleton variant="dashboard" />
  </div>
);

export const TablePageSkeleton: React.FC = () => (
  <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading table view">
    <div className="fleet-card flex items-center justify-between gap-3">
      <SkeletonBone style={{ height: '34px', width: '280px' }} />
      <SkeletonBone style={{ height: '34px', width: '140px' }} />
    </div>
    <PageLoadingSkeleton variant="table" />
  </div>
);

export const DrawerSkeleton: React.FC = () => (
  <div className="flex flex-col gap-3 p-4" aria-busy="true" aria-label="Loading details drawer">
    <SkeletonBone style={{ height: '24px', width: '60%' }} />
    <SkeletonBone style={{ height: '14px', width: '40%' }} />
    <ContentLoadingSkeleton kind="drawer" count={4} />
  </div>
);

export const CardsGridSkeleton: React.FC = () => (
  <div
    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}
    aria-busy="true"
  >
    {[0, 1, 2, 3].map((idx) => (
      <div key={idx} className="fleet-card flex flex-col gap-2">
        <SkeletonBone style={{ height: '14px', width: '50%' }} />
        <SkeletonBone style={{ height: '28px', width: '70%' }} />
        <SkeletonBone style={{ height: '12px', width: '65%' }} />
      </div>
    ))}
  </div>
);

export const DetailPanelSkeleton: React.FC = () => (
  <div className="fleet-card" aria-busy="true">
    <PageLoadingSkeleton variant="detail" />
  </div>
);

'use client';

import dynamic from 'next/dynamic';
import { ContentLoadingSkeleton } from '@adhocx/ui/page-loading';

export const LazyAreaTrendChart = dynamic(
  () => import('./AreaTrendChart').then((mod) => mod.AreaTrendChart),
  {
    ssr: false,
    loading: () => (
      <ContentLoadingSkeleton
        kind="chart"
        height={210}
        label="Loading trend chart…"
      />
    ),
  },
);

export const LazyBarComparisonChart = dynamic(
  () => import('./BarComparisonChart').then((mod) => mod.BarComparisonChart),
  {
    ssr: false,
    loading: () => (
      <ContentLoadingSkeleton
        kind="chart"
        height={220}
        label="Loading comparison chart…"
      />
    ),
  },
);

export const LazyDonutChart = dynamic(
  () => import('./DonutChart').then((mod) => mod.DonutChart),
  {
    ssr: false,
    loading: () => (
      <ContentLoadingSkeleton
        kind="chart"
        height={185}
        label="Loading breakdown chart…"
      />
    ),
  },
);

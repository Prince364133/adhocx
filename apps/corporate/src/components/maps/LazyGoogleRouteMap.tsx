'use client';

import dynamic from 'next/dynamic';
import { ContentLoadingSkeleton } from '@adhocx/ui/page-loading';

export type { GoogleRouteMapStop } from './GoogleRouteMap';

export const LazyGoogleRouteMap = dynamic(
  () => import('./GoogleRouteMap').then((mod) => mod.GoogleRouteMap),
  {
    ssr: false,
    loading: () => (
      <ContentLoadingSkeleton
        kind="map"
        height={360}
        label="Loading interactive route map…"
      />
    ),
  },
);

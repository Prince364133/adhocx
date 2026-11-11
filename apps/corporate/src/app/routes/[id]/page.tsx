'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CorporateRouteDetailView } from '../../../components/routes/CorporateRouteDetailView';

export default function CorporateRouteDetailPage() {
  const params = useParams<{ id: string }>();
  const routeId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  return <CorporateRouteDetailView routeId={routeId} />;
}

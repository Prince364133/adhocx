'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { OpsRouteDetailView } from '../../../components/routes/OpsRouteDetailView';

export default function OpsRouteDetailPage() {
  const params = useParams<{ id: string }>();
  const routeId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';

  return <OpsRouteDetailView routeId={routeId} />;
}

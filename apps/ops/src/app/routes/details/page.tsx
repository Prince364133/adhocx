'use client';

import React, { useEffect, useState } from 'react';
import { OpsRouteDetailView } from '../../../components/routes/OpsRouteDetailView';

export default function OpsRouteDetailQueryPage() {
  const [routeId, setRouteId] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const qs = new URLSearchParams(window.location.search);
      setRouteId(qs.get('id') || '');
    }
  }, []);

  if (!routeId) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
        Select a route from the Corporate Routes page to inspect map and directions.
      </div>
    );
  }

  return <OpsRouteDetailView routeId={routeId} />;
}

'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PricingMatrixWorkspace, { MatrixRole } from '../matrix/PricingMatrixWorkspace';

function DetailPageContent() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type') || searchParams.get('role');
  const role: MatrixRole = typeParam === 'driver' ? 'driver' : typeParam === 'unified' ? 'unified' : 'vendor';

  return <PricingMatrixWorkspace initialRole={role} />;
}

export default function PricingDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Pricing Studio Workspace...</div>}>
      <DetailPageContent />
    </Suspense>
  );
}

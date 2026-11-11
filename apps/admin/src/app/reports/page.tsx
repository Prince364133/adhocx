'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/finance');
  }, [router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Redirecting to Finance Dashboard...</p>
    </div>
  );
}

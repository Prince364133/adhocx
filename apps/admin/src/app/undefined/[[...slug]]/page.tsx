'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UndefinedRouteFallback() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const slug = params?.slug;
    const target = Array.isArray(slug) ? `/${slug.join('/')}` : slug ? `/${slug}` : '/dashboard';
    router.replace(target);
  }, [params, router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Redirecting to page...</p>
    </div>
  );
}


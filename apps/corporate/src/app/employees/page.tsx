'use client';

import { Suspense } from 'react';
import EmployeeDirectory from './EmployeeDirectory';

export default function EmployeeDirectoryPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: 'var(--text-muted)' }}>Loading employee directory…</div>}>
      <EmployeeDirectory />
    </Suspense>
  );
}

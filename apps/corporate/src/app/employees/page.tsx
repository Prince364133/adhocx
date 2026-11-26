'use client';

import { Suspense } from 'react';
import { PageLoadingSkeleton } from '@adhocx/ui/page-loading';
import EmployeeDirectory from './EmployeeDirectory';

export default function EmployeeDirectoryPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant="table" />}>
      <EmployeeDirectory />
    </Suspense>
  );
}

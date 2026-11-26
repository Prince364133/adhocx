'use client';

import React from 'react';
import { SkeletonBone } from '@adhocx/ui/page-loading';

export function TableSkeletonRows({
  columns,
  rows = 6,
  cellPadding = '14px 16px',
}: {
  columns: number;
  rows?: number;
  cellPadding?: string;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex} aria-hidden="true">
          {Array.from({ length: columns }, (_, colIndex) => (
            <td key={colIndex} style={{ padding: cellPadding }}>
              <SkeletonBone
                style={{
                  width: colIndex === 0 ? '60%' : colIndex === columns - 1 ? '45%' : '82%',
                  height: 13,
                  borderRadius: 6,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default TableSkeletonRows;

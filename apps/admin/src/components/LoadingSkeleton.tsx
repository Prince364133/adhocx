import React from 'react';

export const TableLoadingSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 6,
}) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx}>
          {Array.from({ length: columns }).map((_, cIdx) => (
            <td key={cIdx} style={{ padding: '1rem 1.25rem' }}>
              <div
                className="animate-shimmer"
                style={{
                  height: '16px',
                  width: cIdx === 0 ? '60%' : cIdx === 1 ? '80%' : '70%',
                  borderRadius: 'var(--radius-xs)',
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export const CardLoadingSkeleton: React.FC = () => {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem' }}>
      <div className="animate-shimmer" style={{ height: '14px', width: '40%', borderRadius: 'var(--radius-xs)' }} />
      <div className="animate-shimmer" style={{ height: '32px', width: '60%', borderRadius: 'var(--radius-sm)' }} />
      <div className="animate-shimmer" style={{ height: '12px', width: '80%', borderRadius: 'var(--radius-xs)' }} />
    </div>
  );
};

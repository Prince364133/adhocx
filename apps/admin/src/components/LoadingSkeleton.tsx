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
            <td key={cIdx}>
              <div
                className="skeleton"
                style={{
                  height: '16px',
                  width: cIdx === 0 ? '60%' : cIdx === 1 ? '80%' : '70%',
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
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="skeleton" style={{ height: '14px', width: '40%' }} />
      <div className="skeleton" style={{ height: '32px', width: '60%' }} />
      <div className="skeleton" style={{ height: '12px', width: '80%' }} />
    </div>
  );
};

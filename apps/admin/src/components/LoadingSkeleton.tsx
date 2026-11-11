import React from 'react';

export const TableLoadingSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 5,
}) => {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {[...Array(columns)].map((_, i) => (
              <th key={i}>
                <div
                  className="animate-shimmer"
                  style={{ height: '11px', width: '64%', borderRadius: 'var(--radius-xs)' }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, rowIndex) => (
            <tr key={rowIndex}>
              {[...Array(columns)].map((_, colIndex) => (
                <td key={colIndex}>
                  <div
                    className="animate-shimmer"
                    style={{
                      height: '13px',
                      width: colIndex === 0 ? '80%' : '62%',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const CardLoadingSkeleton: React.FC = () => {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', padding: '1rem' }}>
      <div className="animate-shimmer" style={{ height: '12px', width: '42%', borderRadius: 'var(--radius-xs)' }} />
      <div className="animate-shimmer" style={{ height: '24px', width: '58%', borderRadius: 'var(--radius-sm)' }} />
      <div className="animate-shimmer" style={{ height: '11px', width: '76%', borderRadius: 'var(--radius-xs)' }} />
    </div>
  );
};

"use client";

import React from "react";

export const TableLoadingSkeleton: React.FC<{
  rows?: number;
  columns?: number;
}> = ({ rows = 5, columns = 5 }) => {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {[...Array(columns)].map((_, i) => (
              <th key={i}>
                <div
                  className="animate-shimmer skeleton-line"
                  style={{ width: "64%" }}
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
                    className="animate-shimmer skeleton-line"
                    style={{
                      height: "13px",
                      width: colIndex === 0 ? "80%" : "62%",
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

export const CardLoadingSkeleton: React.FC<{ count?: number }> = ({
  count = 1,
}) => {
  return (
    <>
      {[...Array(count)].map((_, idx) => (
        <div key={idx} className="card flex flex-col gap-2 p-4">
          <div
            className="animate-shimmer skeleton-line"
            style={{ width: "42%" }}
          />
          <div
            className="animate-shimmer skeleton-line"
            style={{ height: "22px", width: "58%" }}
          />
          <div
            className="animate-shimmer skeleton-line"
            style={{ width: "76%" }}
          />
        </div>
      ))}
    </>
  );
};

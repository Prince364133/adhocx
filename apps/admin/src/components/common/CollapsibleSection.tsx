"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  headerRight?: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  icon,
  badge,
  headerRight,
  defaultOpen = false,
  isOpen: controlledOpen,
  onToggle,
  children,
  style = {},
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleToggle = () => {
    const next = !open;
    if (onToggle) onToggle(next);
    if (controlledOpen === undefined) setInternalOpen(next);
  };

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: "hidden",
        ...style,
      }}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between bg-card border-0 cursor-pointer text-left text-primary"
        style={{
          gap: "0.65rem",
          padding: "1rem 1.05rem 0.84rem",
          transition: "background-color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--bg-card-elevated)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--bg-card)";
        }}
      >
        <div className="flex items-center gap-medium min-w-0 flex-1">
          {icon && (
            <span className="text-brand inline-flex items-center flex-shrink-0">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-title-sm font-bold text-primary"
                style={{ lineHeight: 1.3 }}
              >
                {title}
              </span>
              {badge}
            </div>
            {subtitle && (
              <div
                className="text-muted"
                style={{ fontSize: "0.71rem", marginTop: "0.1rem" }}
              >
                {subtitle}
              </div>
            )}
          </div>
        </div>

        <div
          className="flex items-center flex-shrink-0"
          style={{ gap: "0.65rem" }}
        >
          {headerRight && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center"
            >
              {headerRight}
            </div>
          )}
          <span
            className="inline-flex items-center justify-center text-muted"
            style={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <ChevronDown size={16} />
          </span>
        </div>
      </button>

      <div className={`collapsible-grid${open ? " is-open" : ""}`}>
        <div className="collapsible-inner">
          <div
            className="border-t bg-card"
            style={{ padding: "0.95rem 1.15rem 1.15rem" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

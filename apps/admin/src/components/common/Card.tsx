"use client";

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "interactive" | "accent";
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  padding = "md",
  title,
  subtitle,
  actions,
  className = "",
  style = {},
  ...props
}) => {
  const paddingMap = {
    none: "0",
    sm: "0.68rem",
    md: "0.9rem",
    lg: "1.1rem",
    xl: "1.35rem",
  };

  const isInteractive = variant === "interactive";
  const isElevated = variant === "elevated";
  const isAccent = variant === "accent";

  return (
    <div
      {...props}
      className={`card${isInteractive ? " interactive-card" : ""} ${className}`}
      style={{
        backgroundColor: isElevated
          ? "var(--bg-card-elevated)"
          : "var(--bg-card)",
        border: isAccent
          ? "1px solid var(--brand-primary-border)"
          : "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        padding: paddingMap[padding],
        boxShadow: isElevated ? "var(--shadow-elevated)" : "var(--shadow-card)",
        transition:
          "border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease",
        ...style,
      }}
    >
      {(title || subtitle || actions) && (
        <div
          className="flex items-start justify-between gap-3"
          style={{
            marginBottom: padding === "none" ? 0 : "0.82rem",
            padding:
              padding === "none" ? "1.08rem 1.1rem 0.88rem" : "0.18rem 0 0",
            borderBottom:
              padding === "none" ? "1px solid var(--border)" : "none",
          }}
        >
          <div className="min-w-0">
            {title && (
              <h3
                className="card-title m-0 font-bold text-primary"
                style={{ fontSize: "1.06rem", lineHeight: 1.3 }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                className="card-subtitle text-control-lg text-muted"
                style={{ margin: "0.18rem 0 0" }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

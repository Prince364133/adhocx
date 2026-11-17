"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  liveStatus?: string;
  liveTone?: "success" | "purple" | "warning" | "info" | "neutral";
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  style?: React.CSSProperties;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  liveStatus,
  liveTone = "purple",
  backHref,
  backLabel = "Back",
  onBack,
  actions,
  style = {},
}) => {
  const pillColors =
    liveTone === "success"
      ? {
          bg: "var(--color-success-bg)",
          border: "var(--color-success-border)",
          color: "var(--color-success)",
          dotClass: "success",
        }
      : liveTone === "warning"
        ? {
            bg: "var(--color-warning-bg)",
            border: "var(--color-warning-border)",
            color: "var(--color-warning)",
            dotClass: "warning",
          }
        : liveTone === "info"
          ? {
              bg: "var(--color-info-bg)",
              border: "var(--color-info-border)",
              color: "var(--color-info)",
              dotClass: "info",
            }
          : liveTone === "neutral"
            ? {
                bg: "var(--bg-surface-elevated)",
                border: "var(--border)",
                color: "var(--text-secondary)",
                dotClass: "purple",
              }
            : {
                bg: "var(--brand-primary-subtle)",
                border: "var(--brand-primary-border)",
                color: "var(--text-brand)",
                dotClass: "purple",
              };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
        paddingTop: "0.28rem",
        marginBottom: "0.5rem",
        ...style,
      }}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex items-center text-caption text-muted font-medium"
          style={{ gap: "0.3rem" }}
        >
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight size={12} />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  style={{
                    color: "var(--text-secondary)",
                    textDecoration: "none",
                    transition: "color 0.15s ease",
                  }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-primary font-semibold">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="page-header-content flex justify-between items-start gap-4 flex-wrap">
        <div className="page-header-main min-w-0" style={{ flex: "1 1 300px" }}>
          <div className="page-header-title-row flex items-center gap-medium flex-wrap">
            {backHref ? (
              <Link
                href={backHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.28rem",
                  padding: "0.24rem 0.56rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-secondary)",
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  transition: "background-color 0.15s ease, color 0.15s ease",
                }}
              >
                <ArrowLeft size={13} />
                <span>{backLabel}</span>
              </Link>
            ) : onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center rounded-md border bg-surface text-secondary text-control font-semibold cursor-pointer"
                style={{
                  gap: "0.28rem",
                  padding: "0.24rem 0.56rem",
                  transition: "background-color 0.15s ease, color 0.15s ease",
                }}
              >
                <ArrowLeft size={13} />
                <span>{backLabel}</span>
              </button>
            ) : null}

            <h1 className="page-title">{title}</h1>

            {liveStatus && (
              <span
                className="inline-flex items-center rounded-full font-semibold whitespace-nowrap"
                style={{
                  gap: "0.3rem",
                  padding: "0.15rem 0.48rem",
                  background: pillColors.bg,
                  border: `1px solid ${pillColors.border}`,
                  color: pillColors.color,
                  fontSize: "0.66rem",
                  letterSpacing: "0.02em",
                }}
              >
                <span
                  className={`pulse-dot ${pillColors.dotClass}`}
                  style={{ width: "5px", height: "5px" }}
                />
                <span>{liveStatus}</span>
              </span>
            )}
          </div>

          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>

        {actions && (
          <div className="page-header-actions flex items-center gap-2 flex-wrap flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

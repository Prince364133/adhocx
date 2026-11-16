"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { acquireScrollLock } from "./scrollLock";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  closeOnBackdrop?: boolean;
}

const EXIT_DURATION_MS = 180;

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "560px",
  icon,
  badge,
  closeOnBackdrop = true,
}) => {
  const [rendered, setRendered] = useState(isOpen);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      setClosing(false);
      return;
    }
    if (rendered) {
      setClosing(true);
      const timer = setTimeout(() => {
        setRendered(false);
        setClosing(false);
      }, EXIT_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [isOpen, rendered]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    const releaseScroll = acquireScrollLock();
    return () => {
      document.removeEventListener("keydown", handleEsc);
      releaseScroll();
    };
  }, [isOpen, onClose]);

  if (!rendered) return null;

  return (
    <div
      className={`drawer-overlay${closing ? " is-closing" : ""}`}
      onClick={() => {
        if (closeOnBackdrop) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`drawer-content${closing ? " is-closing" : ""}`}
        style={{ maxWidth: `min(100vw, ${width})` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <div
            className="flex items-start min-w-0 flex-1"
            style={{ gap: "0.65rem" }}
          >
            {icon && (
              <div
                className="rounded-md bg-brand-subtle text-brand inline-flex items-center justify-center flex-shrink-0"
                style={{ width: "34px", height: "34px" }}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="text-xl font-bold text-primary m-0"
                  style={{ lineHeight: 1.3 }}
                >
                  {title}
                </h2>
                {badge}
              </div>
              {subtitle && (
                <p
                  className="text-compact text-secondary"
                  style={{ margin: "0.2rem 0 0", lineHeight: 1.35 }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="drawer-close-btn"
          >
            <X size={16} />
          </button>
        </div>

        <div className="drawer-body">{children}</div>

        {footer && <div className="drawer-footer">{footer}</div>}
      </div>
    </div>
  );
};

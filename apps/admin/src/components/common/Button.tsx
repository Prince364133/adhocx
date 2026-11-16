"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = "",
  style = {},
  ...props
}) => {
  const activeLoading = isLoading || loading;
  const isDisabled = disabled || activeLoading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`btn btn-${variant} btn-${size}${fullWidth ? " btn-block" : ""} ${className}`.trim()}
      style={style}
    >
      {activeLoading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        leftIcon && <span className="inline-flex items-center">{leftIcon}</span>
      )}
      {children}
      {!activeLoading && rightIcon && (
        <span className="inline-flex items-center">{rightIcon}</span>
      )}
    </button>
  );
};

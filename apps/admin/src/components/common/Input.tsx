"use client";

import React, { forwardRef } from "react";

export interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  label?: string;
  labelExtra?: React.ReactNode;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      labelExtra,
      hint,
      error,
      leftIcon,
      rightIcon,
      size = "md",
      fullWidth = true,
      required,
      id,
      className = "",
      wrapperClassName = "",
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputId =
      id ||
      (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
    const sizeClass =
      size === "sm" ? " form-input-sm" : size === "lg" ? " form-input-lg" : "";
    const iconLeftClass = leftIcon ? " has-left-icon" : "";
    const iconRightClass = rightIcon ? " has-right-icon" : "";
    const errorClass = error ? " is-invalid" : "";

    return (
      <div
        className={`form-group ${wrapperClassName}`.trim()}
        style={{ width: fullWidth ? "100%" : "auto" }}
      >
        {(label || labelExtra) && (
          <div className="flex items-center justify-between">
            {label && (
              <label
                htmlFor={inputId}
                className={`form-label${required ? " form-label-required" : ""}`}
              >
                {label}
              </label>
            )}
            {labelExtra && <div>{labelExtra}</div>}
          </div>
        )}

        <div className="input-wrapper">
          {leftIcon && <span className="input-icon-left">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            required={required}
            disabled={disabled}
            className={`form-input${sizeClass}${iconLeftClass}${iconRightClass}${errorClass} ${className}`.trim()}
            {...props}
          />
          {rightIcon && <span className="input-icon-right">{rightIcon}</span>}
        </div>

        {error ? (
          <span className="form-error">{error}</span>
        ) : hint ? (
          <span className="form-hint">{hint}</span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";

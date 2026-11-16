"use client";

import React, { forwardRef } from "react";

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "size"
> {
  label?: string;
  labelExtra?: React.ReactNode;
  hint?: string;
  error?: string;
  options?: SelectOption[];
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      labelExtra,
      hint,
      error,
      options,
      size = "md",
      fullWidth = true,
      required,
      id,
      className = "",
      wrapperClassName = "",
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const selectId =
      id ||
      (label
        ? `select-${label.toLowerCase().replace(/\s+/g, "-")}`
        : undefined);
    const sizeClass =
      size === "sm"
        ? " form-select-sm"
        : size === "lg"
          ? " form-select-lg"
          : "";
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
                htmlFor={selectId}
                className={`form-label${required ? " form-label-required" : ""}`}
              >
                {label}
              </label>
            )}
            {labelExtra && <div>{labelExtra}</div>}
          </div>
        )}

        <select
          ref={ref}
          id={selectId}
          required={required}
          disabled={disabled}
          className={`form-select${sizeClass}${errorClass} ${className}`.trim()}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option
                  key={String(opt.value)}
                  value={opt.value}
                  disabled={opt.disabled}
                >
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        {error ? (
          <span className="form-error">{error}</span>
        ) : hint ? (
          <span className="form-hint">{hint}</span>
        ) : null}
      </div>
    );
  },
);

Select.displayName = "Select";

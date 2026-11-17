"use client";

import React, { forwardRef } from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  labelExtra?: React.ReactNode;
  hint?: string;
  error?: string;
  fullWidth?: boolean;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      labelExtra,
      hint,
      error,
      fullWidth = true,
      required,
      id,
      className = "",
      wrapperClassName = "",
      disabled,
      rows = 3,
      ...props
    },
    ref,
  ) => {
    const textareaId =
      id ||
      (label
        ? `textarea-${label.toLowerCase().replace(/\s+/g, "-")}`
        : undefined);
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
                htmlFor={textareaId}
                className={`form-label${required ? " form-label-required" : ""}`}
              >
                {label}
              </label>
            )}
            {labelExtra && <div>{labelExtra}</div>}
          </div>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          required={required}
          disabled={disabled}
          rows={rows}
          className={`form-textarea${errorClass} ${className}`.trim()}
          {...props}
        />

        {error ? (
          <span className="form-error">{error}</span>
        ) : hint ? (
          <span className="form-hint">{hint}</span>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./common/Button";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Failed to load data",
  message,
  onRetry,
  className = "",
  style = {},
}) => {
  return (
    <div className={`error-state ${className}`.trim()} style={style}>
      <div className="error-state-icon">
        <AlertTriangle size={20} />
      </div>
      <h3 className="error-state-title">{title}</h3>
      <p className="error-state-desc">{message}</p>
      {onRetry && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw size={13} />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};

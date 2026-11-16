"use client";

import React from "react";
import { Inbox } from "lucide-react";
import { Button } from "./common/Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = "",
  style = {},
}) => {
  return (
    <div className={`empty-state ${className}`.trim()} style={style}>
      <div className="empty-state-icon">{icon || <Inbox size={20} />}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {action && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

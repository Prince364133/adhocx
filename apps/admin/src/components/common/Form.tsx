"use client";

import React, { forwardRef } from "react";

export type FormProps = React.FormHTMLAttributes<HTMLFormElement>;

export const Form = forwardRef<HTMLFormElement, FormProps>(
  ({ className, ...props }, ref) => (
    <form ref={ref} {...props} className={className} />
  ),
);

Form.displayName = "Form";

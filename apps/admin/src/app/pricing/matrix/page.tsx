"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PricingMatrixWorkspace, { MatrixRole } from "./PricingMatrixWorkspace";

function MatrixPageContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const role: MatrixRole =
    roleParam === "driver"
      ? "driver"
      : roleParam === "unified"
        ? "unified"
        : "vendor";

  return <PricingMatrixWorkspace initialRole={role} />;
}

export default function PricingMatrixPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-secondary">
          Loading Pricing Matrix Workspace...
        </div>
      }
    >
      <MatrixPageContent />
    </Suspense>
  );
}

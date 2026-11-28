"use client";

import React from "react";
import { PageHeader } from "../../components/common";
import { AnalyticsTrendsSection } from "../../components/dashboard/AnalyticsTrendsSection";

export default function AnalyticsPage() {
  return (
    <main className="admin-page">
      <PageHeader
        title="Platform Analytics"
        subtitle="Company-wide growth trends, booking frequency, and operational performance"
        liveStatus="Live Telemetry"
      />
      <AnalyticsTrendsSection />
    </main>
  );
}

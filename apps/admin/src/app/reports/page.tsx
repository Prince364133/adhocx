"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReportsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/finance");
  }, [router]);

  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: "400px" }}
    >
      <p className="text-muted text-md">Redirecting to Finance Dashboard...</p>
    </div>
  );
}

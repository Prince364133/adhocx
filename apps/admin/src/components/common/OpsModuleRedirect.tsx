"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { getOpsBaseUrl } from "../../lib/api/client";

interface OpsModuleRedirectProps {
  /** Target path inside the Ops portal (e.g. '/requirements'). */
  opsPath: string;
  /** Human-readable module name displayed while redirecting. */
  moduleTitle: string;
}

/**
 * Redirects legacy Admin portal routes that moved to the Ops portal.
 */
export const OpsModuleRedirect: React.FC<OpsModuleRedirectProps> = ({
  opsPath,
  moduleTitle,
}) => {
  const [targetUrl, setTargetUrl] = useState<string>(
    () =>
      `${process.env.NEXT_PUBLIC_OPS_URL?.trim().replace(/\/+$/, "") || "http://localhost:7004"}${opsPath}`,
  );

  useEffect(() => {
    const resolved = `${getOpsBaseUrl()}${opsPath}`;
    setTargetUrl(resolved);
    window.location.replace(resolved);
  }, [opsPath]);

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 text-center p-8"
      style={{ minHeight: "360px" }}
    >
      <div
        className="card w-full flex flex-col items-center gap-relaxed"
        style={{ maxWidth: "460px", padding: "1.75rem" }}
      >
        <Loader2
          size={24}
          color="var(--text-brand)"
          className="animate-spin"
        />
        <h2 className="m-0 text-title-md font-bold text-primary">
          Redirecting to Ops Portal
        </h2>
        <p
          className="m-0 text-body-md text-secondary"
          style={{ lineHeight: 1.5 }}
        >
          {moduleTitle} is now managed in the AdhocX Ops Portal. If you are not
          redirected automatically, use the button below.
        </p>
        <a
          href={targetUrl}
          className="inline-flex items-center gap-snug py-2 px-4 rounded-md bg-brand text-body-md font-semibold no-underline mt-1"
          style={{ color: "#ffffff" }}
        >
          <span>Open {moduleTitle}</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
};

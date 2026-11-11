'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { getOpsBaseUrl } from '../../lib/api/client';

interface OpsModuleRedirectProps {
  /** Target path inside the Ops portal (e.g. '/requirements'). */
  opsPath: string;
  /** Human-readable module name displayed while redirecting. */
  moduleTitle: string;
}

/**
 * Redirects legacy Admin portal routes that moved to the Ops portal.
 */
export const OpsModuleRedirect: React.FC<OpsModuleRedirectProps> = ({ opsPath, moduleTitle }) => {
  const [targetUrl, setTargetUrl] = useState<string>(
    () => `${process.env.NEXT_PUBLIC_OPS_URL?.trim().replace(/\/+$/, '') || 'http://localhost:7004'}${opsPath}`,
  );

  useEffect(() => {
    const resolved = `${getOpsBaseUrl()}${opsPath}`;
    setTargetUrl(resolved);
    window.location.replace(resolved);
  }, [opsPath]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '360px',
        gap: '1rem',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.85rem',
        }}
      >
        <Loader2 size={24} color="var(--brand-primary)" className="animate-spin" />
        <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Redirecting to Ops Portal
        </h2>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {moduleTitle} is now managed in the AdhocX Ops Portal. If you are not redirected automatically, use the button below.
        </p>
        <a
          href={targetUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand-primary)',
            color: '#ffffff',
            fontSize: '0.82rem',
            fontWeight: 600,
            textDecoration: 'none',
            marginTop: '0.25rem',
          }}
        >
          <span>Open {moduleTitle}</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
};


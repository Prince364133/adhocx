/**
 * Universal Document and KYC Asset URL Resolver for AdhocX Admin Portal.
 * Resolves relative paths (/uploads/uuid.jpg), CDN paths, Cloudflare R2 links,
 * and handles environment-specific API hosts seamlessly.
 */

export function resolveDocumentUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return '';

  // Data URIs (e.g. data:image/...) or blob URIs
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Already an absolute HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If the image points to localhost or private IP while accessing remotely, rewrite to public API
    if (typeof window !== 'undefined') {
      const isRemoteAdmin = !['localhost', '127.0.0.1'].includes(window.location.hostname);
      if (isRemoteAdmin && (trimmed.includes('localhost:') || trimmed.includes('127.0.0.1:'))) {
        return trimmed.replace(/http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, 'https://api.adhocx.com');
      }
    }
    return trimmed;
  }

  // Relative path (e.g., /uploads/uuid.jpg or uploads/uuid.jpg)
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // 1. Explicit Next.js public API variable if set
  if (process.env.NEXT_PUBLIC_API_URL) {
    const origin = process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '');
    return `${origin}${cleanPath}`;
  }

  // 2. Browser dynamic host detection
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    const port = window.location.port;

    // Production domains
    if (host.includes('adhocx.com')) {
      return `https://api.adhocx.com${cleanPath}`;
    }

    // Local dev: If admin is on port 7002 and talking to local backend
    if (port === '7002' || host === 'localhost' || host === '127.0.0.1') {
      return `${window.location.protocol}//${host}:7001${cleanPath}`;
    }

    // Direct IP access
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      return `${window.location.protocol}//${host}:7001${cleanPath}`;
    }

    return `${window.location.origin}${cleanPath}`;
  }

  // Default server-side fallback
  return `https://api.adhocx.com${cleanPath}`;
}

/**
 * Handle document load failure by attempting fallback to production API,
 * then falling back to high-fidelity SVG placeholder if file is missing.
 */
export function handleDocumentImageError(
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  title: string = 'Document'
): void {
  const img = event.currentTarget;
  const currentSrc = img.src;

  // If currently pointing to localhost, retry with production API once
  if (currentSrc.includes('localhost:7001') || currentSrc.includes('127.0.0.1:7001') || currentSrc.includes(':7002/uploads/')) {
    const filename = currentSrc.split('/uploads/')[1];
    if (filename && !img.dataset.retriedProd) {
      img.dataset.retriedProd = 'true';
      img.src = `https://api.adhocx.com/uploads/${filename}`;
      return;
    }
  }

  // Final fallback: High-fidelity informative SVG placeholder
  img.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380"><rect width="600" height="380" fill="%230f172a"/><circle cx="300" cy="140" r="44" fill="%231e293b"/><path d="M286 126h28v28h-28z" fill="%2364748b"/><text x="50%" y="220" fill="%23f43f5e" font-size="16" font-family="sans-serif" text-anchor="middle" font-weight="bold">${encodeURIComponent(title.toUpperCase())} UNAVAILABLE</text><text x="50%" y="250" fill="%2394a3b8" font-size="13" font-family="sans-serif" text-anchor="middle">Original document was not found on storage server</text><text x="50%" y="275" fill="%2364748b" font-size="11" font-family="sans-serif" text-anchor="middle">Applicant needs to re-upload this document</text></svg>`;
}

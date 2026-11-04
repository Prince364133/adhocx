import sanitizeHtml from 'sanitize-html';

/**
 * Blog bodies are rendered as raw HTML on the public marketing site (Astro `set:html`), so they are
 * sanitized on write: formatting, headings, lists, tables, links, images and code survive; scripts,
 * event handlers, iframes, styles-with-expressions and javascript:/data: URLs do not.
 * Markdown passes through unchanged (it contains no HTML tags to strip).
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'img',
    'h1',
    'h2',
    'figure',
    'figcaption',
    'picture',
    'source',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    source: ['srcset', 'type', 'media'],
    '*': ['id', 'class'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    // Links opening a new tab must not get window.opener.
    a: (tagName, attribs) =>
      attribs.target === '_blank'
        ? { tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } }
        : { tagName, attribs },
  },
};

export function sanitizeBlogHtml(content: string | undefined | null): string | undefined {
  if (content === undefined || content === null) return undefined;
  return sanitizeHtml(String(content), OPTIONS);
}

/** Cover image must be a plain http(s) URL (or a site-relative /path); anything else is dropped. */
export function sanitizeImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const value = String(url).trim();
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

import type { APIRoute } from 'astro';
import { execSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { ARTICLES_CONTENT } from '../data/blogArticles';

const SITE = 'https://www.adhocx.com';

// Every top-level page file is listed automatically, so new pages cannot be forgotten.
// Excluded: error page and the noindex account-deletion page.
const pageModules = import.meta.glob(['./*.astro', '!./404.astro', '!./delete-account.astro']);

const priorityFor = (path: string): number => {
  if (path === '/') return 1.0;
  if (['/services', '/ets', '/vendors', '/pricing'].includes(path)) return 0.9;
  if (['/industries', '/safety', '/drivers', '/contact', '/faq'].includes(path)) return 0.8;
  if (path.startsWith('/blogs/')) return 0.7;
  if (['/privacy', '/terms'].includes(path)) return 0.3;
  return 0.6;
};

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = () => {
  const staticPaths = Object.keys(pageModules).map((file) => {
    const name = file.replace('./', '').replace('.astro', '');
    const routePath = name === 'index' ? '/' : `/${name}`;
    const sourceFile = path.join('src/pages', file.replace('./', ''));
    let lastmod: string | undefined;

    try {
      const gitDate = execSync(`git log -1 --format=%cI "${sourceFile}"`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      if (gitDate && !Number.isNaN(Date.parse(gitDate))) {
        lastmod = new Date(gitDate).toISOString();
      }
    } catch {
      // Git not available
    }

    if (!lastmod) {
      try {
        if (existsSync(sourceFile)) {
          lastmod = statSync(sourceFile).mtime.toISOString();
        }
      } catch {
        // Fallback stat failed
      }
    }

    return { path: routePath, lastmod };
  });

  const articles = Object.values(ARTICLES_CONTENT).map((a) => {
    let lastmod: string | undefined;
    if (a.dateModified && !Number.isNaN(Date.parse(a.dateModified))) {
      lastmod = new Date(a.dateModified).toISOString();
    } else if (!Number.isNaN(Date.parse(a.date))) {
      lastmod = new Date(a.date).toISOString();
    }
    return {
      path: `/blogs/${a.slug}`,
      lastmod,
    };
  });

  const entries = [
    ...staticPaths,
    ...articles,
  ].sort((a, b) => priorityFor(b.path) - priorityFor(a.path) || a.path.localeCompare(b.path));

  const urls = entries
    .map(
      ({ path, lastmod }) => `  <url>
    <loc>${escapeXml(SITE + path)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${path.startsWith('/blogs') ? 'weekly' : 'monthly'}</changefreq>
    <priority>${priorityFor(path).toFixed(1)}</priority>
  </url>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};

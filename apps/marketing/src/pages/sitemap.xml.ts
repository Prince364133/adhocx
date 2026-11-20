import type { APIRoute } from 'astro';
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
  const buildDate = new Date().toISOString();

  const staticPaths = Object.keys(pageModules).map((file) => {
    const name = file.replace('./', '').replace('.astro', '');
    return name === 'index' ? '/' : `/${name}`;
  });

  const articles = Object.values(ARTICLES_CONTENT).map((a) => ({
    path: `/blogs/${a.slug}`,
    lastmod: Number.isNaN(Date.parse(a.date)) ? buildDate : new Date(a.date).toISOString(),
  }));

  const entries = [
    ...staticPaths.map((path) => ({ path, lastmod: buildDate })),
    ...articles,
  ].sort((a, b) => priorityFor(b.path) - priorityFor(a.path) || a.path.localeCompare(b.path));

  const urls = entries
    .map(
      ({ path, lastmod }) => `  <url>
    <loc>${escapeXml(SITE + path)}</loc>
    <lastmod>${lastmod}</lastmod>
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

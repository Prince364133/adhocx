import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/static';

const SITE = 'https://www.adhocx.com';
const EXCLUDED = ['/delete-account', '/404'];
const buildDate = new Date();

// Sitemap priority by section; everything else falls back to 0.6.
const priorityFor = (path) => {
  if (path === '/') return 1.0;
  if (['/services', '/ets', '/vendors', '/pricing'].includes(path)) return 0.9;
  if (['/industries', '/safety', '/drivers', '/contact', '/faq'].includes(path)) return 0.8;
  if (path.startsWith('/blogs/')) return 0.7;
  if (['/privacy', '/terms'].includes(path)) return 0.3;
  return 0.6;
};

export default defineConfig({
  site: SITE,
  integrations: [
    react(),
    sitemap({
      filter: (page) => !EXCLUDED.some((p) => new URL(page).pathname.startsWith(p)),
      serialize(item) {
        const path = new URL(item.url).pathname;
        item.lastmod = buildDate.toISOString();
        item.changefreq = path.startsWith('/blogs') ? 'weekly' : 'monthly';
        item.priority = priorityFor(path);
        return item;
      },
    }),
  ],
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  outDir: './dist',
  ...(process.env.VERCEL ? { adapter: vercel() } : {}),
});

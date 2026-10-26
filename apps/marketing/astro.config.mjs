import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel/static';

export default defineConfig({
  site: 'https://www.adhocx.com',
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/delete-account') && !page.includes('/blog-detail'),
    }),
  ],
  output: 'static',
  outDir: './dist',
  ...(process.env.VERCEL ? { adapter: vercel() } : {}),
});

import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel/static';

export default defineConfig({
  integrations: [react()],
  output: 'static',
  outDir: './dist',
  site: 'https://www.adhocx.com',
  ...(process.env.VERCEL ? { adapter: vercel() } : {}),
});

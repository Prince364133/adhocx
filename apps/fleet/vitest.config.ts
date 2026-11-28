import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '../../node_modules/vitest/dist/config.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.spec.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
      '@adhocx/contracts': path.resolve(dirname, '../../packages/contracts/src'),
      '@adhocx/ui/page-loading': path.resolve(dirname, '../../packages/ui/src/PageLoadingSkeleton.tsx'),
      '@adhocx/ui': path.resolve(dirname, '../../packages/ui/src'),
    },
  },
});

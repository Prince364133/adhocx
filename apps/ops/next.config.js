/** @type {import('next').NextConfig} */
const path = require('path');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(path.resolve(__dirname, '../..'));

const nextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  output: 'standalone',
  transpilePackages: ['@adhocx/contracts'],
  experimental: {
    externalDir: true,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_BROWSER_API_KEY || '',
  },
};

module.exports = nextConfig;

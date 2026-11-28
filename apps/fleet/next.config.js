const path = require('path');
const { loadEnvConfig } = require('@next/env');

loadEnvConfig(path.resolve(__dirname, '../..'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  ...(process.platform === 'win32' && process.env.NEXT_OUTPUT !== 'standalone'
    ? {}
    : { output: 'standalone' }),
  transpilePackages: ['@adhocx/contracts', '@adhocx/ui'],
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

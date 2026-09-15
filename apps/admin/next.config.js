/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@adhocx/contracts'],
  reactStrictMode: true,
  poweredByHeader: false,
};

module.exports = nextConfig;

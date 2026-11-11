/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  output: 'standalone',
  transpilePackages: ['@adhocx/contracts'],
  reactStrictMode: true,
  poweredByHeader: false,
};

module.exports = nextConfig;

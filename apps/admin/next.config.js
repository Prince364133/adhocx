/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@adhocx/contracts'],
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: '/undefined/:slug*',
        destination: '/:slug*',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;

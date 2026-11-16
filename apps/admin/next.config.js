/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir:
    process.env.ADMIN_NEXT_DIST_DIR ||
    (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'),
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

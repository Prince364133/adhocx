/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir:
    process.env.ADMIN_NEXT_DIST_DIR ||
    (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'),
  output: 'standalone',
  transpilePackages: ['@adhocx/contracts', '@adhocx/ui'],
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: '/sos',
        destination: '/safety/sos',
        permanent: false,
      },
      {
        source: '/undefined/:slug*',
        destination: '/:slug*',
        permanent: false,
      },
    ];
  },
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

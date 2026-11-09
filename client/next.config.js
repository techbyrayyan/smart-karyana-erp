/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // For Vercel serverless: increase body size for AI invoice image uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },

  // Rewrites: used in LOCAL development to proxy /api/* to Express backend.
  // On Vercel these are IGNORED — Next.js internal API routes handle /api/* directly.
  async rewrites() {
    // Only apply rewrites in local development when BACKEND_API_URL is set
    if (process.env.BACKEND_API_URL) {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.BACKEND_API_URL}/:path*`,
        },
        {
          source: '/uploads/:path*',
          destination: `${process.env.BACKEND_UPLOADS_URL || 'http://localhost:5001/uploads'}/:path*`,
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;

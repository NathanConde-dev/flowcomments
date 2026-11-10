import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  output: 'standalone',
  serverExternalPackages: ['bullmq', 'ioredis'],
};

export default nextConfig;

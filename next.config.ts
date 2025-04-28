
import type {NextConfig} from 'next';
// Removed fs and path imports as they are no longer needed
// import path from 'path';
// import fs from 'fs';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
   // Removed webpack configuration for firebase-messaging-sw.js
   // webpack: (config, { isServer, buildId, dev, config: nextConfigWebpack }) => { ... }
};

export default nextConfig;

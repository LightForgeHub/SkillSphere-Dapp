import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'rsc-image-cache.vercel.app',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },

    ],
  },
};


export default nextConfig;

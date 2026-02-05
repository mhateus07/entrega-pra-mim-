import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'http://localhost:3001',
    'http://localhost:3000',
    'http://192.168.3.168:3001',
    'http://192.168.3.168:3000',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;

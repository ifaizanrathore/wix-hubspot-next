import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow server-side env vars to be used in API routes
  serverExternalPackages: ['mongoose'],
};

export default nextConfig;

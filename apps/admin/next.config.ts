import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@canadian-plans/contracts', '@canadian-plans/types', '@canadian-plans/ui'],
};

export default nextConfig;

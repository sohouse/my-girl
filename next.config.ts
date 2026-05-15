import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-9a8abe13198948ae88f3b4dddf1e2bef.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
  }
};

export default nextConfig;

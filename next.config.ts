import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks', '@mantine/notifications', '@mantine/form'],
  },
  serverExternalPackages: ['socket.io'],
};

export default nextConfig;

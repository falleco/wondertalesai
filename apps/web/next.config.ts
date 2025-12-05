import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/server/trpc/:path*",
        destination: "http://localhost:4001/trpc/:path*", // Proxy to Backend
      },
      {
        source: "/server/:path*",
        destination: "http://localhost:4001/:path*", // Proxy to Backend
      },
    ];
  },
};

export default nextConfig;

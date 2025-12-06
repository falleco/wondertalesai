import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/trpc/:path*",
        destination: "http://localhost:4001/trpc/:path*", // Proxy to Backend
      },
      // {
      //   source: "/api/:path*",
      //   destination: "http://localhost:4001/api/:path*", // Proxy to Backend
      // },
    ];
  },
};

export default nextConfig;

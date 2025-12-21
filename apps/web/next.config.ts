import type { NextConfig } from "next";

const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST
  ? process.env.NEXT_PUBLIC_POSTHOG_HOST.replace(/\/$/, "")
  : "https://app.posthog.com";
const hasPosthog = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "avatars.githubusercontent.com",
      },
      {
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  async rewrites() {
    const rewrites = [
      {
        source: "/trpc/:path*",
        destination: "http://localhost:4001/trpc/:path*", // Proxy to Backend
      },
      // {
      //   source: "/api/:path*",
      //   destination: "http://localhost:4001/api/:path*", // Proxy to Backend
      // },
    ];
    if (hasPosthog) {
      rewrites.push(
        {
          source: "/tlm/static/:path*",
          destination: `${posthogHost}/static/:path*`,
        },
        {
          source: "/tlm/:path*",
          destination: `${posthogHost}/:path*`,
        },
      );
    }
    return rewrites;
  },
};

export default nextConfig;

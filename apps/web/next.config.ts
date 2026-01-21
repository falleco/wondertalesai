import type { NextConfig } from "next";

const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST
  ? process.env.NEXT_PUBLIC_POSTHOG_HOST.replace(/\/$/, "")
  : "https://app.posthog.com";
const hasPosthog = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

const nextConfig: NextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
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
      {
        source: "/trpc",
        destination: "http://localhost:4001/trpc", // Proxy to Backend
      },
      {
        source: "/story/:path*",
        destination: "http://localhost:4001/story/:path*", // Proxy to Backend
      },
      {
        source: "/story",
        destination: "http://localhost:4001/story", // Proxy to Backend
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

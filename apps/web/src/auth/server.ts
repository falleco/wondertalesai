import { createBetterAuthBaseServerConfig } from "@mailestro/auth/server";
import { redis } from "@web/lib/redis";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { openAPI } from "better-auth/plugins";
import { Pool } from "pg";

import Stripe from "stripe";

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-11-17.clover", // Latest API version as of Stripe SDK v20.0.0
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const auth = betterAuth({
  ...createBetterAuthBaseServerConfig(
    stripeClient,
    process.env.STRIPE_WEBHOOK_SECRET as string,
    [openAPI(), nextCookies()],
  ),

  basePath: "/api/auth",

  database: pool,

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },

  secondaryStorage: {
    get: async (key) => await redis.get(key),
    set: async (key, value, ttl) =>
      await redis.set(key, value, "EX", ttl ?? 60),
    delete: async (key) => {
      await redis.del(key);
    },
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },

  trustedOrigins: ["http://localhost:3000", "http://localhost:4001"],
});

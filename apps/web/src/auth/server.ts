import { createBetterAuthBaseServerConfig } from "@dreamtalesai/auth/server";
import { env } from "@web/env";
import { redis } from "@web/lib/redis";
import { trpc } from "@web/trpc/server";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { openAPI } from "better-auth/plugins";
import { Pool } from "pg";

import Stripe from "stripe";

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover", // Latest API version as of Stripe SDK v20.0.0
});

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const auth = betterAuth({
  ...createBetterAuthBaseServerConfig(
    stripeClient,
    env.STRIPE_WEBHOOK_SECRET,
    [openAPI(), nextCookies()],
    {
      sendMagicLink: async (email: string, token: string, url: string) => {
        await trpc.auth.magicLink.mutate({ email, token, url });
      },
    },
  ),

  basePath: "/api/auth",

  database: pool,

  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },

  secondaryStorage: {
    get: async (key: string) => await redis.get(key),
    set: async (key: string, value: string, ttl?: number) =>
      await redis.set(key, value, "EX", ttl ?? 60),
    delete: async (key: string) => {
      await redis.del(key);
    },
  },

  session: {
    cookieCache: {
      enabled: false,
      maxAge: 5 * 60, // Cache duration in seconds
    },
  },

  trustedOrigins: ["http://localhost:3000", "http://localhost:4001"],
});

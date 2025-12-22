import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().min(1).optional(),
    NEXT_PUBLIC_PLUS_MONTHLY_PRICE_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_PLUS_YEARLY_PRICE_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_PRO_YEARLY_PRICE_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_API_BASE_URL: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_PLUS_MONTHLY_PRICE_ID:
      process.env.NEXT_PUBLIC_PLUS_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_PLUS_YEARLY_PRICE_ID:
      process.env.NEXT_PUBLIC_PLUS_YEARLY_PRICE_ID,
    NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID:
      process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_PRO_YEARLY_PRICE_ID:
      process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE_ID,
  },
});

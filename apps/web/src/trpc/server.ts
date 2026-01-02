"use server";

import type { AppRouter } from "@server/trpc/trpc.router";
import {
  createTRPCClient,
  httpBatchLink,
  httpBatchStreamLink,
  loggerLink,
} from "@trpc/client";
import { createServerSideHelpers } from "@trpc/react-query/server";
import { env } from "@web/env";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import superjson from "superjson";
import { makeQueryClient } from "./query-client";

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCClient<AppRouter>({
  links: [
    loggerLink({
      enabled: (op) =>
        false || (op.direction === "down" && op.result instanceof Error),
    }),
    httpBatchLink({
      url: `${env.NEXT_PUBLIC_API_BASE_URL}/trpc`,
      async headers() {
        // console.log("headers", await headers());
        const heads = new Map();
        heads.set("cookie", (await cookies()).toString());
        // console.log("cookies", (await cookies()).toString());
        heads.set("x-trpc-source", "rsc");
        return Object.fromEntries(heads);
      },
      transformer: superjson,
    }),
  ],
});

/**
 * SSR helpers (for prefetching data on the server)
 * https://trpc.io/docs/client/nextjs/server-side-helpers
 */
export const createSSRHelper = async () => {
  return createServerSideHelpers<AppRouter>({
    client: trpc,
    queryClient: getQueryClient(),
    transformer: superjson,
  });
};

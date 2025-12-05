"use server";

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { cookies, headers } from "next/headers";
import superjson from "superjson";

import type { AppRouter } from "@server/trpc/trpc.router";
import { createServerSideHelpers } from "@trpc/react-query/server";
import { cache } from "react";
import { makeQueryClient } from "./query-client";
import { auth } from "@web/auth/server";
import { authClient } from "@web/auth/client";

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:3000/server/trpc", // TODO: change this url
      async headers() {
        const heads = new Map(await headers());
        heads.set("x-trpc-source", "rsc");
        // heads.set("cookie", (await cookies())?.getAll().map(cookie => `${cookie.name}=${cookie.value}`).join('; ') || '');
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

// export const helpers = createServerSideHelpers({
//   client: trpc,
// });

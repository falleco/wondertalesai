"use client";

import type { AppRouter } from "@server/trpc/trpc.router";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { env } from "@web/env";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { useState } from "react";
import superjson from "superjson";
import { makeQueryClient } from "./query-client";

export const trpc = createTRPCReact<AppRouter>({ abortOnUnmount: true });

let clientQueryClientSingleton: QueryClient;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  if (!clientQueryClientSingleton) {
    clientQueryClientSingleton = makeQueryClient();
  }
  return clientQueryClientSingleton;
}

export function TRPCReactProvider(props: {
  children: React.ReactNode;
  headers: Headers;
  cookies: ReadonlyRequestCookies;
}) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${env.NEXT_PUBLIC_API_BASE_URL}/trpc`,

          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },

          async headers() {
            const heads = new Map(props.headers);
            heads.set("x-trpc-source", "react");
            return Object.fromEntries(heads);
          },
          transformer: superjson,
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </trpc.Provider>
    </QueryClientProvider>
  );
}

"use client";

import type { AppRouter } from "@server/trpc/trpc.router";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchStreamLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
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
  // const [queryClient] = useState(() => new QueryClient());
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchStreamLink({
          url: "http://localhost:3000/trpc",
          async headers() {
            const heads = new Map(props.headers);
            // const { getFirebaseAuth } = useFirebaseAuth();
            // const token = await getFirebaseAuth().currentUser?.getIdToken();
            // if (token) {
            //   heads.set('authorization', `Bearer ${token}`);
            // }
            // console.log('cookies', props.cookies.getAll().map(cookie => `${cookie.name}=${cookie.value}`).join('; '));
            heads.set("x-trpc-source", "react");
            // heads.set('cookie', props.cookies?.getAll().map(cookie => `${cookie.name}=${cookie.value}`).join('; ') || '');
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

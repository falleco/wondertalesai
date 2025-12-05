"use server"

import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { createSSRHelper } from "./server"

export async function Hydration({ children }: { children: React.ReactNode }) {
  const ssr = await createSSRHelper();
  
  // prefetches data
  // await ssr.ping.prefetch();

  const dehydratedState = dehydrate(ssr.queryClient)
  return (
    <HydrationBoundary state={dehydratedState}>{children}</HydrationBoundary>
  )
}

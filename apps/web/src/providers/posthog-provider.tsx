"use client";

import { env } from "@web/env";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

const posthogKey = env.NEXT_PUBLIC_POSTHOG_KEY;

if (typeof window !== "undefined" && posthogKey) {
  posthog.init(posthogKey, {
    api_host: "/tlm",
    ui_host: env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
    capture_pageview: false,
  });
}

type PostHogUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export function PostHogProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

export function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString();

  useEffect(() => {
    if (!posthogKey || !pathname) {
      return;
    }
    const url = search ? `${pathname}?${search}` : pathname;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, search]);

  return null;
}

export function PostHogIdentify({ user }: { user?: PostHogUser | null }) {
  useEffect(() => {
    if (!posthogKey) {
      return;
    }
    if (user?.id) {
      posthog.identify(user.id, {
        email: user.email ?? undefined,
        name: user.name ?? undefined,
      });
      return;
    }
    posthog.reset();
  }, [user?.id, user?.email, user?.name]);

  return null;
}

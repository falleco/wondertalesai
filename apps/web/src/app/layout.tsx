import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@web/auth/server";
import WithNavLayout from "@web/components/layout/with-nav-layout";
import {
  PostHogIdentify,
  PostHogPageview,
  PostHogProviderClient,
} from "@web/providers/posthog-provider";
import { ToasterProvider } from "@web/providers/toast-provider";
import { Hydration } from "@web/trpc/hydration";
import { TRPCReactProvider } from "@web/trpc/react";
import { cookies, headers } from "next/headers";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Demo AIStarterKit OSS - Next.js AI Starter Kit Demo",
    template: "%s | AIStarterKit OSS Demo",
  },
  description:
    "Demo website of AIStarterKit OSS boilerplate. Built using Next.js, Tailwind CSS, Drizzle ORM, and PostgreSQL.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const cookiesList = await cookies();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const posthogUser = session?.user
    ? {
        id: session.user.id,
        email: session.user.email ?? null,
        name: session.user.name ?? null,
      }
    : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`bg-gray-50 dark:bg-dark-secondary min-h-screen flex flex-col ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider disableTransitionOnChange>
          <PostHogProviderClient>
            <PostHogPageview />
            <PostHogIdentify user={posthogUser} />
            {/* ToasterProvider must render before the children components */}
            {/* https://github.com/emilkowalski/sonner/issues/168#issuecomment-1773734618 */}
            <ToasterProvider />

            <div className="isolate flex flex-col flex-1">
              <TRPCReactProvider headers={headersList} cookies={cookiesList}>
                <Hydration>
                  <WithNavLayout user={session?.user}>{children}</WithNavLayout>
                </Hydration>
              </TRPCReactProvider>
            </div>
          </PostHogProviderClient>
        </ThemeProvider>
      </body>
    </html>
  );
}

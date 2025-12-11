import { auth } from "@web/auth/server";
import { trpc } from "@web/trpc/server";
import { headers } from "next/headers";

export default async function SandboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const _session = await auth.api.getSession({
    headers: await headers(),
  });
  const _ping = await trpc.ping.query();

  return <div>{children}</div>;
}

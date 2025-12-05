import { auth } from "@web/auth/server";
import { trpc } from "@web/trpc/server";
import { headers } from "next/headers";

export default async function SandboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  console.log("session", session);
  const ping = await trpc.ping.query();
  console.log("backend ping", ping);

  return <div>{children}</div>;
}

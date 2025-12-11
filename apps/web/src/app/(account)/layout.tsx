import { auth } from "@web/auth/server";
import WithSidebarLayout from "@web/components/layout/with-sidebar-layout";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AccountManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/sign-in");
    return;
  }

  return <WithSidebarLayout user={session.user}>{children}</WithSidebarLayout>;
}

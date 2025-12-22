import { auth } from "@web/auth/server";
import { SIDEBAR_DASHBOARD_MENU_ITEMS } from "@web/components/layout/dashboard-menu";
import WithSidebarLayout from "@web/components/layout/with-sidebar-layout";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/sign-in?next=/dashboard");
  }

  return (
    <WithSidebarLayout
      user={session.user}
      menuItems={SIDEBAR_DASHBOARD_MENU_ITEMS}
    >
      {children}
    </WithSidebarLayout>
  );
}

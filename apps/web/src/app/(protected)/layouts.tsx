import WithNavLayout from "@web/components/layout/with-nav-layout";

export default async function SandboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WithNavLayout>{children}</WithNavLayout>;
}

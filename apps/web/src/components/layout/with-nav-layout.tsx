import type { User } from "better-auth";
import Footer from "./footer";
import Header from "./header/header";

export default function WithNavLayout({
  children,
  user,
}: {
  user?: User;
  children: React.ReactNode;
}) {
  return (
    <div className="dark:bg-[#101828] flex flex-col flex-1">
      <Header user={user} />
      <div className="isolate flex-1 flex flex-col">{children}</div>
      <Footer />
    </div>
  );
}

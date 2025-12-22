import { auth } from "@web/auth/server";
import ProfileCard from "@web/components/profile-card";
import SecurityCard from "@web/components/security-card";
import WelcomeBanner from "@web/components/welcome-banner";
import type { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function Profile() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  console.log('user', session?.user);

  return (
    <>
      <WelcomeBanner />
      <ProfileCard key={session?.user?.email} user={session?.user} />
      <SecurityCard />
    </>
  );
}

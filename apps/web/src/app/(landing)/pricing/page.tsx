import FaqAccordion from "@web/components/faq/faq-accordion";
import PricingSection from "@web/components/pricing";
import type { Metadata } from "next";
// import { auth } from "@/auth";
// import { getActiveSubscriptionByUserEmail } from "@/db/queries";

export const metadata: Metadata = {
  title: "Pricing",
};

export default async function PricingPage() {
  // const userSession = await auth();
  // const activeSubscription = await getActiveSubscriptionByUserEmail(
  //   userSession?.user?.email,
  // );
  const activeSubscription: any = null;

  return (
    <>
      <PricingSection
        activeSubscriptionId={activeSubscription?.subscriptions?.id}
      />
      <FaqAccordion />
    </>
  );
}

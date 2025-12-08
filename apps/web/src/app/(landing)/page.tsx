import BenefitsGrid from "@web/components/benefits-grid";
import TestimonialsSection from "@web/components/client-testimonial";
import { CoreFeatures } from "@web/components/core-features";
import FaqAccordion from "@web/components/faq/faq-accordion";
import HeroSection from "@web/components/hero";
import PricingSection from "@web/components/pricing";
import ToolsTab from "@web/components/tools-tab";
// import { auth } from "@web/auth";
// import { getActiveSubscriptionByUserEmail } from "@web/db/queries";

export default async function Home() {
  //   const userSession = await auth();
  //   const activeSubscription = await getActiveSubscriptionByUserEmail(
  //     userSession?.user?.email,
  //   );
  const activeSubscription: any = null;
  return (
    <>
      <HeroSection />
      <CoreFeatures />
      <ToolsTab />
      <BenefitsGrid />
      <TestimonialsSection />
      <PricingSection
        activeSubscriptionId={activeSubscription?.subscriptions?.id}
      />
      <FaqAccordion />
    </>
  );
}

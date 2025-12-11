import { auth } from "@web/auth/server";
import BillingTable from "@web/components/billing/billing-table";
import PlanTable from "@web/components/billing/plan-table";
import { getPlanFromPriceIdWithBillingPeriod } from "@web/components/pricing/data";
// import { db } from "@/db";
// import { and, eq } from "drizzle-orm";
// import { subscriptionsTable, usersTable } from "@/db/schema";
import { stripe } from "@web/lib/stripe";
import type { Billing } from "@web/types/billing";
import type { Metadata } from "next";
import { headers } from "next/headers";
// import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { EmptyState } from "./_components/empty-state";

export const metadata: Metadata = {
  title: "Billing",
};

export default async function BillingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) redirect("/signin");

  const data: {
    subscriptions: {
      id: string;
      plan: string;
      billingPeriod: string;
      status: string;
      createdAt: Date;
      stripeCustomerId: string;
    } | null;
  } = { subscriptions: null };
  // const [data] = await db
  //   .select()
  //   .from(usersTable)
  //   .leftJoin(subscriptionsTable, eq(usersTable.id, subscriptionsTable.userId))
  //   .where(and(eq(usersTable.email, session.user.email!)));

  if (!data || !data.subscriptions) {
    return <EmptyState />;
  }

  const invoices = await stripe.invoices.list({
    customer: data.subscriptions.stripeCustomerId,
  });

  const billingData = invoices.data
    .map((invoice) => {
      const priceId =
        invoice.lines.data[1]?.pricing?.price_details?.price ||
        invoice.lines.data[0]?.pricing?.price_details?.price;

      if (!priceId) return null;

      return {
        id: invoice.id,
        package: getPlanFromPriceIdWithBillingPeriod(priceId),
        // Total is in cents, dividing by 100 to convert to dollar
        amount: `$${Number(invoice.amount_paid) / 100}`,
        invoicePdfLink: invoice.invoice_pdf,
        purchasedDate: new Date(invoice.created * 1000),
      };
    })
    .filter(Boolean) as Array<Billing>;

  const currentActiveSubscription = {
    subscriptionId: data?.subscriptions?.id,
    package:
      data?.subscriptions?.plan +
      " plan - " +
      data?.subscriptions?.billingPeriod,
    status: data?.subscriptions?.status,
    purchasedDate: new Date(data?.subscriptions?.createdAt as Date),
  };

  return (
    <>
      <BillingTable data={billingData} />

      <PlanTable data={currentActiveSubscription} />
    </>
  );
}

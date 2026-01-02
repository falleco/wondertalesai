import Link from "next/link";
import { Crown, CrownDark } from "./assets";

export async function EmptyState() {
  return (
    <section className="h-screen max-h-185.5 rounded-2xl bg-white border border-[#F2F4F7] dark:bg-[#171F2E] dark:border-[#1D2939] flex flex-col items-center py-23">
      <div className="mb-10">
        <Crown className="dark:hidden" role="presentation" />
        <CrownDark className="not-dark:hidden" role="presentation" />
      </div>

      <h1 className="mb-4 text-2xl text-[#1D2939] dark:text-white/90 font-medium">
        No billing history found yet
      </h1>
      <p className="mb-6 text-[#667085] dark:text-[#98A2B3] max-w-96 text-center">
        Your invoices and payments will appear here once you make a purchase.
      </p>

      <Link
        href="/pricing"
        className="bg-primary-500 px-6 py-3 rounded-full text-white text-xs font-medium hover:opacity-90"
      >
        Browse Plans
      </Link>
    </section>
  );
}

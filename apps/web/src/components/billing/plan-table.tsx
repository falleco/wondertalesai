import { stripe } from "@web/lib/stripe";
import { cn, formatPrice } from "@web/lib/utils";
import dayjs from "dayjs";
import Link from "next/link";
import { CancelSubscription } from "./cancel-subscription";

type PropsType = {
  data: {
    subscriptionId: string;
    package: string;
    status: string;
    purchasedDate: Date;
  };
};

export default async function PlanTable({ data }: PropsType) {
  const amount = await getPaidAmountBySubscriptionId(data.subscriptionId);

  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-dark-primary dark:border-gray-800 border border-gray-100">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white/90 mb-1">
          Current Plan
        </h2>
        <p className="text-sm font-normal text-gray-500 dark:text-gray-400">
          Here is your activated current plan
        </p>
      </div>
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-clip">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100 border-b dark:border-gray-800 dark:bg-white/5 border-gray-200">
                <th className="text-left font-medium px-5 py-3.5 dark:text-gray-400 text-gray-500 min-w-80 border-r border-gray-200 dark:border-gray-800">
                  Package
                </th>
                <th className="text-left w-[10.125rem] font-medium px-5 py-3.5 dark:text-gray-400 text-gray-500 border-r border-gray-200 dark:border-gray-800">
                  Amount
                </th>
                <th className="text-left w-[11.875rem] truncate font-medium px-5 py-3.5 dark:text-gray-400 text-gray-500 border-r border-gray-200 dark:border-gray-800">
                  Purchased On
                </th>
                <th className="text-left w-30 font-medium px-5 py-3.5 dark:text-gray-400 text-gray-500 text-base">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {data && (
                <tr>
                  <td className="px-5 py-3.5 whitespace-nowrap font-medium text-gray-700 dark:text-gray-400 text-sm border-r border-gray-200 dark:border-gray-800 capitalize">
                    {data.package}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap font-medium text-gray-700 dark:text-gray-400 text-sm border-r border-gray-200 dark:border-gray-800">
                    {formatPrice({
                      amount: Number(amount) / 100,
                      currency: "USD",
                    })}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap font-normal text-gray-500 dark:text-gray-400 text-sm border-r border-gray-200 dark:border-gray-800">
                    {dayjs(data.purchasedDate).format("DD MMM, YYYY")}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span
                      className={cn(
                        "text-success-600 dark:bg-success-600/15 text-xs justify-center font-medium" +
                          " py-0.5 px-2.5 rounded-full bg-success-50 capitalize",
                        {
                          "dark:bg-white/5 dark:text-white/90 bg-gray-100 text-gray-700":
                            data.status !== "active",
                        },
                      )}
                    >
                      {data.status}
                    </span>
                  </td>
                </tr>
              )}

              {!data && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 whitespace-nowrap font-medium text-gray-700 dark:text-gray-400 border-r border-gray-200 dark:border-gray-800 capitalize text-center"
                  >
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-7 flex justify-end gap-3">
        {data?.status !== "canceled" && (
          <CancelSubscription subscriptionId={data.subscriptionId} />
        )}

        <Link
          href="/pricing"
          className="text-white bg-primary-500 text-sm inline-flex gap-2 items-center justify-center hover:text-white font-medium transition-colors hover:bg-primary-600 py-3 px-6 rounded-full"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            role="img"
            aria-label="Upgrade Plan"
          >
            <title>Upgrade Plan</title>
            <path
              d="M10.678 2.29166L3.9873 11.696H9.32126L9.32126 17.7083L16.012 8.30401L10.678 8.30401V2.29166Z"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Upgrade Plan
        </Link>
      </div>
    </div>
  );
}

/**
 * @return paid amount in cents
 */
async function getPaidAmountBySubscriptionId(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return Number(subscription.items.data[0].price.unit_amount);
  } catch (error) {
    console.error(error);
    return null;
  }
}

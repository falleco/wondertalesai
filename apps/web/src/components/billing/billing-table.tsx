import { DownloadIcon } from "@web/components/icons";
import type { Billing } from "@web/types/billing";
import dayjs from "dayjs";
import Link from "next/link";

type PropsType = {
  data: Array<Billing>;
};

export default function BillingTable({ data }: PropsType) {
  return (
    <div className="mb-8 p-6 rounded-2xl bg-white border border-gray-100 dark:bg-dark-primary dark:border-gray-800">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-1 dark:text-white/90">
          Billings
        </h2>
        <p className="text-sm font-normal text-gray-500 dark:text-gray-400">
          Invoices & payments Information
        </p>
      </div>
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-clip">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100 dark:bg-white/5 border-b dark:border-gray-800 border-gray-200">
                <th className="text-left whitespace-nowrap font-medium px-5 py-3.5 text-gray-500 dark:text-gray-400 text-base border-r border-gray-200 dark:border-gray-800">
                  Package
                </th>
                <th className="text-left whitespace-nowrap font-medium px-5 py-3.5 text-gray-500 dark:text-gray-400 text-base border-r border-gray-200 dark:border-gray-800">
                  Amount Paid
                </th>
                <th className="text-left whitespace-nowrap font-medium px-5 py-3.5 text-gray-500 dark:text-gray-400 text-base border-r border-gray-200 dark:border-gray-800">
                  Purchased On
                </th>
                <th className="text-left whitespace-nowrap font-medium px-5 py-3.5 text-gray-500 dark:text-gray-400 text-base">
                  Invoice
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {data.map((item) => (
                <tr key={item.id}>
                  <td className="capitalize px-5 py-3.5 font-medium text-gray-700 dark:text-gray-400 text-sm min-w-80 border-r border-gray-200 dark:border-gray-800">
                    {item.package}
                  </td>

                  <td className="px-5 py-3.5 w-[10.125rem] font-medium text-gray-700 dark:text-gray-400 text-sm border-r border-gray-200 dark:border-gray-800">
                    {item.amount}
                  </td>

                  <td className="px-5 py-3.5 w-[11.875rem] text-gray-500 dark:text-gray-400 text-sm border-r border-gray-200 dark:border-gray-800">
                    {dayjs(item.purchasedDate).format("DD MMM, YYYY")}
                  </td>

                  <td className="px-5 py-3.5 w-[12.875rem]">
                    {item.invoicePdfLink && (
                      <InvoiceDownloadButton href={item.invoicePdfLink} />
                    )}
                  </td>
                </tr>
              ))}

              {data.length === 0 && (
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
    </div>
  );
}

function InvoiceDownloadButton({ href }: { href: string }) {
  return (
    <Link
      download
      href={href}
      className="text-white text-sm inline-flex gap-2 items-center justify-center font-medium transition-colors hover:bg-gray-800 py-3 px-5 rounded-full dark:bg-white/5 border-gray-200 bg-gray-700 truncate"
    >
      Download PDF
      <DownloadIcon className="size-5" />
    </Link>
  );
}

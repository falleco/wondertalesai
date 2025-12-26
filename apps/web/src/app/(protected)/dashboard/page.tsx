import EmailContent from "@web/components/email/EmailInbox/EmailContent";
import { trpc } from "@web/trpc/server";

type DashboardPageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

const parsePage = (value?: string) => {
  if (!value) {
    return 1;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const page = parsePage((await searchParams)?.page);
  const pageSize = 20;
  const inbox = await trpc.integrations.emailInbox.query({
    page,
    pageSize,
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total email connections
          </p>
          <p className="mt-3 text-2xl font-semibold text-gray-800 dark:text-white/90">
            {inbox.stats.totalConnections}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total emails synced
          </p>
          <p className="mt-3 text-2xl font-semibold text-gray-800 dark:text-white/90">
            {inbox.stats.totalEmails}
          </p>
        </div>
      </div>
      <div className="sm:h-[calc(100vh-174px)] h-screen xl:h-[calc(100vh-186px)]">
        <div className="xl:grid xl:grid-cols-12 flex flex-col gap-5 sm:gap-5">
          <EmailContent emails={inbox.emails} pagination={inbox.pagination} />
        </div>
      </div>
    </div>
  );
}

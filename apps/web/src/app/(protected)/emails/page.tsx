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
      <div className="sm:h-[calc(100vh-174px)] h-screen xl:h-[calc(100vh-186px)">
        <div className="xl:grid xl:grid-cols-12 flex flex-col gap-5 sm:gap-5">
          {/* <div className="xl:col-span-3 col-span-full">
            <EmailSidebar />
          </div> */}
          <EmailContent emails={inbox.emails} pagination={inbox.pagination} />
        </div>
      </div>
    </div>
  );
}

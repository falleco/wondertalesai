import { trpc } from "@web/trpc/server";
import Link from "next/link";

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
  const [inbox, dashboard] = await Promise.all([
    trpc.datasources.emailInbox.query({
      page,
      pageSize,
    }),
    trpc.datasources.dashboardSummary.query(),
  ]);

  const formatHours = (value: number | null) => {
    if (value === null) {
      return "—";
    }
    if (value < 1) {
      return "<1h";
    }
    return `${value}h`;
  };

  const formatDate = (value?: string | null) => {
    if (!value) {
      return "—";
    }
    return new Date(value).toLocaleDateString();
  };

  const inboxHealth = dashboard.inboxHealth;
  const controlRoom = dashboard.controlRoom;

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

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Inbox Health Score
            </p>
            <p className="mt-2 text-3xl font-semibold text-gray-800 dark:text-white/90">
              {inboxHealth.score}
              <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                / 100
              </span>
            </p>
          </div>
          <div className="rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-600 dark:bg-white/10 dark:text-gray-200">
            {inboxHealth.message}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/5 dark:text-gray-200">
            <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
              Inbox load (7d)
            </p>
            <p className="mt-2 text-lg font-semibold">
              {inboxHealth.metrics.inboxLoad}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/5 dark:text-gray-200">
            <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
              Important vs noise
            </p>
            <p className="mt-2 text-lg font-semibold">
              {inboxHealth.metrics.importantShare}% important
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {inboxHealth.metrics.noiseShare}% noise
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/5 dark:text-gray-200">
            <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
              Avg time to respond
            </p>
            <p className="mt-2 text-lg font-semibold">
              {formatHours(inboxHealth.metrics.avgResponseHours)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/5 dark:text-gray-200">
            <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
              Automations set
            </p>
            <p className="mt-2 text-lg font-semibold">
              {inboxHealth.metrics.automationsCount}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/5 dark:text-gray-200">
            <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
              Newsletters unsubscribed
            </p>
            <p className="mt-2 text-lg font-semibold">
              {inboxHealth.metrics.newslettersUnsubscribed}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/5 dark:text-gray-200">
            <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
              Weekly trend
            </p>
            <p className="mt-2 text-lg font-semibold">
              {inboxHealth.trend > 0
                ? `+${inboxHealth.trend}%`
                : `${inboxHealth.trend}%`}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Email Control Room
            </p>
            <p className="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">
              Your command center for today
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Today’s critical items
            </p>
            <div className="mt-3 space-y-3">
              {controlRoom.criticalToday.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No critical items detected today.
                </p>
              ) : (
                controlRoom.criticalToday.map((item) => (
                  <Link
                    key={item.messageId}
                    href={`/emails?message=${item.messageId}`}
                    className="block rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 hover:bg-white dark:border-gray-800 dark:bg-white/5 dark:text-gray-200"
                  >
                    <p className="font-medium">{item.subject}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.from.name ?? item.from.email} ·{" "}
                      {formatDate(item.sentAt)}
                    </p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {item.summary || "No summary available."}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Pending tasks
            </p>
            <div className="mt-3 space-y-3">
              {controlRoom.pendingTasks.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No pending tasks extracted.
                </p>
              ) : (
                controlRoom.pendingTasks.map((task) => (
                  <Link
                    key={`${task.messageId}-${task.title}`}
                    href={`/emails?message=${task.messageId}`}
                    className="block rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 hover:bg-white dark:border-gray-800 dark:bg-white/5 dark:text-gray-200"
                  >
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {task.from.name ?? task.from.email} · No due date
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Upcoming deadlines
            </p>
            <div className="mt-3 space-y-3">
              {controlRoom.upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No upcoming deadlines found.
                </p>
              ) : (
                controlRoom.upcomingDeadlines.map((task) => (
                  <Link
                    key={`${task.messageId}-${task.title}-${task.dueDate ?? ""}`}
                    href={`/emails?message=${task.messageId}`}
                    className="block rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 hover:bg-white dark:border-gray-800 dark:bg-white/5 dark:text-gray-200"
                  >
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {task.from.name ?? task.from.email} · Due{" "}
                      {formatDate(task.dueDate)}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Unread important
            </p>
            <div className="mt-3 space-y-3">
              {controlRoom.unreadImportant.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No unread important messages.
                </p>
              ) : (
                controlRoom.unreadImportant.map((item) => (
                  <Link
                    key={item.messageId}
                    href={`/emails?message=${item.messageId}`}
                    className="block rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 hover:bg-white dark:border-gray-800 dark:bg-white/5 dark:text-gray-200"
                  >
                    <p className="font-medium">{item.subject}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.from.name ?? item.from.email} ·{" "}
                      {formatDate(item.sentAt)}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800 lg:col-span-2">
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Important thread summaries
            </p>
            <div className="mt-3 space-y-3">
              {controlRoom.importantThreads.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No important threads right now.
                </p>
              ) : (
                controlRoom.importantThreads.map((thread) => (
                  <Link
                    key={thread.threadId}
                    href={
                      thread.messageId
                        ? `/emails?message=${thread.messageId}`
                        : "/emails"
                    }
                    className="block rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 hover:bg-white dark:border-gray-800 dark:bg-white/5 dark:text-gray-200"
                  >
                    <p className="font-medium">{thread.subject}</p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {thread.summary}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

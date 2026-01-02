import Link from "next/link";

type EmailPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  basePath?: string;
};

export default function EmailPagination({
  page,
  pageSize,
  total,
  basePath = "/emails",
}: EmailPaginationProps) {
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(page * pageSize, total);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const prevHref = `${basePath}?page=${Math.max(page - 1, 1)}`;
  const nextHref = `${basePath}?page=${Math.min(page + 1, totalPages)}`;

  return (
    <div className="sticky bottom-0 flex items-center rounded-b-2xl justify-between border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-[#171f2f]">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing {start}-{end} of {total}
      </p>
      <div className="flex items-center justify-end gap-2">
        {hasPrev ? (
          <Link
            href={prevHref}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.03]"
            aria-label="Previous page"
          >
            <svg
              className="stroke-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Previous"
              role="img"
            >
              <path
                d="M7.29167 15.8335L12.5 10.6252L7.29167 5.41683"
                stroke=""
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        ) : (
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-300 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-600"
            disabled
            aria-disabled="true"
          >
            <svg
              className="stroke-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Previous"
              role="img"
            >
              <path
                d="M7.29167 15.8335L12.5 10.6252L7.29167 5.41683"
                stroke=""
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        {hasNext ? (
          <Link
            href={nextHref}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.03]"
            aria-label="Next page"
          >
            <svg
              className="stroke-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Next"
              role="img"
            >
              <path
                d="M12.7083 5L7.5 10.2083L12.7083 15.4167"
                stroke=""
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        ) : (
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-300 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-600"
            disabled
            aria-disabled="true"
          >
            <svg
              className="stroke-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Next"
              role="img"
            >
              <path
                d="M12.7083 5L7.5 10.2083L12.7083 15.4167"
                stroke=""
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

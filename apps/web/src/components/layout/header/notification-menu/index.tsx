import { BellIcon, XIcon } from "@web/components/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@web/components/ui/dropdown";
import { cn, getTimeAgo } from "@web/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { UNREAD_NOTIFICATIONS } from "./data";

const UNREAD_COUNT = UNREAD_NOTIFICATIONS.length;

export function NotificationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCount, setShowCount] = useState(true);

  useEffect(() => {
    // Only for demonstration purposes.

    if (isOpen && showCount) {
      setShowCount(false);
    }

    if (!isOpen && !showCount) {
      const timer = setTimeout(() => {
        setShowCount(true);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, showCount]);

  return (
    <Dropdown setIsOpen={setIsOpen} isOpen={isOpen}>
      <DropdownTrigger className="grid place-items-center size-11 rounded-full text-[#667085] bg-[#F2F4F7] dark:bg-white/5 dark:text-white/60 hover:bg-gray-100  dark:hover:bg-white/10 hover:text-gray-800 dark:hover:text-white/90">
        <span className="sr-only">
          Toggle notification menu ({UNREAD_COUNT} unread)
        </span>

        <BellIcon />

        {showCount && UNREAD_COUNT > 0 && (
          <span className="grid place-items-center absolute right-0 top-0 text-[.625rem] font-medium leading-none text-white bg-[#FD853A] rounded-full size-[0.894rem] ring-2 dark:ring-[#171F2E] ">
            {UNREAD_COUNT > 9 ? "9+" : UNREAD_COUNT}
          </span>
        )}
      </DropdownTrigger>
      <DropdownContent
        align="end"
        className="bg-white dark:bg-dark-primary text-[#667085] dark:text-[#98A2B3] border border-gray-200 dark:border-gray-800 p-3 rounded-2xl shadow-theme-lg w-full max-w-[22.5rem] space-y-3"
      >
        <div className="flex justify-between">
          <h3 className="text-lg font-medium leading-7 text-[#1D2939] dark:text-white/90">
            Notifications
          </h3>

          <button type="button" onClick={() => setIsOpen(false)}>
            <span className="sr-only">Close menu</span>
            <XIcon />
          </button>
        </div>

        <hr className="border-[#F2F4F7] dark:border-[#1D2939]" />

        <div className="max-h-[22.5rem] overflow-y-auto custom-scrollbar">
          {UNREAD_NOTIFICATIONS.map((notification) => (
            <Link
              href={notification.slug}
              key={notification.id}
              className="p-3 flex items-start gap-3 rounded-lg hover:bg-[#f9fafb] dark:hover:bg-white/8"
            >
              <div className="relative shrink-0">
                <Image
                  src={notification.user.imageUrl}
                  alt={`Avatar of ${notification.user.name}`}
                  width={40}
                  height={40}
                  className="rounded-full object-cover size-10 text-xs"
                  quality={100}
                />

                <span
                  className={cn(
                    "size-2.5 rounded-full ring-[1.5px] ring-white dark:ring-dark-primary absolute bottom-0 right-0",
                    {
                      "bg-error-500": !notification.user.isActive,
                      "bg-[#12B76A]": notification.user.isActive,
                    },
                  )}
                />
              </div>

              <div>
                <h4
                  className="text-sm mb-2 [&>strong]:text-[#1D2939] [&>strong]:font-medium dark:[&>strong]:text-white/90"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: Only for demonstration purposes. In a real application, you should use a parser library.
                  dangerouslySetInnerHTML={{ __html: notification.title }}
                ></h4>

                <dl className="flex gap-2 items-center">
                  <dt className="sr-only">Notification for</dt>
                  <dd className="text-xs">Project</dd>

                  <div
                    className="size-1 bg-[#98A2B3] rounded-full"
                    aria-hidden
                  />

                  <dt className="sr-only">Time</dt>
                  <dd className="text-xs">
                    <time
                      dateTime={notification.time}
                      title={new Date(notification.time).toLocaleString()}
                    >
                      {getTimeAgo(notification.time)}
                    </time>
                  </dd>
                </dl>
              </div>
            </Link>
          ))}
        </div>

        <Link
          href={"#"}
          className="rounded-full block p-3 text-sm text-center text-[#344054] dark:text-current font-medium border border-[#D0D5DD] dark:border-[#344054] bg-white dark:bg-[#1D2939] shadow-xs hover:opacity-85"
        >
          View All Notification
        </Link>
      </DropdownContent>
    </Dropdown>
  );
}

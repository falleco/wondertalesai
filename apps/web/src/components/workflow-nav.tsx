"use client";

import { cn } from "@web/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/workflow", label: "Rules" },
  { href: "/workflow/triggers", label: "Triggers" },
];

export default function WorkflowNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full border transition",
              isActive
                ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                : "border-gray-200 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

"use client";

import { ChevronDownIcon } from "@web/components/icons";
import { navItems } from "@web/components/layout/header/nav-items";
import { cn } from "@web/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function MobileSidebar() {
  const pathname = usePathname();
  const [activeDropdown, setActiveDropdown] = useState("");

  const toggleDropdown = (key: string) => {
    setActiveDropdown(activeDropdown === key ? "" : key);
  };

  return (
    <div className="pt-2 pb-3 space-y-1 px-4 sm:px-6">
      {navItems.map((item, i) => {
        if (item.type === "link") {
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block px-3 py-2 rounded-md text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
                {
                  "text-gray-800 dark:text-white": pathname === item.href,
                },
              )}
            >
              {item.label}
            </Link>
          );
        }

        if (item.type === "dropdown") {
          return (
            <div key={item.items[i].href}>
              <button
                type="button"
                onClick={() => toggleDropdown(item.items[i].href)}
                className={cn(
                  "flex justify-between items-center w-full px-3 py-2 rounded-md text-sm font-medium" +
                    " text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
                  {
                    "text-gray-700 dark:text-gray-200": item.items.some(
                      (subItem) => pathname.includes(subItem.href),
                    ),
                  },
                )}
              >
                <span>{item.label}</span>
                <span
                  className={cn(
                    "size-4 transition-transform duration-200",
                    activeDropdown === item.items[i].href && "rotate-180",
                  )}
                >
                  <ChevronDownIcon />
                </span>
              </button>

              {activeDropdown === item.items[i].href && (
                <div className="mt-2 space-y-1 pl-4">
                  {item.items.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={cn(
                        "flex items-center px-3 py-2 gap-1.5 rounded-md text-sm font-medium text-gray-500" +
                          " dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
                        {
                          "px-2": "icon" in subItem,
                          "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200":
                            pathname.includes(subItem.href),
                        },
                      )}
                    >
                      {"icon" in subItem && (
                        <Image
                          src={subItem.icon}
                          className="size-8"
                          alt=""
                          role="presentation"
                          width={32}
                          height={32}
                          fetchPriority="high"
                          priority
                        />
                      )}

                      <span>{subItem.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

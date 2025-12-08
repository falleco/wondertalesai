"use client";

import { authClient } from "@web/auth/client";
import {
  InfoIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
} from "@web/components/icons";
import { useClickOutside } from "@web/hooks/use-click-outside";
import type { User } from "better-auth";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const LINK_ITEMS = [
  { href: "/profile", label: "Edit profile", Icon: UserIcon },
  { href: "/billing", label: "Account settings", Icon: SettingsIcon },
  { href: "/support", label: "Support", Icon: InfoIcon },
];

const FALLBACK_IMAGE = "/images/users/user-1.png";

export function UserProfileDropdown({ user }: { user?: User }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));
  const router = useRouter();

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full text-sm font-medium block overflow-clip"
      >
        <Image
          src={user?.image || FALLBACK_IMAGE}
          width={100}
          height={100}
          className="size-11 object-cover border border-gray-200 dark:border-[#1D2939] rounded-full"
          alt="User avatar"
          quality={90}
        />
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-[260px] shadow-lg dark:bg-[#1A2231] dark:border-gray-800 py-4 px-3 bg-white border border-gray-200 rounded-2xl">
          <div className="mb-4 px-3 text-sm leading-5">
            <div className="text-[#344054] dark:text-[#98A2B3] font-medium">
              {user?.name} {user?.id}
            </div>
            <div className="text-[#667085] dark:text-[#98A2B3]">
              {user?.email}
            </div>
          </div>

          <div className="space-y-1">
            {LINK_ITEMS.map(({ href, label, Icon }) => (
              <Link
                href={href}
                key={href}
                className="px-3 py-2 flex gap-3 dark:hover:bg-white/5 dark:text-gray-400 font-medium items-center text-sm text-[#344054] hover:text-gray-800 transition hover:bg-gray-100 rounded-lg dark:hover:text-white/90 group"
              >
                <Icon className="group-hover:text-gray-800 text-[#667085] dark:text-current!" />
                {label}
              </Link>
            ))}

            <hr className="border-gray-200 my-3 dark:border-gray-800" />

            <button
              type="button"
              onClick={async () => {
                await authClient.signOut();
                router.push("/");
                router.refresh();
              }}
              className="px-3 py-2 flex gap-3 dark:hover:bg-white/5 dark:text-gray-400 font-medium items-center text-sm text-gray-700 hover:text-gray-800 transition hover:bg-gray-100 rounded-lg dark:hover:text-white/90 w-full group"
            >
              <LogOutIcon className="group-hover:text-gray-800 text-[#667085] dark:text-current!" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

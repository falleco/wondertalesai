"use client";
import { CloseIcon, MenuIcon } from "@web/components/icons";
import type { User } from "better-auth";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import DesktopNav from "./desktop-nav";
import MainMobileNav from "./main-mobile-nav";
import { NotificationMenu } from "./notification-menu";
import ThemeToggle from "./theme-toggle";
import { UserProfileDropdown } from "./user-dropdown";

export default function Header({ user }: { user?: User }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }
    setMobileMenuOpen(false);
  }, [pathname]);

  const isVisible = useMemo(() => {
    return ![
      "/profile",
      "/billing",
      "/integrations",
      "/dashboard",
      "/emails",
      "/contacts",
      "/workflow/rules",
      "/workflow/triggers",
    ].includes(pathname);
  }, [pathname]);

  if (!isVisible) return null;

  return (
    <header className="bg-white dark:bg-dark-primary border-b dark:border-gray-800 border-gray-100 sticky top-0 z-50 py-2 lg:py-4">
      <div className="px-4 sm:px-6 lg:px-7">
        <div className="grid grid-cols-2 items-center lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center">
            <Link href="/" className="flex items-end gap-2">
              <Image
                src="/images/logo-black.svg"
                className="block dark:hidden"
                alt="AiStarterKit Logo"
                width={180}
                height={30}
              />

              <Image
                src="/images/logo-white.svg"
                className="hidden dark:block"
                alt="AiStarterKit Logo"
                width={180}
                height={30}
              />

              <span className="inline-block px-1.5 py-0.5 rounded-lg rounded-bl-none bg-primary-500/90 text-white text-xs font-medium mb-0.5">
                Demo
              </span>
            </Link>
          </div>

          <DesktopNav />

          <div className="flex items-center gap-4 justify-self-end">
            <ThemeToggle />
            {!!user && <NotificationMenu />}
            {!!user && <UserProfileDropdown user={user} />}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              type="button"
              className="order-last shrink-0 inline-flex items-center justify-center p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
            >
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>

            {!user && (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm hidden lg:block font-medium text-gray-700 dark:text-gray-400 hover:text-primary-500"
                >
                  Sign In
                </Link>

                <Link
                  href="/sign-in"
                  className="lg:inline-flex items-center px-5 py-3 gradient-btn hidden text-sm text-white rounded-full button-bg h-11"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <MainMobileNav isOpen={mobileMenuOpen} />
    </header>
  );
}

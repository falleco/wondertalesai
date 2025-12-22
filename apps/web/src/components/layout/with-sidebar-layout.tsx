"use client";

import type { User } from "better-auth";
import { useEffect, useRef, useState } from "react";
import DashboardHeader from "./dashboard-header";
import DashboardRightSidebar from "./dashboard-right-sidebar";
import DashboardSidebar, { type SidebarMenuItem } from "./dashboard-sidebar";

export default function WithSidebarLayout({
  children,
  user,
  menuItems,
}: Readonly<{
  children: React.ReactNode;
  user: User;
  menuItems: SidebarMenuItem[];
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    setHeaderHeight(headerRef.current?.offsetHeight || 0);
  });

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };
  const toggleRightSidebar = () => setRightSidebarOpen((prev) => !prev);

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <DashboardHeader
        user={user}
        ref={headerRef}
        toggleSidebar={toggleSidebar}
        sidebarOpen={sidebarOpen}
        toggleRightSidebar={toggleRightSidebar}
      />

      <div className="grid lg:grid-cols-[auto_1fr] dark:bg-gray-900 relative flex-1">
        <DashboardSidebar
          menuItems={menuItems}
          sidebarOpen={sidebarOpen}
          user={user}
        />

        <main
          className="relative py-6 px-4 sm:px-6 lg:px-8 overflow-y-auto"
          style={{
            // 1px is for the border width of the header
            maxHeight: `calc(100vh - ${headerHeight + 1}px)`,
          }}
        >
          {children}
        </main>

        <DashboardRightSidebar rightSidebarOpen={rightSidebarOpen} />
      </div>

      {/* Overlays */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-800/80 backdrop-blur-lg transition-opacity"
          aria-hidden="true"
          onClick={toggleSidebar}
        />
      )}
      {rightSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-800/80 backdrop-blur-lg transition-opacity lg:hidden"
          aria-hidden="true"
          onClick={toggleRightSidebar}
        />
      )}
    </div>
  );
}

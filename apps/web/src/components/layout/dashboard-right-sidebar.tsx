import MobileSidebar from "./mobile-sidebar";

export default function DashboardRightSidebar({
  rightSidebarOpen,
}: {
  rightSidebarOpen: boolean;
}) {
  return (
    <aside
      className={`lg:hidden absolute inset-y-0 right-0 z-40 w-[288px] bg-white dark:bg-dark-primary border-l border-gray-100 dark:border-gray-800 transform transition-transform duration-300 ease-in-out translate-x-0 ${
        rightSidebarOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="h-full flex flex-col">
        {/* <!-- Mobile Navigation - Always visible on small screens --> */}
        <div className="lg:hidden mobile-menu">
          <h4 className="px-8.5 mb-4 pt-10 text-xs font-medium text-gray-500 dark:text-gray-400">
            Top Menu
          </h4>
          <MobileSidebar />
        </div>
      </div>
    </aside>
  );
}

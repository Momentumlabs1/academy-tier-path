import { Outlet, useLocation } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { RightRail } from "./RightRail";
import { MobileNav } from "./MobileNav";

export function AppShell() {
  const location = useLocation();
  return (
    <div className="min-h-screen p-3 pb-24 lg:p-4 lg:pb-4">
      <div className="flex gap-6">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden">
          <TopNav />
          <div key={location.pathname} className="animate-page-enter">
            <Outlet />
          </div>
        </main>
        <RightRail />
      </div>
      <MobileNav />
    </div>
  );
}
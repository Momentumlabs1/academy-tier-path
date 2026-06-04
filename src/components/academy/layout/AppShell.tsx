import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { RightRail } from "./RightRail";
import { MobileNav } from "./MobileNav";

export function AppShell() {
  return (
    <div className="min-h-screen p-4 lg:p-4">
      <div className="flex gap-6">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <TopNav />
          <Outlet />
        </main>
        <RightRail />
      </div>
      <MobileNav />
    </div>
  );
}
import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { RightRail } from "./RightRail";
import { MobileNav } from "./MobileNav";
import { RegistrationGate } from "@/components/academy/onboarding/RegistrationGate";
import { MemberProvider } from "@/hooks/useMemberState";

export function AppShell() {
  // No key on the Outlet wrapper: keying by pathname remounted the whole
  // page tree on every navigation (images refetch, animations replay),
  // which read as a "full reload" flash on each click.
  return (
    <RegistrationGate>
      <MemberProvider>
      <div className="min-h-screen p-3 pb-24 lg:p-4 lg:pb-4">
        <div className="flex gap-6">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-x-hidden">
            <TopNav />
            <Outlet />
          </main>
          <RightRail />
        </div>
        <MobileNav />
      </div>
      </MemberProvider>
    </RegistrationGate>
  );
}
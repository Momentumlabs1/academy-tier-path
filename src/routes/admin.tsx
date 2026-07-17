import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminShell } from "@/components/academy/admin/AdminShell";
import { isAdminSession } from "@/lib/admin-auth";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "ok">("checking");

  useEffect(() => {
    let alive = true;
    isAdminSession().then((ok) => {
      if (!alive) return;
      if (ok) setStatus("ok");
      else navigate({ to: "/login" });
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[oklch(0.11_0.03_255)] text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}

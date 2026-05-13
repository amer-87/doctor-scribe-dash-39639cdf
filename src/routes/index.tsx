import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { loading, session, role, profile } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) { nav({ to: "/auth" }); return; }
    if (role === "admin") { nav({ to: "/admin" }); return; }
    if (profile?.status !== "approved") { nav({ to: "/pending" }); return; }
    if (role === "doctor") nav({ to: "/doctor" });
    else if (role === "secretary") nav({ to: "/secretary" });
  }, [loading, session, role, profile, nav]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-primary">
      <Loader2 className="h-10 w-10 animate-spin text-primary-foreground" />
    </div>
  );
}

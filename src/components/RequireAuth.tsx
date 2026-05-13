import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  allow?: Array<"admin" | "doctor" | "secretary">;
}

export function RequireAuth({ children, allow }: Props) {
  const { session, role, profile, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) { nav({ to: "/auth" }); return; }
    if (profile && profile.status !== "approved" && role !== "admin") {
      nav({ to: "/pending" }); return;
    }
    if (allow && role && !allow.includes(role)) {
      nav({ to: "/" });
    }
  }, [session, role, profile, loading, allow, nav]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return <>{children}</>;
}

import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, LogOut, Stethoscope, Settings, Users, ShieldCheck, KeyRound, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader() {
  const { profile, role, signOut, user } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!user || role !== "doctor") { setDaysLeft(null); return; }
    const load = () =>
      supabase.from("profiles").select("subscription_end").eq("id", user.id).maybeSingle().then(({ data }) => {
        const end = (data as any)?.subscription_end as string | null;
        if (!end) { setDaysLeft(null); return; }
        const d = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
        setDaysLeft(d);
      });
    load();
    const ch = supabase.channel(`subexp-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, role]);

  const handleLogout = async () => {
    await signOut();
    nav({ to: "/auth" });
  };

  const showWarn = role === "doctor" && daysLeft !== null && daysLeft <= 7;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/80 backdrop-blur-md no-print">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-elegant">
            <Stethoscope className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold">نظام إدارة العيادة</div>
            <div className="text-xs text-muted-foreground">{profile?.full_name}</div>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {role === "admin" && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin"><ShieldCheck className="ml-1 h-4 w-4" />المدير</Link>
            </Button>
          )}
          {role === "doctor" && (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/doctor"><Users className="ml-1 h-4 w-4" />المراجعون</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/doctor/settings"><Settings className="ml-1 h-4 w-4" />الإعدادات</Link>
              </Button>
            </>
          )}
          {role === "secretary" && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/secretary"><Users className="ml-1 h-4 w-4" />السكرتير</Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/account"><KeyRound className="ml-1 h-4 w-4" />الحساب</Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </div>

      {showWarn && (
        <Link to="/doctor/settings" className="block">
          <div className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium ${daysLeft! <= 0 ? "bg-destructive text-destructive-foreground" : "bg-amber-500 text-white"}`}>
            <AlertTriangle className="h-3.5 w-3.5" />
            {daysLeft! <= 0
              ? "انتهى اشتراكك — يرجى التجديد"
              : daysLeft === 1
                ? "ينتهي اشتراكك غداً — يرجى التجديد"
                : `يتبقى ${daysLeft} أيام على نهاية اشتراكك — يرجى التجديد`}
          </div>
        </Link>
      )}
    </header>
  );
}

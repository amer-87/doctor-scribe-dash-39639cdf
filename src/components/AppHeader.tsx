import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Moon, Sun, LogOut, Stethoscope, Settings, Users, ShieldCheck, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";

export function AppHeader() {
  const { profile, role, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();

  const handleLogout = async () => {
    await signOut();
    nav({ to: "/auth" });
  };

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
    </header>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, XCircle, LogOut, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/pending")({ component: PendingPage });

function PendingPage() {
  const { profile, signOut, refresh, loading, session } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !session) nav({ to: "/auth" });
    if (profile?.status === "approved") nav({ to: "/" });
  }, [loading, session, profile, nav]);

  const isRejected = profile?.status === "rejected";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="items-center text-center">
          <div className={`mb-3 flex h-16 w-16 items-center justify-center rounded-full ${isRejected ? "bg-destructive/10" : "bg-warning/20"}`}>
            {isRejected ? <XCircle className="h-8 w-8 text-destructive" /> : <Clock className="h-8 w-8 text-warning-foreground" />}
          </div>
          <CardTitle>{isRejected ? "تم رفض الحساب" : "الحساب قيد المراجعة"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {isRejected
              ? profile?.email && `تم رفض طلب الانضمام. السبب: ${(profile as any).rejection_reason || "غير محدد"}`
              : "حسابك بانتظار موافقة الإدارة. سيتم إعلامك فور الموافقة."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={refresh}><RefreshCw className="ml-2 h-4 w-4" />تحديث</Button>
            <Button variant="ghost" className="flex-1" onClick={async () => { await signOut(); nav({ to: "/auth" }); }}>
              <LogOut className="ml-2 h-4 w-4" />خروج
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

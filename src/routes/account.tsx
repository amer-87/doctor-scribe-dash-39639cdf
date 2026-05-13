import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppHeader } from "@/components/AppHeader";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  component: () => <RequireAuth><AccountPage /></RequireAuth>,
});

function AccountPage() {
  const { user } = useAuth();
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    if (newPwd.length < 8) return toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    if (newPwd !== confirmPwd) return toast.error("كلمتا المرور غير متطابقتين");

    setLoading(true);
    // Re-authenticate with current password (security check)
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email, password: currentPwd,
    });
    if (signInErr) {
      setLoading(false);
      return toast.error("كلمة المرور الحالية غير صحيحة");
    }
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("تم تغيير كلمة المرور بنجاح");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    }
  };

  const sendReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) toast.error(error.message);
    else { toast.success("تم إرسال رابط إعادة التعيين إلى بريدك"); setResetSent(true); }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-2xl p-4 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">الحساب والأمان</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />تغيير كلمة المرور</CardTitle>
            <CardDescription>سيتم التحقق من هويتك بكلمة المرور الحالية قبل التغيير</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={change} className="space-y-3">
              <div><Label>البريد الإلكتروني</Label><Input value={user?.email ?? ""} readOnly dir="ltr" className="bg-muted" /></div>
              <div><Label>كلمة المرور الحالية</Label><Input type="password" required value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} dir="ltr" /></div>
              <div><Label>كلمة المرور الجديدة (8+)</Label><Input type="password" required minLength={8} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} dir="ltr" /></div>
              <div><Label>تأكيد كلمة المرور الجديدة</Label><Input type="password" required minLength={8} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} dir="ltr" /></div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}تحديث كلمة المرور
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>نسيت كلمة المرور؟</CardTitle>
            <CardDescription>أرسل رمز/رابط تحقق إلى بريدك الإلكتروني</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={sendReset} disabled={resetSent}>
              {resetSent ? "تم الإرسال ✓" : "إرسال رابط إعادة التعيين"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

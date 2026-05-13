import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Stethoscope, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const { session, loading: authLoading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!authLoading && session) nav({ to: "/" }); }, [session, authLoading, nav]);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup state
  const [signupRole, setSignupRole] = useState<"doctor" | "secretary">("doctor");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [doctors, setDoctors] = useState<{ id: string; full_name: string; clinic_name: string | null }[]>([]);
  const [signupLoading, setSignupLoading] = useState(false);

  useEffect(() => {
    if (signupRole === "secretary") {
      // Public-ish: list approved doctors (RLS blocks this for anon — fallback: free text)
      supabase.from("profiles").select("id,full_name,clinic_name").eq("status", "approved").then(({ data }) => {
        if (data) setDoctors(data as typeof doctors);
      });
    }
  }, [signupRole]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPwd });
    setLoginLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("تم تسجيل الدخول"); nav({ to: "/" }); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupRole === "secretary" && !doctorId) {
      toast.error("يرجى إدخال معرف الطبيب");
      return;
    }
    setSignupLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password: pwd,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          role: signupRole,
          full_name: fullName,
          phone,
          specialty: signupRole === "doctor" ? specialty : null,
          clinic_name: signupRole === "doctor" ? clinicName : null,
          doctor_id: signupRole === "secretary" ? doctorId : null,
        },
      },
    });
    setSignupLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("تم إنشاء الحساب. الحساب بانتظار الموافقة.");
      // Auto-login since auto-confirm is on
      await supabase.auth.signInWithPassword({ email, password: pwd });
      nav({ to: "/" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-accent/30 to-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-elegant">
            <Stethoscope className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">نظام إدارة العيادة</h1>
          <p className="text-sm text-muted-foreground">منصة طبية حديثة لإدارة المراجعين والوصفات</p>
        </div>
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>أهلاً بك</CardTitle>
            <CardDescription>سجل دخولك أو أنشئ حساباً جديداً</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleLogin} className="space-y-3">
                  <div><Label>البريد الإلكتروني</Label><Input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} dir="ltr" /></div>
                  <div><Label>كلمة المرور</Label><Input type="password" required value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)} dir="ltr" /></div>
                  <Button type="submit" className="w-full" disabled={loginLoading}>
                    {loginLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}دخول
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignup} className="space-y-3">
                  <div>
                    <Label>نوع الحساب</Label>
                    <Select value={signupRole} onValueChange={(v: "doctor" | "secretary") => setSignupRole(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="doctor">طبيب</SelectItem>
                        <SelectItem value="secretary">سكرتير</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>الاسم الكامل</Label><Input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                  <div><Label>البريد الإلكتروني</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" /></div>
                  <div><Label>كلمة المرور</Label><Input type="password" required minLength={6} value={pwd} onChange={(e) => setPwd(e.target.value)} dir="ltr" /></div>
                  <div><Label>رقم الهاتف</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" /></div>
                  {signupRole === "doctor" && (
                    <>
                      <div><Label>الاختصاص</Label><Input required value={specialty} onChange={(e) => setSpecialty(e.target.value)} /></div>
                      <div><Label>اسم العيادة</Label><Input required value={clinicName} onChange={(e) => setClinicName(e.target.value)} /></div>
                    </>
                  )}
                  {signupRole === "secretary" && (
                    <div>
                      <Label>الطبيب</Label>
                      {doctors.length > 0 ? (
                        <Select value={doctorId} onValueChange={setDoctorId}>
                          <SelectTrigger><SelectValue placeholder="اختر الطبيب" /></SelectTrigger>
                          <SelectContent>
                            {doctors.map((d) => (
                              <SelectItem key={d.id} value={d.id}>{d.full_name} {d.clinic_name ? `- ${d.clinic_name}` : ""}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input placeholder="معرف الطبيب (UUID)" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} dir="ltr" />
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">سيحتاج حسابك إلى موافقة الطبيب</p>
                    </div>
                  )}
                  {signupRole === "doctor" && (
                    <p className="text-xs text-muted-foreground">سيتم إرسال طلب الموافقة إلى المدير</p>
                  )}
                  <Button type="submit" className="w-full" disabled={signupLoading}>
                    {signupLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}إنشاء الحساب
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

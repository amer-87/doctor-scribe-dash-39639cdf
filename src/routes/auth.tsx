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
import { Stethoscope, Loader2, MessageCircle } from "lucide-react";

const WHATSAPP_CONTACT_URL = "https://wa.me/9647717119882";

export const Route = createFileRoute("/auth")({ component: AuthPage });

const USERNAME_DOMAIN = "clinic.local";
const toEmail = (v: string) => v.includes("@") ? v.trim() : `${v.trim().toLowerCase()}@${USERNAME_DOMAIN}`;

function AuthPage() {
  const { session, loading: authLoading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!authLoading && session) nav({ to: "/" }); }, [session, authLoading, nav]);

  // Login state (email OR username)
  const [loginId, setLoginId] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup state
  const [signupRole, setSignupRole] = useState<"doctor" | "secretary">("doctor");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // secretary only
  const [pwd, setPwd] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [doctorCode, setDoctorCode] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  const logLogin = async (userId: string, email: string) => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
    const browser = /Chrome/i.test(ua) ? "Chrome" : /Firefox/i.test(ua) ? "Firefox" : /Safari/i.test(ua) ? "Safari" : /Edge/i.test(ua) ? "Edge" : "Browser";
    const os = /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "macOS" : /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Linux/i.test(ua) ? "Linux" : "Unknown OS";
    const device_label = `${isMobile ? "📱" : "💻"} ${browser} • ${os}`;
    await supabase.from("login_logs").insert({ user_id: userId, email, user_agent: ua, device_label });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const emailResolved = toEmail(loginId);
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailResolved, password: loginPwd });
    setLoginLoading(false);
    if (error) toast.error(error.message);
    else {
      if (data.user) await logLogin(data.user.id, data.user.email ?? emailResolved);
      toast.success("تم تسجيل الدخول"); nav({ to: "/" });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    let doctorId: string | null = null;
    let signupEmail = email;
    if (signupRole === "secretary") {
      const code = doctorCode.trim().toUpperCase();
      if (code.length !== 8) { toast.error("معرف الطبيب يجب أن يكون 8 رموز"); return; }
      if (!username.trim()) { toast.error("يرجى إدخال اسم المستخدم"); return; }
      const { data: did, error: lookupErr } = await supabase.rpc("find_doctor_by_code", { _code: code });
      if (lookupErr || !did) { toast.error("لم يتم العثور على طبيب بهذا المعرف"); return; }
      doctorId = did as string;
      signupEmail = toEmail(username);
    }
    setSignupLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail, password: pwd,
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
      const { data: signed } = await supabase.auth.signInWithPassword({ email: signupEmail, password: pwd });
      if (signed.user) await logLogin(signed.user.id, signed.user.email ?? signupEmail);
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
                  <div>
                    <Label>البريد الإلكتروني أو اسم المستخدم</Label>
                    <Input required value={loginId} onChange={(e) => setLoginId(e.target.value)} dir="ltr" />
                  </div>
                  <div><Label>كلمة المرور</Label><Input type="password" required value={loginPwd} onChange={(e) => setLoginPwd(e.target.value)} dir="ltr" /></div>
                  <Button type="submit" className="w-full" disabled={loginLoading}>
                    {loginLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}دخول
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <a href={WHATSAPP_CONTACT_URL} target="_blank" rel="noreferrer">
                      راسلنا عبر واتساب
                    </a>
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
                  {signupRole === "doctor" && (
                    <div><Label>البريد الإلكتروني</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" /></div>
                  )}
                  {signupRole === "secretary" && (
                    <div>
                      <Label>اسم المستخدم</Label>
                      <Input required value={username} onChange={(e) => setUsername(e.target.value.replace(/\s+/g, "").toLowerCase())} dir="ltr" placeholder="اختر اسماً للدخول" />
                      <p className="mt-1 text-xs text-muted-foreground">ستستخدم هذا الاسم لتسجيل الدخول</p>
                    </div>
                  )}
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
                      <Label>معرف الطبيب (8 رموز)</Label>
                      <Input required maxLength={8} value={doctorCode} onChange={(e) => setDoctorCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} dir="ltr" className="font-mono tracking-widest text-center uppercase" placeholder="XXXXXXXX" />
                      <p className="mt-1 text-xs text-muted-foreground">احصل على المعرف من الطبيب — سيحتاج حسابك إلى موافقته</p>
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

import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Mail, Phone, Stethoscope as Steth, Building2, MessageCircle, CalendarClock, Power, Save, History } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: () => <RequireAuth allow={["admin"]}><AdminPage /></RequireAuth>,
});

interface Profile {
  id: string; full_name: string; email: string; phone: string | null;
  specialty: string | null; clinic_name: string | null;
  status: "pending" | "approved" | "rejected"; doctor_id: string | null;
  subscription_start: string | null; subscription_end: string | null;
  is_active: boolean; deactivation_reason: string | null;
}

function AdminPage() {
  const [doctors, setDoctors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Profile | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "doctor");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) { setDoctors([]); setLoading(false); return; }
    const { data: profs } = await supabase.from("profiles").select("*").in("id", ids).order("created_at", { ascending: false });
    setDoctors((profs as Profile[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("profiles").update({
      status,
      rejection_reason: status === "rejected" ? "تم الرفض من قبل المدير" : null,
    }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(status === "approved" ? "تمت الموافقة على الحساب وبدء الاشتراك" : "تم رفض الحساب");
  };

  const pending = doctors.filter((d) => d.status === "pending");
  const approved = doctors.filter((d) => d.status === "approved");
  const rejected = doctors.filter((d) => d.status === "rejected");

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">لوحة المدير</h1>
          <p className="text-sm text-muted-foreground">إدارة الأطباء، الاشتراكات، والإعدادات العامة</p>
        </div>

        <Tabs defaultValue="doctors">
          <TabsList>
            <TabsTrigger value="doctors">الأطباء</TabsTrigger>
            <TabsTrigger value="settings">إعدادات الإدارة</TabsTrigger>
            <TabsTrigger value="logs">سجل الدخول</TabsTrigger>
          </TabsList>

          <TabsContent value="doctors" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="قيد الانتظار" value={pending.length} variant="warning" />
              <StatCard label="موافق عليهم" value={approved.length} variant="success" />
              <StatCard label="مرفوضون" value={rejected.length} variant="destructive" />
            </div>

            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending">قيد الانتظار ({pending.length})</TabsTrigger>
                <TabsTrigger value="approved">موافق ({approved.length})</TabsTrigger>
                <TabsTrigger value="rejected">مرفوض ({rejected.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="pending"><DoctorList list={pending} loading={loading} onAction={setStatus} onManage={setEditing} showActions /></TabsContent>
              <TabsContent value="approved"><DoctorList list={approved} loading={loading} onAction={setStatus} onManage={setEditing} showSubscription /></TabsContent>
              <TabsContent value="rejected"><DoctorList list={rejected} loading={loading} onAction={setStatus} onManage={setEditing} /></TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <AdminGeneralSettings />
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <LoginLogsPanel />
          </TabsContent>
        </Tabs>

        <SubscriptionEditDialog doctor={editing} onClose={() => setEditing(null)} />
      </main>
    </div>
  );
}

function StatCard({ label, value, variant }: { label: string; value: number; variant: "warning" | "success" | "destructive" }) {
  const colors = {
    warning: "bg-warning/15 text-warning-foreground border-warning/30",
    success: "bg-success/15 text-success border-success/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/30",
  };
  return (
    <Card className={colors[variant]}>
      <CardContent className="p-6">
        <div className="text-sm">{label}</div>
        <div className="mt-2 text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function DoctorList({ list, loading, onAction, onManage, showActions, showSubscription }: {
  list: Profile[]; loading: boolean;
  onAction: (id: string, s: "approved" | "rejected") => void;
  onManage: (d: Profile) => void;
  showActions?: boolean; showSubscription?: boolean;
}) {
  if (loading) return <p className="py-8 text-center text-muted-foreground">جار التحميل...</p>;
  if (list.length === 0) return <p className="py-8 text-center text-muted-foreground">لا يوجد</p>;
  return (
    <div className="mt-4 grid gap-3">
      {list.map((d) => {
        const expired = d.subscription_end && new Date(d.subscription_end) < new Date();
        const stateLabel = !d.is_active ? "موقوف" : expired ? "منتهي" : d.status === "approved" ? "نشط" : d.status === "rejected" ? "مرفوض" : "قيد الانتظار";
        const stateVariant: any = !d.is_active || expired ? "destructive" : d.status === "approved" ? "default" : d.status === "rejected" ? "destructive" : "secondary";
        return (
          <Card key={d.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">د. {d.full_name}</CardTitle>
                  <Badge variant={stateVariant} className="mt-1">{stateLabel}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {showActions && (
                    <>
                      <Button size="sm" variant="default" onClick={() => onAction(d.id, "approved")}><Check className="ml-1 h-4 w-4" />موافقة</Button>
                      <Button size="sm" variant="destructive" onClick={() => onAction(d.id, "rejected")}><X className="ml-1 h-4 w-4" />رفض</Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onManage(d)}>
                    <CalendarClock className="ml-1 h-4 w-4" />إدارة الاشتراك
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm md:grid-cols-2">
              <Info icon={<Steth className="h-4 w-4" />} text={d.specialty || "—"} label="الاختصاص" />
              <Info icon={<Building2 className="h-4 w-4" />} text={d.clinic_name || "—"} label="العيادة" />
              <Info icon={<Mail className="h-4 w-4" />} text={d.email} label="البريد" ltr />
              <Info icon={<Phone className="h-4 w-4" />} text={d.phone || "—"} label="الهاتف" ltr />
              {showSubscription && (
                <>
                  <Info icon={<CalendarClock className="h-4 w-4" />} text={d.subscription_start ? new Date(d.subscription_start).toLocaleDateString("ar-EG") : "—"} label="بداية الاشتراك" />
                  <Info icon={<CalendarClock className="h-4 w-4" />} text={d.subscription_end ? new Date(d.subscription_end).toLocaleDateString("ar-EG") : "دائم"} label="نهاية الاشتراك" />
                  {d.deactivation_reason && (
                    <div className="md:col-span-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
                      سبب التعطيل: {d.deactivation_reason}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Info({ icon, text, label, ltr }: { icon: React.ReactNode; text: string; label: string; ltr?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span dir={ltr ? "ltr" : undefined} className="font-medium">{text}</span>
    </div>
  );
}

function SubscriptionEditDialog({ doctor, onClose }: { doctor: Profile | null; onClose: () => void }) {
  const [endDate, setEndDate] = useState("");
  const [duration, setDuration] = useState<string>("custom");
  const [isActive, setIsActive] = useState(true);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!doctor) return;
    setEndDate(doctor.subscription_end ? doctor.subscription_end.slice(0, 10) : "");
    setIsActive(doctor.is_active);
    setReason(doctor.deactivation_reason ?? "");
    setDuration("custom");
  }, [doctor]);

  if (!doctor) return null;

  const applyDuration = (d: string) => {
    setDuration(d);
    if (d === "permanent") { setEndDate(""); return; }
    const months = d === "1y" ? 12 : d === "2y" ? 24 : d === "3y" ? 36 : d === "6m" ? 6 : 0;
    if (months > 0) {
      const start = doctor.subscription_start ? new Date(doctor.subscription_start) : new Date();
      const end = new Date(start);
      end.setMonth(end.getMonth() + months);
      setEndDate(end.toISOString().slice(0, 10));
    }
  };

  const save = async () => {
    setSaving(true);
    const update: any = {
      subscription_end: duration === "permanent" ? null : (endDate ? new Date(endDate).toISOString() : null),
      is_active: isActive,
      deactivation_reason: !isActive ? (reason || "تم التعطيل من قبل الإدارة") : null,
    };
    if (!doctor.subscription_start) update.subscription_start = new Date().toISOString();
    const { error } = await supabase.from("profiles").update(update).eq("id", doctor.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("تم تحديث الاشتراك"); onClose(); }
  };

  return (
    <Dialog open={!!doctor} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إدارة اشتراك د. {doctor.full_name}</DialogTitle>
          <DialogDescription>حدد مدة الاشتراك أو فعّل/عطّل الحساب مع ذكر السبب</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-xs">
            <div>تاريخ بداية الاشتراك: <strong>{doctor.subscription_start ? new Date(doctor.subscription_start).toLocaleString("ar-EG") : "لم يبدأ بعد"}</strong></div>
          </div>

          <div>
            <Label>مدة الاشتراك</Label>
            <Select value={duration} onValueChange={applyDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="6m">6 أشهر</SelectItem>
                <SelectItem value="1y">سنة واحدة</SelectItem>
                <SelectItem value="2y">سنتان</SelectItem>
                <SelectItem value="3y">3 سنوات</SelectItem>
                <SelectItem value="permanent">اشتراك دائم</SelectItem>
                <SelectItem value="custom">تاريخ مخصص</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {duration !== "permanent" && (
            <div>
              <Label>تاريخ انتهاء الاشتراك</Label>
              <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setDuration("custom"); }} dir="ltr" />
            </div>
          )}

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>حالة الحساب</Label>
              <p className="text-xs text-muted-foreground">عند التعطيل يصبح الحساب للقراءة فقط</p>
            </div>
            <Button
              variant={isActive ? "default" : "destructive"}
              size="sm"
              onClick={() => setIsActive(!isActive)}
            >
              <Power className="ml-1 h-4 w-4" />
              {isActive ? "نشط" : "موقوف"}
            </Button>
          </div>

          {!isActive && (
            <div>
              <Label>سبب التعطيل</Label>
              <Textarea
                value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: عدم دفع المستحقات، انتهاء الاشتراك، قرار إداري..."
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} disabled={saving}>
            <Save className="ml-1 h-4 w-4" />حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminGeneralSettings() {
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("admin_settings").select("whatsapp_number").eq("id", 1).maybeSingle().then(({ data }) => {
      setWhatsapp(data?.whatsapp_number ?? "");
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("admin_settings").update({ whatsapp_number: whatsapp, updated_at: new Date().toISOString() }).eq("id", 1);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("تم الحفظ ويظهر للأطباء فوراً");
  };

  if (loading) return <p>...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" />رقم واتساب الإدارة</CardTitle>
        <CardDescription>يظهر للأطباء داخل صفحة الإعدادات للتواصل مع الإدارة</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>الرقم (مع رمز الدولة، مثال: +9647717119882)</Label>
          <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} dir="ltr" placeholder="+9647717119882" />
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="ml-1 h-4 w-4" />حفظ
        </Button>
      </CardContent>
    </Card>
  );
}

interface LoginLog { id: string; user_id: string; email: string | null; user_agent: string | null; device_label: string | null; created_at: string; }

function LoginLogsPanel() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("login_logs").select("*").order("created_at", { ascending: false }).limit(200);
      setLogs((data as LoginLog[]) ?? []);
      setLoading(false);
    };
    load();
    const ch = supabase.channel("admin-login-logs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "login_logs" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (loading) return <p>...</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />سجل آخر 200 عملية دخول</CardTitle>
        <CardDescription>كل تسجيل دخول جديد يظهر هنا فوراً</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
        {logs.length === 0 && <p className="text-sm text-muted-foreground">لا توجد سجلات بعد</p>}
        {logs.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-xs">
            <div>
              <div className="font-medium" dir="ltr">{l.email ?? l.user_id}</div>
              <div className="text-muted-foreground">{l.device_label ?? "جهاز غير معروف"}</div>
            </div>
            <div className="text-left text-muted-foreground" dir="ltr">
              {new Date(l.created_at).toLocaleString("ar-EG")}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Loader2, Save, Copy, Upload, Trash2, MessageCircle, CalendarClock,
  Building2, Palette, Eye, BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PrescriptionPreview } from "@/components/PrescriptionPreview";

export const Route = createFileRoute("/doctor/settings")({
  component: () => <RequireAuth allow={["doctor"]}><Settings /></RequireAuth>,
});

interface Form {
  doctor_name: string; specialty: string; clinic_name: string;
  clinic_address: string; clinic_phone: string; working_hours: string;
  logo_url: string | null; rx_prefix: string;
  theme_header: string; theme_accent: string; theme_bg: string; theme_text: string;
  font_size: number; qr_size: number; footer_note: string;
}

const DEFAULT_FORM: Form = {
  doctor_name: "", specialty: "", clinic_name: "", clinic_address: "",
  clinic_phone: "", working_hours: "", logo_url: null, rx_prefix: "Rx",
  theme_header: "#0ea5e9", theme_accent: "#0369a1",
  theme_bg: "#ffffff", theme_text: "#0f172a",
  font_size: 16, qr_size: 84, footer_note: "",
};


const PRESETS = [
  { name: "أزرق طبي", header: "#0ea5e9", accent: "#0369a1", bg: "#ffffff", text: "#0f172a" },
  { name: "أخضر هادئ", header: "#10b981", accent: "#047857", bg: "#ffffff", text: "#064e3b" },
  { name: "أرجواني فاخر", header: "#8b5cf6", accent: "#6d28d9", bg: "#fdfcff", text: "#2e1065" },
  { name: "أحمر دافئ", header: "#ef4444", accent: "#b91c1c", bg: "#fffafa", text: "#450a0a" },
  { name: "كحلي رسمي", header: "#1e3a8a", accent: "#1e40af", bg: "#ffffff", text: "#0f172a" },
  { name: "ذهبي راقٍ", header: "#b45309", accent: "#78350f", bg: "#fffdf5", text: "#1c1917" },
];

function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>(DEFAULT_FORM);

  useEffect(() => {
    if (!user) return;
    supabase.from("doctor_settings").select("*").eq("doctor_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setForm({ ...DEFAULT_FORM, ...(data as any) });
      setLoading(false);
    });
  }, [user]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("doctor_settings").upsert({ doctor_id: user.id, ...form });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("تم حفظ الإعدادات");
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">إعدادات الطبيب</h1>
            <p className="text-sm text-muted-foreground">قم بتخصيص هويتك المهنية وتصميم الوصفة الطبية</p>
          </div>
          <Button onClick={save} disabled={saving} size="lg">
            {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}حفظ
          </Button>
        </div>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="mb-6 flex w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
            <TabsTrigger value="account"><BadgeCheck className="ml-1 h-4 w-4" />الحساب والاشتراك</TabsTrigger>
            <TabsTrigger value="clinic"><Building2 className="ml-1 h-4 w-4" />معلومات العيادة</TabsTrigger>
            <TabsTrigger value="prescription"><Palette className="ml-1 h-4 w-4" />تخصيص الوصفة</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6 animate-in fade-in-50">
            <DoctorIdCard userId={user?.id ?? ""} />
            <SubscriptionCard />
            <AdminContactCard />
          </TabsContent>

          <TabsContent value="clinic" className="space-y-6 animate-in fade-in-50">
            <Card>
              <CardHeader><CardTitle>المعلومات الأساسية</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Field label="اسم الطبيب" value={form.doctor_name} onChange={(v) => set("doctor_name", v)} />
                <Field label="الاختصاص" value={form.specialty} onChange={(v) => set("specialty", v)} />
                <Field label="اسم العيادة" value={form.clinic_name} onChange={(v) => set("clinic_name", v)} />
                <Field label="رقم هاتف العيادة" value={form.clinic_phone} onChange={(v) => set("clinic_phone", v)} ltr />
                <div className="md:col-span-2"><Label>عنوان العيادة</Label><Textarea value={form.clinic_address} onChange={(e) => set("clinic_address", e.target.value)} /></div>
                <div className="md:col-span-2"><Label>أوقات الدوام</Label><Textarea value={form.working_hours} onChange={(e) => set("working_hours", e.target.value)} placeholder="مثال: السبت - الخميس، 9 ص - 5 م" /></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescription" className="animate-in fade-in-50">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="space-y-6">
                <LogoCard form={form} setForm={setForm} userId={user?.id ?? ""} />

                <Card>
                  <CardHeader><CardTitle>تخصيص التصميم</CardTitle></CardHeader>
                  <CardContent className="space-y-5">
                    <div>
                      <Label>بادئة الوصفة (Rx)</Label>
                      <Input value={form.rx_prefix} onChange={(e) => set("rx_prefix", e.target.value)} dir="ltr" placeholder="Rx" className="font-mono" />
                      <p className="mt-2 text-[11px] text-muted-foreground">الطباعة تتم على ورقة A4 افتراضياً. يمكنك تغيير حجم الورق من إعدادات الطابعة عند الطباعة.</p>
                    </div>


                    <div>
                      <Label className="mb-2 block">قوالب جاهزة</Label>
                      <div className="grid gap-2 grid-cols-3 md:grid-cols-6">
                        {PRESETS.map((p) => (
                          <button key={p.name} type="button" onClick={() => setForm((f) => ({ ...f, theme_header: p.header, theme_accent: p.accent, theme_bg: p.bg, theme_text: p.text }))}
                            className="rounded-md border p-2 text-xs transition hover:scale-105" style={{ background: p.bg, color: p.text }}>
                            <div className="mb-1 h-6 rounded" style={{ background: `linear-gradient(135deg, ${p.header}, ${p.accent})` }} />
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <ColorField label="لون الترويسة" value={form.theme_header} onChange={(v) => set("theme_header", v)} />
                      <ColorField label="لون التدرّج" value={form.theme_accent} onChange={(v) => set("theme_accent", v)} />
                      <ColorField label="لون الخلفية" value={form.theme_bg} onChange={(v) => set("theme_bg", v)} />
                      <ColorField label="لون النص" value={form.theme_text} onChange={(v) => set("theme_text", v)} />
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between"><Label>حجم خط الوصفة</Label><span className="text-xs text-muted-foreground">{form.font_size}px</span></div>
                      <Slider value={[form.font_size]} min={12} max={24} step={1} onValueChange={(v) => set("font_size", v[0])} />
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between"><Label>حجم رمز QR</Label><span className="text-xs text-muted-foreground">{form.qr_size}px</span></div>
                      <Slider value={[form.qr_size]} min={60} max={140} step={4} onValueChange={(v) => set("qr_size", v[0])} />
                    </div>

                    <div>
                      <Label>ملاحظة أسفل الوصفة</Label>
                      <Textarea value={form.footer_note} onChange={(e) => set("footer_note", e.target.value)} placeholder="مثال: شفاكم الله — للحجز اتصلوا على الرقم أعلاه" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:sticky lg:top-20 lg:self-start">
                <Card className="overflow-hidden">
                  <CardHeader className="flex flex-row items-center gap-2 bg-muted/30">
                    <Eye className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">معاينة مباشرة</CardTitle>
                    <span className="ms-auto text-xs text-muted-foreground">مطابقة للطباعة و PDF</span>
                  </CardHeader>
                  <CardContent className="p-4 bg-muted/20">
                    <PrescriptionPreview settings={form} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function DoctorIdCard({ userId }: { userId: string }) {
  const [code, setCode] = useState<string>("");
  useEffect(() => {
    if (!userId) return;
    supabase.from("profiles").select("short_code").eq("id", userId).maybeSingle().then(({ data }) => {
      setCode((data as any)?.short_code ?? "");
    });
  }, [userId]);
  const copy = () => { if (code) { navigator.clipboard.writeText(code); toast.success("تم نسخ المعرف"); } };
  return (
    <Card>
      <CardHeader><CardTitle>معرف الطبيب (لمشاركته مع السكرتير)</CardTitle></CardHeader>
      <CardContent className="flex items-center gap-2">
        <Input value={code} readOnly dir="ltr" className="font-mono text-lg tracking-widest text-center" placeholder="..." />
        <Button variant="outline" onClick={copy}><Copy className="h-4 w-4" /></Button>
      </CardContent>
    </Card>
  );
}

function LogoCard({ form, setForm, userId }: { form: Form; setForm: (f: Form | ((p: Form) => Form)) => void; userId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!["image/png", "image/svg+xml"].includes(file.type)) { toast.error("PNG أو SVG فقط (شفاف)"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("الحد الأقصى 2 ميجابايت"); return; }
    setUploading(true);
    const ext = file.type === "image/svg+xml" ? "svg" : "png";
    const path = `${userId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("logos").getPublicUrl(path);
    setForm((f) => ({ ...f, logo_url: data.publicUrl }));
    await supabase.from("doctor_settings").upsert({ doctor_id: userId, ...form, logo_url: data.publicUrl });
    setUploading(false);
    toast.success("تم رفع الشعار");
  };

  const removeLogo = async () => {
    setForm((f) => ({ ...f, logo_url: null }));
    await supabase.from("doctor_settings").upsert({ doctor_id: userId, ...form, logo_url: null });
    toast.success("تمت إزالة الشعار");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>شعار العيادة (شفاف)</CardTitle>
        <p className="text-xs text-muted-foreground">PNG أو SVG شفاف الخلفية ليندمج في تصميم الوصفة</p>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg" style={{
          backgroundImage: "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%, transparent 75%, hsl(var(--muted)) 75%)",
          backgroundSize: "12px 12px", backgroundPosition: "0 0, 6px 6px",
        }}>
          {form.logo_url ? <img src={form.logo_url} alt="logo" className="h-full w-full object-contain p-2" /> : <span className="text-xs text-muted-foreground">لا يوجد</span>}
        </div>
        <div className="flex flex-col gap-2">
          <input ref={fileRef} type="file" accept="image/png,image/svg+xml" hidden onChange={onUpload} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Upload className="ml-1 h-4 w-4" />}رفع شعار
          </Button>
          {form.logo_url && <Button variant="ghost" onClick={removeLogo}><Trash2 className="ml-1 h-4 w-4" />إزالة</Button>}
          <p className="text-xs text-muted-foreground">PNG/SVG شفاف، حتى 2MB</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, ltr }: { label: string; value: string; onChange: (v: string) => void; ltr?: boolean }) {
  return <div><Label>{label}</Label><Input value={value} onChange={(e) => onChange(e.target.value)} dir={ltr ? "ltr" : undefined} /></div>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-14 cursor-pointer rounded border" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" className="font-mono text-xs" />
      </div>
    </div>
  );
}

function AdminContactCard() {
  const [whatsapp, setWhatsapp] = useState<string>("");
  useEffect(() => {
    supabase.from("admin_settings").select("whatsapp_number").eq("id", 1).maybeSingle().then(({ data }) => {
      if (data?.whatsapp_number) setWhatsapp(data.whatsapp_number);
    });
    const ch = supabase.channel("admin-settings-doctor")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "admin_settings" }, (payload) => {
        const w = (payload.new as any)?.whatsapp_number; if (w) setWhatsapp(w);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  if (!whatsapp) return null;
  const cleaned = whatsapp.replace(/[^\d+]/g, "").replace(/^\+?00/, "+").replace(/^\+/, "");
  const link = `https://wa.me/${cleaned}?text=${encodeURIComponent("السلام عليكم، أرغب بالتواصل بخصوص اشتراكي")}`;
  return (
    <Card className="border-success/30 bg-success/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-success"><MessageCircle className="h-5 w-5" />تواصل مع إدارة النظام</CardTitle>
        <p className="text-xs text-muted-foreground">للاستفسار عن الاشتراك أو التجديد</p>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">واتساب الإدارة</div>
          <div className="font-mono text-base font-semibold" dir="ltr">{whatsapp}</div>
        </div>
        <a href={link} target="_blank" rel="noreferrer">
          <Button className="bg-success hover:bg-success/90"><MessageCircle className="ml-1 h-4 w-4" />مراسلة</Button>
        </a>
      </CardContent>
    </Card>
  );
}

function SubscriptionCard() {
  const { user } = useAuth();
  const [info, setInfo] = useState<{ start: string | null; end: string | null; active: boolean; reason: string | null } | null>(null);
  useEffect(() => {
    if (!user) return;
    const load = () => supabase.from("profiles").select("subscription_start,subscription_end,is_active,deactivation_reason").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setInfo({ start: data.subscription_start, end: data.subscription_end, active: data.is_active, reason: data.deactivation_reason });
    });
    load();
    const ch = supabase.channel(`subs-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);
  if (!info) return null;
  const expired = info.end && new Date(info.end) < new Date();
  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString("ar-EG") : "—";
  const daysLeft = info.end ? Math.max(0, Math.ceil((new Date(info.end).getTime() - Date.now()) / 86400000)) : null;
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" />حالة الاشتراك</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-4 text-sm">
        <Stat label="بداية الاشتراك" value={fmt(info.start)} />
        <Stat label="نهاية الاشتراك" value={info.end ? fmt(info.end) : "اشتراك دائم"} />
        <Stat label="الأيام المتبقية" value={daysLeft != null ? `${daysLeft} يوم` : "—"} highlight={daysLeft != null && daysLeft < 14 ? "warn" : undefined} />
        <Stat label="الحالة" value={!info.active ? "موقوف" : expired ? "منتهي" : "نشط"} highlight={!info.active || expired ? "danger" : "success"} />
        {(!info.active || expired) && info.reason && (
          <div className="md:col-span-4 rounded-md bg-destructive/10 p-3 text-xs text-destructive"><strong>السبب:</strong> {info.reason}</div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: "warn" | "danger" | "success" }) {
  const cls = highlight === "danger" ? "text-destructive" : highlight === "warn" ? "text-warning" : highlight === "success" ? "text-success" : "";
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-semibold ${cls}`}>{value}</div>
    </div>
  );
}

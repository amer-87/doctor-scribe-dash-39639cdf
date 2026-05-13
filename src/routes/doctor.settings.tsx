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
import { Loader2, Save, Copy, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/doctor/settings")({
  component: () => <RequireAuth allow={["doctor"]}><Settings /></RequireAuth>,
});

interface Form {
  doctor_name: string; specialty: string; clinic_name: string;
  clinic_address: string; clinic_phone: string; working_hours: string;
  logo_url: string | null; rx_prefix: string;
  theme_header: string; theme_accent: string; theme_bg: string; theme_text: string;
}

const DEFAULT_FORM: Form = {
  doctor_name: "", specialty: "", clinic_name: "", clinic_address: "",
  clinic_phone: "", working_hours: "", logo_url: null, rx_prefix: "Rx",
  theme_header: "#0ea5e9", theme_accent: "#0369a1",
  theme_bg: "#ffffff", theme_text: "#0f172a",
};

const PRESETS: Array<{ name: string; header: string; accent: string; bg: string; text: string }> = [
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
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const copyId = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.id);
    toast.success("تم نسخ المعرف");
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const allowed = ["image/png", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      toast.error("يُسمح فقط بصيغ PNG أو SVG (تدعمان الشفافية)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) { toast.error("الحد الأقصى 2 ميجابايت"); return; }
    setUploading(true);
    const ext = file.type === "image/svg+xml" ? "svg" : "png";
    const path = `${user.id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("logos").upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data } = supabase.storage.from("logos").getPublicUrl(path);
    set("logo_url", data.publicUrl);
    await supabase.from("doctor_settings").upsert({ doctor_id: user.id, ...form, logo_url: data.publicUrl });
    setUploading(false);
    toast.success("تم رفع الشعار");
  };

  const removeLogo = async () => {
    if (!user) return;
    set("logo_url", null);
    await supabase.from("doctor_settings").upsert({ doctor_id: user.id, ...form, logo_url: null });
    toast.success("تمت إزالة الشعار");
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-4xl p-4 md:p-8 space-y-6">
        <h1 className="text-2xl font-bold">إعدادات الطبيب والعيادة</h1>

        <Card>
          <CardHeader><CardTitle>معرف الطبيب (لمشاركته مع السكرتير)</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2">
            <Input value={user?.id ?? ""} readOnly dir="ltr" className="font-mono text-xs" />
            <Button variant="outline" onClick={copyId}><Copy className="h-4 w-4" /></Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>المعلومات الأساسية</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="اسم الطبيب" value={form.doctor_name} onChange={(v) => set("doctor_name", v)} />
            <Field label="الاختصاص" value={form.specialty} onChange={(v) => set("specialty", v)} />
            <Field label="اسم العيادة" value={form.clinic_name} onChange={(v) => set("clinic_name", v)} />
            <Field label="رقم هاتف العيادة" value={form.clinic_phone} onChange={(v) => set("clinic_phone", v)} ltr />
            <div className="md:col-span-2"><Label>عنوان العيادة</Label><Textarea value={form.clinic_address} onChange={(e) => set("clinic_address", e.target.value)} /></div>
            <div className="md:col-span-2"><Label>أوقات الدوام</Label><Textarea value={form.working_hours} onChange={(e) => set("working_hours", e.target.value)} placeholder="مثال: السبت - الخميس، 9 صباحاً - 5 مساءً" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>شعار العيادة (شفاف)</CardTitle>
            <p className="text-xs text-muted-foreground">يُرجى رفع شعار بصيغة PNG أو SVG شفافة الخلفية ليندمج بشكل احترافي مع الوصفة</p>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <div
              className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg"
              style={{
                backgroundImage:
                  "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%, transparent 75%, hsl(var(--muted)) 75%)",
                backgroundSize: "12px 12px",
                backgroundPosition: "0 0, 6px 6px",
              }}
              title="معاينة على خلفية شفافة"
            >
              {form.logo_url ? <img src={form.logo_url} alt="logo" className="h-full w-full object-contain p-2" /> : <span className="text-xs text-muted-foreground">لا يوجد</span>}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/png,image/svg+xml" hidden onChange={onUpload} />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Upload className="ml-1 h-4 w-4" />}
                رفع شعار شفاف (PNG / SVG)
              </Button>
              {form.logo_url && (
                <Button variant="ghost" onClick={removeLogo}><Trash2 className="ml-1 h-4 w-4" />إزالة</Button>
              )}
              <p className="text-xs text-muted-foreground">PNG أو SVG شفاف فقط، حتى 2MB</p>
            </div>
          </CardContent>
        </Card>

        <AdminContactCard />

        <SubscriptionCard />


        <Card>
          <CardHeader><CardTitle>تخصيص الوصفة الطبية</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label>بادئة الوصفة (تظهر في أعلى مربع الأدوية)</Label>
              <Input value={form.rx_prefix} onChange={(e) => set("rx_prefix", e.target.value)} dir="ltr" placeholder="Rx" className="font-mono" />
            </div>

            <div>
              <Label className="mb-2 block">قوالب جاهزة</Label>
              <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-6">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, theme_header: p.header, theme_accent: p.accent, theme_bg: p.bg, theme_text: p.text }))}
                    className="rounded-md border p-2 text-xs transition hover:scale-105"
                    style={{ background: p.bg, color: p.text }}
                  >
                    <div className="mb-1 h-6 rounded" style={{ background: `linear-gradient(135deg, ${p.header}, ${p.accent})` }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <ColorField label="لون الترويسة" value={form.theme_header} onChange={(v) => set("theme_header", v)} />
              <ColorField label="لون التدرّج" value={form.theme_accent} onChange={(v) => set("theme_accent", v)} />
              <ColorField label="لون الخلفية" value={form.theme_bg} onChange={(v) => set("theme_bg", v)} />
              <ColorField label="لون النص" value={form.theme_text} onChange={(v) => set("theme_text", v)} />
            </div>

            <div>
              <Label className="mb-2 block">معاينة</Label>
              <div className="rounded-lg border overflow-hidden" style={{ background: form.theme_bg, color: form.theme_text }}>
                <div className="flex items-center gap-3 p-4" style={{ background: `linear-gradient(135deg, ${form.theme_header}, ${form.theme_accent})`, color: "#fff" }}>
                  {form.logo_url && <img src={form.logo_url} alt="" className="h-10 w-10 rounded bg-white/90 object-contain p-1" />}
                  <div>
                    <div className="font-bold">د. {form.doctor_name || "—"}</div>
                    <div className="text-xs opacity-90">{form.specialty || "—"}</div>
                  </div>
                </div>
                <div className="p-4 font-mono text-sm" dir="ltr">
                  <div className="font-bold" style={{ color: form.theme_accent }}>{form.rx_prefix}</div>
                  <div className="opacity-60">— Sample medication —</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={save} disabled={saving} className="w-full" size="lg">
          {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
          حفظ جميع الإعدادات
        </Button>
      </main>
    </div>
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

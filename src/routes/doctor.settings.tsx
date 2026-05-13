import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/doctor/settings")({
  component: () => <RequireAuth allow={["doctor"]}><Settings /></RequireAuth>,
});

function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    doctor_name: "", specialty: "", clinic_name: "", clinic_address: "", clinic_phone: "", working_hours: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("doctor_settings").select("*").eq("doctor_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setForm({
        doctor_name: data.doctor_name, specialty: data.specialty, clinic_name: data.clinic_name,
        clinic_address: data.clinic_address, clinic_phone: data.clinic_phone, working_hours: data.working_hours,
      });
      setLoading(false);
    });
  }, [user]);

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

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-3xl p-4 md:p-8">
        <h1 className="mb-6 text-2xl font-bold">إعدادات الطبيب والعيادة</h1>

        <Card className="mb-6">
          <CardHeader><CardTitle>معرف الطبيب (لمشاركته مع السكرتير)</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2">
            <Input value={user?.id ?? ""} readOnly dir="ltr" className="font-mono text-xs" />
            <Button variant="outline" onClick={copyId}><Copy className="h-4 w-4" /></Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>المعلومات</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="اسم الطبيب" value={form.doctor_name} onChange={(v) => setForm({ ...form, doctor_name: v })} />
            <Field label="الاختصاص" value={form.specialty} onChange={(v) => setForm({ ...form, specialty: v })} />
            <Field label="اسم العيادة" value={form.clinic_name} onChange={(v) => setForm({ ...form, clinic_name: v })} />
            <Field label="رقم هاتف العيادة" value={form.clinic_phone} onChange={(v) => setForm({ ...form, clinic_phone: v })} ltr />
            <div className="md:col-span-2"><Label>عنوان العيادة</Label><Textarea value={form.clinic_address} onChange={(e) => setForm({ ...form, clinic_address: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>أوقات الدوام</Label><Textarea value={form.working_hours} onChange={(e) => setForm({ ...form, working_hours: e.target.value })} placeholder="مثال: السبت - الخميس، 9 صباحاً - 5 مساءً" /></div>
            <div className="md:col-span-2"><Button onClick={save} disabled={saving} className="w-full">{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}حفظ الإعدادات</Button></div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, ltr }: { label: string; value: string; onChange: (v: string) => void; ltr?: boolean }) {
  return <div><Label>{label}</Label><Input value={value} onChange={(e) => onChange(e.target.value)} dir={ltr ? "ltr" : undefined} /></div>;
}

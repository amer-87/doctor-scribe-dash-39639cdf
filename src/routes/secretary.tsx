import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/secretary")({
  component: () => <RequireAuth allow={["secretary"]}><SecretaryPage /></RequireAuth>,
});

function SecretaryPage() {
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [count, setCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    full_name: "", age: "", gender: "", phone: "", chronic_diseases: "", notes: "",
    appointment_date: todayStr, appointment_time: "",
  });

  const doctorId = profile?.doctor_id;

  const loadCount = async () => {
    if (!doctorId) return;
    const today = new Date().toISOString().slice(0, 10);
    const { count: c } = await supabase.from("patients").select("*", { count: "exact", head: true })
      .eq("doctor_id", doctorId).eq("appointment_date", today);
    setCount(c ?? 0);
  };

  useEffect(() => {
    loadCount();
    if (!doctorId) return;
    const ch = supabase.channel("sec-patients")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients", filter: `doctor_id=eq.${doctorId}` }, loadCount)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [doctorId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId || !user) { toast.error("لا يوجد طبيب مرتبط"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("patients").insert({
      doctor_id: doctorId, added_by: user.id,
      full_name: form.full_name,
      age: form.age ? +form.age : null,
      gender: form.gender || null,
      phone: form.phone || null,
      chronic_diseases: form.chronic_diseases || null,
      notes: form.notes || null,
      appointment_date: form.appointment_date || todayStr,
      appointment_time: form.appointment_time || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("تم إضافة الموعد — يظهر فوراً عند الطبيب");
      setForm({ full_name: "", age: "", gender: "", phone: "", chronic_diseases: "", notes: "", appointment_date: todayStr, appointment_time: "" });
    }
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  const dayStr = now.toLocaleDateString("ar-EG", { weekday: "long" });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-3xl p-4 md:p-8">
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <Card><CardContent className="flex items-center gap-3 p-4"><Calendar className="h-5 w-5 text-primary" /><div><div className="text-xs text-muted-foreground">التاريخ</div><div className="font-semibold">{dateStr}</div></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><Calendar className="h-5 w-5 text-primary" /><div><div className="text-xs text-muted-foreground">اليوم</div><div className="font-semibold">{dayStr}</div></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4"><Users className="h-5 w-5 text-primary" /><div><div className="text-xs text-muted-foreground">مراجعو اليوم</div><div className="text-2xl font-bold">{count}</div></div></CardContent></Card>
        </div>

        <Card className="shadow-elegant">
          <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />حجز موعد / إضافة مراجع</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2"><Label>الاسم الكامل *</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div>
                <Label>تاريخ الموعد *</Label>
                <Input type="date" required value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} />
                <div className="mt-1 flex flex-wrap gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, appointment_date: todayStr })}>اليوم</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); setForm({ ...form, appointment_date: d.toISOString().slice(0,10) }); }}>غداً</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 2); setForm({ ...form, appointment_date: d.toISOString().slice(0,10) }); }}>بعد يومين</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 7); setForm({ ...form, appointment_date: d.toISOString().slice(0,10) }); }}>الأسبوع القادم</Button>
                </div>
              </div>
              <div><Label>وقت الموعد (اختياري)</Label><Input type="time" value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} /></div>
              <div><Label>العمر</Label><Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></div>
              <div><Label>الجنس</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent><SelectItem value="ذكر">ذكر</SelectItem><SelectItem value="أنثى">أنثى</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2"><Label>رقم الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" /></div>
              <div className="md:col-span-2"><Label>الأمراض المزمنة</Label><Textarea rows={2} value={form.chronic_diseases} onChange={(e) => setForm({ ...form, chronic_diseases: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>الملاحظات</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="md:col-span-2"><Button type="submit" disabled={submitting} className="w-full">{submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}إضافة المراجع</Button></div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

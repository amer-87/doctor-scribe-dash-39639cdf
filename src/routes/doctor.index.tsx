import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Users, FileText, Phone, UserCheck, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/doctor/")({
  component: () => <RequireAuth allow={["doctor"]}><DoctorDashboard /></RequireAuth>,
});

interface Patient {
  id: string; full_name: string; age: number | null; gender: string | null;
  phone: string | null; chronic_diseases: string | null; notes: string | null; created_at: string;
}

interface Secretary { id: string; full_name: string; email: string; status: string; }

function DoctorDashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Patient | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("patients").select("*").eq("doctor_id", user.id).order("created_at", { ascending: false });
    setPatients((data as Patient[]) ?? []);
    const { data: secs } = await supabase.from("profiles").select("id,full_name,email,status").eq("doctor_id", user.id);
    setSecretaries((secs as Secretary[]) ?? []);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase.channel("doctor-patients")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients", filter: `doctor_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `doctor_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    const q = search.toLowerCase();
    return patients.filter((p) =>
      p.full_name.toLowerCase().includes(q) || (p.phone ?? "").includes(q) || (p.chronic_diseases ?? "").toLowerCase().includes(q)
    );
  }, [patients, search]);

  const pendingSecs = secretaries.filter((s) => s.status === "pending");

  const setSecStatus = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(status === "approved" ? "تمت الموافقة على السكرتير" : "تم رفض السكرتير");
  };

  const deletePatient = async (id: string) => {
    if (!confirm("حذف هذا المراجع؟")) return;
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("تم الحذف");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">لوحة الطبيب</h1>
            <p className="text-sm text-muted-foreground">إدارة المراجعين والوصفات الطبية</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 shadow-sm border">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm">إجمالي المراجعين:</span>
            <span className="text-lg font-bold">{patients.length}</span>
          </div>
        </div>

        {pendingSecs.length > 0 && (
          <Card className="mb-6 border-warning/40 bg-warning/5">
            <CardHeader><CardTitle className="text-base">طلبات السكرتارية ({pendingSecs.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {pendingSecs.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background p-3 border">
                  <div>
                    <div className="font-medium">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">{s.email}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setSecStatus(s.id, "approved")}><UserCheck className="ml-1 h-4 w-4" />موافقة</Button>
                    <Button size="sm" variant="destructive" onClick={() => setSecStatus(s.id, "rejected")}>رفض</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="mb-4 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم، الهاتف، أو الأمراض..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} className="group transition-all hover:shadow-elegant">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Link to="/doctor/patient/$id" params={{ id: p.id }} className="flex-1">
                    <CardTitle className="text-lg hover:text-primary transition-colors">{p.full_name}</CardTitle>
                  </Link>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deletePatient(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  {p.age != null && <Badge variant="secondary">العمر: {p.age}</Badge>}
                  {p.gender && <Badge variant="secondary">{p.gender}</Badge>}
                </div>
                {p.phone && <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" /><span dir="ltr">{p.phone}</span></div>}
                {p.chronic_diseases && <div className="text-muted-foreground"><span className="font-medium">الأمراض:</span> {p.chronic_diseases}</div>}
                <Link to="/doctor/patient/$id" params={{ id: p.id }}>
                  <Button variant="outline" size="sm" className="w-full mt-2"><FileText className="ml-1 h-4 w-4" />الوصفة الطبية</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              {patients.length === 0 ? "لا يوجد مراجعون بعد. سيظهرون هنا فور إضافتهم من قبل السكرتير." : "لا توجد نتائج للبحث"}
            </div>
          )}
        </div>

        <PatientEditDialog patient={editing} onClose={() => setEditing(null)} />
      </main>
    </div>
  );
}

function PatientEditDialog({ patient, onClose }: { patient: Patient | null; onClose: () => void }) {
  const [form, setForm] = useState<Patient | null>(patient);
  useEffect(() => setForm(patient), [patient]);
  if (!form) return null;

  const save = async () => {
    const { error } = await supabase.from("patients").update({
      full_name: form.full_name, age: form.age, gender: form.gender, phone: form.phone,
      chronic_diseases: form.chronic_diseases, notes: form.notes,
    }).eq("id", form.id);
    if (error) toast.error(error.message);
    else { toast.success("تم التحديث"); onClose(); }
  };

  return (
    <Dialog open={!!patient} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>تعديل المراجع</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>الاسم</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>العمر</Label><Input type="number" value={form.age ?? ""} onChange={(e) => setForm({ ...form, age: e.target.value ? +e.target.value : null })} /></div>
            <div><Label>الجنس</Label>
              <Select value={form.gender ?? ""} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent><SelectItem value="ذكر">ذكر</SelectItem><SelectItem value="أنثى">أنثى</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>الهاتف</Label><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" /></div>
          <div><Label>الأمراض المزمنة</Label><Textarea value={form.chronic_diseases ?? ""} onChange={(e) => setForm({ ...form, chronic_diseases: e.target.value })} /></div>
          <div><Label>الملاحظات</Label><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save}>حفظ</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

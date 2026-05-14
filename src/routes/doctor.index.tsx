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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Users, FileText, Phone, UserCheck, Pencil, Trash2, Calendar, Archive, Activity, Eye, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/doctor/")({
  component: () => <RequireAuth allow={["doctor"]}><DoctorDashboard /></RequireAuth>,
});

interface Patient {
  id: string; full_name: string; age: number | null; gender: string | null;
  phone: string | null; chronic_diseases: string | null; notes: string | null; created_at: string;
}
interface PatientWithVisit extends Patient {
  last_visit: string | null;
  visit_count: number;
}
interface Secretary { id: string; full_name: string; email: string; status: string; }

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d = new Date()) { const x = new Date(d); x.setHours(23,59,59,999); return x; }

function DoctorDashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientWithVisit[]>([]);
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [editing, setEditing] = useState<Patient | null>(null);

  const load = async () => {
    if (!user) return;
    const { data: pData } = await supabase.from("patients").select("*").eq("doctor_id", user.id).order("created_at", { ascending: false });
    const { data: presc } = await supabase.from("prescriptions").select("patient_id, created_at").eq("doctor_id", user.id);
    const map = new Map<string, { last: string; count: number }>();
    (presc ?? []).forEach((p: any) => {
      const cur = map.get(p.patient_id);
      if (!cur || new Date(p.created_at) > new Date(cur.last)) {
        map.set(p.patient_id, { last: p.created_at, count: (cur?.count ?? 0) + 1 });
      } else {
        map.set(p.patient_id, { last: cur.last, count: cur.count + 1 });
      }
    });
    setPatients(((pData as Patient[]) ?? []).map((p) => ({
      ...p,
      last_visit: map.get(p.id)?.last ?? p.created_at,
      visit_count: map.get(p.id)?.count ?? 0,
    })));
    const { data: secs } = await supabase.from("profiles").select("id,full_name,email,status").eq("doctor_id", user.id);
    setSecretaries((secs as Secretary[]) ?? []);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase.channel("doctor-patients")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients", filter: `doctor_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "prescriptions", filter: `doctor_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `doctor_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const todayStart = startOfDay().getTime();
  const todayEnd = endOfDay().getTime();
  const todayPatients = patients.filter((p) => {
    const t = new Date(p.last_visit ?? p.created_at).getTime();
    return t >= todayStart && t <= todayEnd;
  });
  const archivePatients = patients.filter((p) => {
    const t = new Date(p.last_visit ?? p.created_at).getTime();
    return t < todayStart;
  });

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
        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <StatCard icon={<Activity className="h-5 w-5" />} label="مراجعو اليوم" value={todayPatients.length} color="text-primary" />
          <StatCard icon={<Users className="h-5 w-5" />} label="إجمالي المراجعين" value={patients.length} color="text-success" />
          <StatCard icon={<Archive className="h-5 w-5" />} label="في الأرشيف" value={archivePatients.length} color="text-muted-foreground" />
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

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="mb-4 grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="today"><Activity className="ml-1 h-4 w-4" />مراجعو اليوم</TabsTrigger>
            <TabsTrigger value="records"><FileText className="ml-1 h-4 w-4" />السجل الطبي</TabsTrigger>
            <TabsTrigger value="archive"><Archive className="ml-1 h-4 w-4" />الأرشيف</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            <PatientCardGrid patients={todayPatients} emptyText="لا يوجد مراجعون اليوم بعد." onEdit={setEditing} onDelete={deletePatient} />
          </TabsContent>

          <TabsContent value="records">
            <RecordsTable patients={patients} onEdit={setEditing} onDelete={deletePatient} />
          </TabsContent>

          <TabsContent value="archive">
            <RecordsTable patients={archivePatients} onEdit={setEditing} onDelete={deletePatient} hideTodayHint />
          </TabsContent>
        </Tabs>

        <PatientEditDialog patient={editing} onClose={() => setEditing(null)} />
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg bg-muted/50 p-3 ${color}`}>{icon}</div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function PatientCardGrid({ patients, emptyText, onEdit, onDelete }: { patients: PatientWithVisit[]; emptyText: string; onEdit: (p: Patient) => void; onDelete: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const filtered = patients.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.full_name.toLowerCase().includes(q) || (p.phone ?? "").includes(q) || (p.chronic_diseases ?? "").toLowerCase().includes(q);
  });
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
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
                  <Button size="icon" variant="ghost" onClick={() => onEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-2">
                {p.age != null && <Badge variant="secondary">العمر: {p.age}</Badge>}
                {p.gender && <Badge variant="secondary">{p.gender}</Badge>}
                {p.visit_count > 0 && <Badge>{p.visit_count} زيارة</Badge>}
              </div>
              {p.phone && <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" /><span dir="ltr">{p.phone}</span></div>}
              {p.chronic_diseases && <div className="text-muted-foreground line-clamp-2"><span className="font-medium">الأمراض:</span> {p.chronic_diseases}</div>}
              <Link to="/doctor/patient/$id" params={{ id: p.id }}>
                <Button variant="outline" size="sm" className="w-full mt-2"><FileText className="ml-1 h-4 w-4" />الوصفة الطبية</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

function RecordsTable({ patients, onEdit, onDelete, hideTodayHint }: { patients: PatientWithVisit[]; onEdit: (p: Patient) => void; onDelete: (id: string) => void; hideTodayHint?: boolean }) {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [period, setPeriod] = useState<"all" | "day" | "month" | "year">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to + "T23:59:59").getTime() : null;
    const now = new Date();
    let pStart: number | null = null;
    if (period === "day") pStart = startOfDay(now).getTime();
    else if (period === "month") { const d = new Date(now); d.setDate(1); d.setHours(0,0,0,0); pStart = d.getTime(); }
    else if (period === "year") { const d = new Date(now.getFullYear(), 0, 1); pStart = d.getTime(); }
    return patients.filter((p) => {
      if (q && !(p.full_name.toLowerCase().includes(q) || (p.phone ?? "").includes(q))) return false;
      const t = new Date(p.last_visit ?? p.created_at).getTime();
      if (fromTs && t < fromTs) return false;
      if (toTs && t > toTs) return false;
      if (pStart && t < pStart) return false;
      return true;
    });
  }, [patients, search, from, to, period]);

  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="grid gap-2 md:grid-cols-5">
          <div className="md:col-span-2 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">من تاريخ</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">إلى تاريخ</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">فترة سريعة</Label>
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="day">اليوم</SelectItem>
                <SelectItem value="month">هذا الشهر</SelectItem>
                <SelectItem value="year">هذه السنة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {!hideTodayHint && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />السجل الطبي يحتوي على جميع المراجعين منذ بداية استخدام النظام
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>العمر/الجنس</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>آخر زيارة</TableHead>
                <TableHead>الزيارات</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-center">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell className="text-xs">{p.age ?? "—"} / {p.gender ?? "—"}</TableCell>
                  <TableCell className="text-xs" dir="ltr">{p.phone ?? "—"}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{fmtDate(p.last_visit)}</TableCell>
                  <TableCell><Badge variant="secondary">{p.visit_count}</Badge></TableCell>
                  <TableCell className="text-xs max-w-[160px] truncate" title={p.chronic_diseases ?? ""}>
                    {p.chronic_diseases ? p.chronic_diseases : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1">
                      <Link to="/doctor/patient/$id" params={{ id: p.id }}>
                        <Button size="icon" variant="ghost" title="عرض الوصفة"><Eye className="h-4 w-4" /></Button>
                      </Link>
                      <Link to="/doctor/patient/$id" params={{ id: p.id }}>
                        <Button size="icon" variant="ghost" title="طباعة"><Printer className="h-4 w-4" /></Button>
                      </Link>
                      <Button size="icon" variant="ghost" onClick={() => onEdit(p)} title="تعديل"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => onDelete(p.id)} title="حذف"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد نتائج</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
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

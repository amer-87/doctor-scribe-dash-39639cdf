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
import { Search, Users, FileText, Phone, UserCheck, Pencil, Trash2, CalendarDays, Archive, Activity, Eye, Printer, Clock, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
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
  appointment_date: string | null; appointment_time: string | null; status: string | null;
}
interface PatientWithVisit extends Patient {
  last_visit: string | null;
  visit_count: number;
}
interface Secretary { id: string; full_name: string; email: string; status: string; }

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "بانتظار", variant: "secondary" },
  done: { label: "تم الفحص", variant: "default" },
  cancelled: { label: "ملغي", variant: "destructive" },
  postponed: { label: "مؤجل", variant: "outline" },
};

function todayISO() { return new Date().toISOString().slice(0, 10); }
function addDaysISO(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

function DoctorDashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<PatientWithVisit[]>([]);
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [editing, setEditing] = useState<Patient | null>(null);

  const load = async () => {
    if (!user) return;
    const { data: pData } = await supabase.from("patients").select("*").eq("doctor_id", user.id).order("appointment_date", { ascending: true }).order("appointment_time", { ascending: true, nullsFirst: false });
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

  const today = todayISO();
  const tomorrow = addDaysISO(1);
  const weekEnd = addDaysISO(7);

  const getDate = (p: Patient) => p.appointment_date ?? p.created_at.slice(0, 10);
  const todayPatients = patients.filter((p) => getDate(p) === today);
  const tomorrowPatients = patients.filter((p) => getDate(p) === tomorrow);
  const weekPatients = patients.filter((p) => { const d = getDate(p); return d >= today && d <= weekEnd; });
  const upcomingPatients = patients.filter((p) => getDate(p) > today);
  const archivePatients = patients.filter((p) => getDate(p) < today);

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
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("patients").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("تم تحديث الحالة");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto p-4 md:p-8">
        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <StatCard icon={<Activity className="h-5 w-5" />} label="مواعيد اليوم" value={todayPatients.length} color="text-primary" />
          <StatCard icon={<Bell className="h-5 w-5" />} label="مواعيد الغد" value={tomorrowPatients.length} color="text-warning" />
          <StatCard icon={<CalendarDays className="h-5 w-5" />} label="هذا الأسبوع" value={weekPatients.length} color="text-success" />
          <StatCard icon={<Users className="h-5 w-5" />} label="إجمالي المراجعين" value={patients.length} color="text-muted-foreground" />
        </div>

        {tomorrowPatients.length > 0 && (
          <Card className="mb-6 border-warning/40 bg-warning/5">
            <CardContent className="flex items-center gap-3 p-4">
              <Bell className="h-5 w-5 text-warning" />
              <div className="text-sm">لديك <strong>{tomorrowPatients.length}</strong> موعد غداً.</div>
            </CardContent>
          </Card>
        )}

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
          <TabsList className="mb-4 flex w-full flex-wrap h-auto">
            <TabsTrigger value="today"><Activity className="ml-1 h-4 w-4" />اليوم</TabsTrigger>
            <TabsTrigger value="tomorrow"><Bell className="ml-1 h-4 w-4" />غداً</TabsTrigger>
            <TabsTrigger value="week"><CalendarDays className="ml-1 h-4 w-4" />هذا الأسبوع</TabsTrigger>
            <TabsTrigger value="upcoming"><Clock className="ml-1 h-4 w-4" />القادمة</TabsTrigger>
            <TabsTrigger value="calendar"><CalendarDays className="ml-1 h-4 w-4" />التقويم</TabsTrigger>
            <TabsTrigger value="records"><FileText className="ml-1 h-4 w-4" />السجل</TabsTrigger>
            <TabsTrigger value="archive"><Archive className="ml-1 h-4 w-4" />الأرشيف</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            <AppointmentList patients={todayPatients} emptyText="لا توجد مواعيد اليوم." onEdit={setEditing} onDelete={deletePatient} onSetStatus={setStatus} />
          </TabsContent>
          <TabsContent value="tomorrow">
            <AppointmentList patients={tomorrowPatients} emptyText="لا توجد مواعيد غداً." onEdit={setEditing} onDelete={deletePatient} onSetStatus={setStatus} />
          </TabsContent>
          <TabsContent value="week">
            <AppointmentList patients={weekPatients} emptyText="لا توجد مواعيد هذا الأسبوع." onEdit={setEditing} onDelete={deletePatient} onSetStatus={setStatus} showDate />
          </TabsContent>
          <TabsContent value="upcoming">
            <AppointmentList patients={upcomingPatients} emptyText="لا توجد مواعيد قادمة." onEdit={setEditing} onDelete={deletePatient} onSetStatus={setStatus} showDate />
          </TabsContent>
          <TabsContent value="calendar">
            <CalendarView patients={patients} onEdit={setEditing} onDelete={deletePatient} onSetStatus={setStatus} />
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

function StatusBadge({ status }: { status: string | null }) {
  const s = STATUS_LABELS[status ?? "pending"] ?? STATUS_LABELS.pending;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function AppointmentList({
  patients, emptyText, onEdit, onDelete, onSetStatus, showDate,
}: {
  patients: PatientWithVisit[]; emptyText: string;
  onEdit: (p: Patient) => void; onDelete: (id: string) => void;
  onSetStatus: (id: string, status: string) => void; showDate?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const filtered = patients.filter((p) => {
    const q = search.trim().toLowerCase();
    if (q && !(p.full_name.toLowerCase().includes(q) || (p.phone ?? "").includes(q))) return false;
    if (statusFilter !== "all" && (p.status ?? "pending") !== statusFilter) return false;
    return true;
  });
  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short" }) : "—";
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 min-w-[200px] items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="pending">بانتظار</SelectItem>
            <SelectItem value="done">تم الفحص</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
            <SelectItem value="postponed">مؤجل</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <Card key={p.id} className="group transition-all hover:shadow-elegant">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <Link to="/doctor/patient/$id" params={{ id: p.id }} className="flex-1 min-w-0">
                  <CardTitle className="text-lg hover:text-primary transition-colors truncate">{p.full_name}</CardTitle>
                </Link>
                <StatusBadge status={p.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {showDate && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDate(p.appointment_date)}</span>}
                {p.appointment_time && <span className="flex items-center gap-1" dir="ltr"><Clock className="h-3 w-3" />{p.appointment_time.slice(0,5)}</span>}
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
              <div className="flex items-center gap-2 pt-2">
                <Select value={p.status ?? "pending"} onValueChange={(v) => onSetStatus(p.id, v)}>
                  <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">بانتظار</SelectItem>
                    <SelectItem value="done">تم الفحص</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                    <SelectItem value="postponed">مؤجل</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" onClick={() => onEdit(p)} title="تعديل"><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(p.id)} title="حذف"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              <Link to="/doctor/patient/$id" params={{ id: p.id }}>
                <Button variant="outline" size="sm" className="w-full"><FileText className="ml-1 h-4 w-4" />الوصفة الطبية</Button>
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

function CalendarView({ patients, onEdit, onDelete, onSetStatus }: {
  patients: PatientWithVisit[];
  onEdit: (p: Patient) => void; onDelete: (id: string) => void;
  onSetStatus: (id: string, status: string) => void;
}) {
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const dates = useMemo(() => new Set(patients.map((p) => p.appointment_date ?? p.created_at.slice(0,10))), [patients]);
  const dayPatients = selected ? patients.filter((p) => (p.appointment_date ?? p.created_at.slice(0,10)) === dayKey(selected)) : [];

  return (
    <div className="grid gap-4 md:grid-cols-[auto_1fr]">
      <Card>
        <CardContent className="p-2">
          <CalendarUI
            mode="single"
            selected={selected}
            onSelect={setSelected}
            className="pointer-events-auto"
            modifiers={{ hasAppt: (d) => dates.has(dayKey(d)) }}
            modifiersClassNames={{ hasAppt: "bg-primary/15 font-semibold text-primary" }}
          />
        </CardContent>
      </Card>
      <div>
        <div className="mb-3 text-sm text-muted-foreground">
          {selected ? selected.toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "اختر تاريخاً"}
          {" — "}{dayPatients.length} موعد
        </div>
        <AppointmentList patients={dayPatients} emptyText="لا توجد مواعيد في هذا اليوم." onEdit={onEdit} onDelete={onDelete} onSetStatus={onSetStatus} />
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
    if (period === "day") { const d = new Date(now); d.setHours(0,0,0,0); pStart = d.getTime(); }
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
            <CalendarDays className="h-3 w-3" />السجل الطبي يحتوي على جميع المراجعين منذ بداية استخدام النظام
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
                  <TableCell><StatusBadge status={p.status} /></TableCell>
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
      appointment_date: form.appointment_date ?? undefined,
      appointment_time: form.appointment_time ?? null,
      status: form.status ?? "pending",
    }).eq("id", form.id);
    if (error) toast.error(error.message);
    else { toast.success("تم التحديث"); onClose(); }
  };

  return (
    <Dialog open={!!patient} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>تعديل الموعد / المراجع</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>الاسم</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>تاريخ الموعد</Label><Input type="date" value={form.appointment_date ?? ""} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} /></div>
            <div><Label>وقت الموعد</Label><Input type="time" value={form.appointment_time ?? ""} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} /></div>
          </div>
          <div><Label>الحالة</Label>
            <Select value={form.status ?? "pending"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">بانتظار</SelectItem>
                <SelectItem value="done">تم الفحص</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
                <SelectItem value="postponed">مؤجل</SelectItem>
              </SelectContent>
            </Select>
          </div>
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

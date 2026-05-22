import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Users, UserPlus, Loader2, Pencil, Trash2, Clock, Phone, Search, CalendarDays, Archive, Activity, Bell, CalendarClock, Send, Camera, X, Paperclip, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/secretary")({
  component: () => <RequireAuth allow={["secretary"]}><SecretaryPage /></RequireAuth>,
});

interface Patient {
  id: string; full_name: string; age: number | null; gender: string | null;
  phone: string | null; chronic_diseases: string | null; notes: string | null;
  created_at: string; appointment_date: string | null;
  appointment_time: string | null; status: string | null;
  sent_at: string | null; attachments: string[] | null;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "بانتظار", cls: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200" },
  done: { label: "تم الفحص", cls: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200" },
  cancelled: { label: "ملغي", cls: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200" },
  postponed: { label: "مؤجل", cls: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200" },
};

function isoOf(d: Date) { return d.toISOString().slice(0, 10); }
function addDaysISO(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return isoOf(d); }

function SecretaryPage() {
  const { user, profile } = useAuth();
  const todayStr = isoOf(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const emptyForm = {
    full_name: "", age: "", gender: "", phone: "", chronic_diseases: "", notes: "",
    appointment_date: todayStr, appointment_time: "",
  };
  const [form, setForm] = useState(emptyForm);

  const doctorId = profile?.doctor_id;

  const load = async () => {
    if (!doctorId) return;
    const { data } = await supabase.from("patients").select("*")
      .eq("doctor_id", doctorId)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true, nullsFirst: false });
    setPatients((data as Patient[]) ?? []);
  };

  useEffect(() => {
    load();
    if (!doctorId) return;
    const ch = supabase.channel("sec-patients-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "patients", filter: `doctor_id=eq.${doctorId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [doctorId]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    setUploading(true);
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      const path = `${user.id}/${Date.now()}-${f.name}`;
      const { error } = await supabase.storage.from("attachments").upload(path, f);
      if (error) { toast.error(error.message); continue; }
      const { data } = supabase.storage.from("attachments").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    setAttachments((a) => [...a, ...urls]);
    setUploading(false);
    if (urls.length) toast.success(`تم رفع ${urls.length} مرفق`);
  };

  const submit = async (e: React.FormEvent, sendNow: boolean) => {
    e.preventDefault();
    if (!doctorId || !user) { toast.error("لا يوجد طبيب مرتبط"); return; }
    setSubmitting(true);

    // Check for existing patient (same doctor + same phone OR same name)
    const phoneNorm = (form.phone || "").replace(/\D/g, "");
    let existing: Patient | null = null;
    if (phoneNorm) {
      const { data } = await supabase.from("patients").select("*")
        .eq("doctor_id", doctorId).eq("phone", phoneNorm).limit(1).maybeSingle();
      existing = (data as Patient | null) ?? null;
    }
    if (!existing && form.full_name.trim()) {
      const { data } = await supabase.from("patients").select("*")
        .eq("doctor_id", doctorId).eq("full_name", form.full_name.trim()).limit(1).maybeSingle();
      existing = (data as Patient | null) ?? null;
    }

    let error: any = null;
    if (existing) {
      const nextCount = ((existing as any).visit_count ?? 1) + 1;
      const { error: upErr } = await supabase.from("patients").update({
        visit_count: nextCount,
        appointment_date: form.appointment_date || todayStr,
        appointment_time: form.appointment_time || null,
        status: "pending",
        sent_at: sendNow ? new Date().toISOString() : null,
        age: form.age ? +form.age : existing.age,
        gender: form.gender || existing.gender,
        chronic_diseases: form.chronic_diseases || existing.chronic_diseases,
        notes: form.notes || existing.notes,
        attachments: attachments.length ? attachments : (existing.attachments ?? []),
      } as any).eq("id", existing.id);
      error = upErr;
      if (!upErr) toast.success(`زيارة جديدة لـ ${existing.full_name} (رقم ${nextCount})`);
    } else {
      const { error: insErr } = await supabase.from("patients").insert({
        doctor_id: doctorId, added_by: user.id,
        full_name: form.full_name.trim(),
        age: form.age ? +form.age : null,
        gender: form.gender || null,
        phone: phoneNorm || null,
        chronic_diseases: form.chronic_diseases || null,
        notes: form.notes || null,
        appointment_date: form.appointment_date || todayStr,
        appointment_time: form.appointment_time || null,
        status: "pending",
        attachments,
        sent_at: sendNow ? new Date().toISOString() : null,
      });
      error = insErr;
      if (!insErr) toast.success(sendNow ? "تم الإرسال للطبيب فوراً" : "تم حفظ الموعد");
    }

    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      setForm(emptyForm);
      setAttachments([]);
      setShowForm(false);
    }
  };

  const deletePatient = async (id: string) => {
    if (!confirm("حذف هذا الموعد؟")) return;
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("تم حذف الموعد");
  };

  const reschedule = async (id: string, days: number) => {
    const p = patients.find((x) => x.id === id);
    const base = p?.appointment_date ? new Date(p.appointment_date) : new Date();
    base.setDate(base.getDate() + days);
    const { error } = await supabase.from("patients").update({ appointment_date: isoOf(base), status: "postponed" }).eq("id", id);
    if (error) toast.error(error.message); else toast.success(`تم تأجيل الموعد ${days} يوم`);
  };

  const sendToDoctor = async (id: string) => {
    const { error } = await supabase.from("patients").update({ sent_at: new Date().toISOString(), status: "pending" }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("تم إرسال المراجع للطبيب");
  };

  const today = todayStr;
  const tomorrow = addDaysISO(1);
  const dayAfter = addDaysISO(2);
  const weekEnd = addDaysISO(7);

  const getDate = (p: Patient) => p.appointment_date ?? p.created_at.slice(0, 10);
  // Sort: pending+unsent first, then sent+pending, then done at bottom
  const queueSort = (a: Patient, b: Patient) => {
    const aDone = (a.status ?? "pending") === "done" ? 2 : 0;
    const bDone = (b.status ?? "pending") === "done" ? 2 : 0;
    if (aDone !== bDone) return aDone - bDone;
    const at = a.appointment_time ?? "99:99";
    const bt = b.appointment_time ?? "99:99";
    return at.localeCompare(bt);
  };
  const todayList = patients.filter((p) => getDate(p) === today).sort(queueSort);
  const tomorrowList = patients.filter((p) => getDate(p) === tomorrow);
  const dayAfterList = patients.filter((p) => getDate(p) === dayAfter);
  const weekList = patients.filter((p) => { const d = getDate(p); return d >= today && d <= weekEnd; });
  const upcomingList = patients.filter((p) => getDate(p) > today);
  const archiveList = patients.filter((p) => getDate(p) < today);

  const now = new Date();
  const dateStr = now.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  const dayStr = now.toLocaleDateString("ar-EG", { weekday: "long" });

  const quickDays: { label: string; days: number }[] = [
    { label: "اليوم", days: 0 },
    { label: "غداً", days: 1 },
    { label: "بعد غد", days: 2 },
    { label: "بعد 3 أيام", days: 3 },
    { label: "الأسبوع القادم", days: 7 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-6xl p-4 md:p-8">
        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <StatCard icon={<Calendar className="h-5 w-5" />} label="التاريخ" value={dateStr} />
          <StatCard icon={<Activity className="h-5 w-5 text-primary" />} label="اليوم" value={dayStr} />
          <StatCard icon={<Users className="h-5 w-5 text-primary" />} label="مواعيد اليوم" value={todayList.length} big />
          <StatCard icon={<Bell className="h-5 w-5 text-warning" />} label="مواعيد الغد" value={tomorrowList.length} big />
        </div>

        <div className="mb-6 flex justify-end">
          <Button onClick={() => setShowForm((s) => !s)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            {showForm ? "إخفاء النموذج" : "إضافة مراجع جديد"}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6 shadow-elegant animate-in fade-in slide-in-from-top-2 duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" />حجز موعد جديد</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => submit(e, false)} className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>الاسم الكامل *</Label>
                  <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>تاريخ الموعد *</Label>
                  <Input type="date" required value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {quickDays.map((q) => {
                      const target = addDaysISO(q.days);
                      const active = form.appointment_date === target;
                      return (
                        <button
                          type="button"
                          key={q.label}
                          onClick={() => setForm({ ...form, appointment_date: target })}
                          className={cn(
                            "rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200",
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                              : "bg-background hover:bg-accent hover:scale-105 border-border",
                          )}
                        >
                          {q.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label>وقت الموعد (اختياري)</Label>
                  <Input type="time" value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} />
                </div>
                <div>
                  <Label>العمر</Label>
                  <Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                </div>
                <div>
                  <Label>الجنس</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ذكر">ذكر</SelectItem>
                      <SelectItem value="أنثى">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>رقم الهاتف</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" />
                </div>
                <div className="md:col-span-2">
                  <Label>الأمراض المزمنة</Label>
                  <Textarea rows={2} value={form.chronic_diseases} onChange={(e) => setForm({ ...form, chronic_diseases: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>الملاحظات</Label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>

                {/* Attachments */}
                <div className="md:col-span-2">
                  <Label className="flex items-center gap-1"><Paperclip className="h-4 w-4" />المرفقات (صور)</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()} disabled={uploading}>
                      <Camera className="ml-1 h-4 w-4" />التقاط بالكاميرا
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      <Paperclip className="ml-1 h-4 w-4" />اختيار صورة
                    </Button>
                    {uploading && <span className="flex items-center text-xs text-muted-foreground"><Loader2 className="ml-1 h-3 w-3 animate-spin" />جاري الرفع...</span>}
                    <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                  </div>
                  {attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {attachments.map((url, i) => (
                        <div key={i} className="relative">
                          <img src={url} alt={`attachment-${i}`} className="h-20 w-20 rounded border object-cover" />
                          <button type="button" onClick={() => setAttachments((a) => a.filter((_, j) => j !== i))} className="absolute -top-2 -left-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 flex gap-2">
                  <Button type="submit" variant="outline" disabled={submitting} className="flex-1">
                    {submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    حفظ الموعد
                  </Button>
                  <Button type="button" onClick={(e) => submit(e as any, true)} disabled={submitting || !form.full_name} className="flex-1 gap-2">
                    <Send className="h-4 w-4" />
                    حفظ وإرسال للطبيب
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="today" className="w-full">
          <TabsList className="mb-4 flex h-auto w-full flex-wrap">
            <TabsTrigger value="today"><Activity className="ml-1 h-4 w-4" />اليوم ({todayList.length})</TabsTrigger>
            <TabsTrigger value="tomorrow"><Bell className="ml-1 h-4 w-4" />غداً ({tomorrowList.length})</TabsTrigger>
            <TabsTrigger value="dayafter"><CalendarClock className="ml-1 h-4 w-4" />بعد غد ({dayAfterList.length})</TabsTrigger>
            <TabsTrigger value="week"><CalendarDays className="ml-1 h-4 w-4" />هذا الأسبوع ({weekList.length})</TabsTrigger>
            <TabsTrigger value="upcoming"><Clock className="ml-1 h-4 w-4" />القادمة ({upcomingList.length})</TabsTrigger>
            <TabsTrigger value="history"><Archive className="ml-1 h-4 w-4" />السجل</TabsTrigger>
          </TabsList>

          <TabsContent value="today"><CardsList list={todayList} onEdit={setEditing} onDelete={deletePatient} onReschedule={reschedule} onSend={sendToDoctor} empty="لا توجد مواعيد اليوم." /></TabsContent>
          <TabsContent value="tomorrow"><CardsList list={tomorrowList} onEdit={setEditing} onDelete={deletePatient} onReschedule={reschedule} onSend={sendToDoctor} empty="لا توجد مواعيد غداً." /></TabsContent>
          <TabsContent value="dayafter"><CardsList list={dayAfterList} onEdit={setEditing} onDelete={deletePatient} onReschedule={reschedule} onSend={sendToDoctor} empty="لا توجد مواعيد بعد غد." /></TabsContent>
          <TabsContent value="week"><CardsList list={weekList} onEdit={setEditing} onDelete={deletePatient} onReschedule={reschedule} onSend={sendToDoctor} empty="لا توجد مواعيد هذا الأسبوع." showDate /></TabsContent>
          <TabsContent value="upcoming"><CardsList list={upcomingList} onEdit={setEditing} onDelete={deletePatient} onReschedule={reschedule} onSend={sendToDoctor} empty="لا توجد مواعيد قادمة." showDate /></TabsContent>
          <TabsContent value="history"><HistoryTable list={[...archiveList, ...todayList, ...upcomingList].sort((a, b) => (getDate(b)).localeCompare(getDate(a)))} onEdit={setEditing} onDelete={deletePatient} /></TabsContent>
        </Tabs>

        <PatientEditDialog patient={editing} onClose={() => setEditing(null)} />
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, big }: { icon: React.ReactNode; label: string; value: string | number; big?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-muted/50 p-3">{icon}</div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={cn("font-bold truncate", big ? "text-2xl" : "text-sm")}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const s = STATUS_LABELS[status ?? "pending"] ?? STATUS_LABELS.pending;
  return <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

function CardsList({
  list, onEdit, onDelete, onReschedule, onSend, empty, showDate,
}: {
  list: Patient[]; onEdit: (p: Patient) => void; onDelete: (id: string) => void;
  onReschedule: (id: string, days: number) => void; onSend: (id: string) => void;
  empty: string; showDate?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const filtered = list.filter((p) => {
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
        {filtered.map((p) => {
          const isDone = (p.status ?? "pending") === "done";
          const isSent = !!p.sent_at;
          return (
            <Card key={p.id} className={cn("group transition-all hover:shadow-elegant", isDone && "opacity-70", isSent && !isDone && "border-primary/60")}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="truncate text-lg">{p.full_name}</CardTitle>
                  <StatusBadge status={p.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {showDate && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDate(p.appointment_date)}</span>}
                  {p.appointment_time && <span className="flex items-center gap-1" dir="ltr"><Clock className="h-3 w-3" />{p.appointment_time.slice(0,5)}</span>}
                  {p.attachments && p.attachments.length > 0 && <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{p.attachments.length}</span>}
                  {isSent && !isDone && <span className="flex items-center gap-1 text-primary"><Check className="h-3 w-3" />مرسل للطبيب</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  {p.age != null && <Badge variant="secondary">العمر: {p.age}</Badge>}
                  {p.gender && <Badge variant="secondary">{p.gender}</Badge>}
                </div>
                {p.phone && <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" /><span dir="ltr">{p.phone}</span></div>}
                {p.chronic_diseases && <div className="line-clamp-2 text-muted-foreground"><span className="font-medium">الأمراض:</span> {p.chronic_diseases}</div>}
                <div className="flex items-center gap-2 pt-2">
                  {!isDone && (
                    <Button size="sm" className="flex-1 gap-1" disabled={isSent} onClick={() => onSend(p.id)}>
                      <Send className="h-3 w-3" />{isSent ? "تم الإرسال" : "إرسال للطبيب"}
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => onEdit(p)} title="تعديل"><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(p.id)} title="حذف"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onReschedule(p.id, 1)}>+1 يوم</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onReschedule(p.id, 2)}>+2 يوم</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onReschedule(p.id, 7)}>+أسبوع</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">{empty}</div>
        )}
      </div>
    </div>
  );
}

function HistoryTable({ list, onEdit, onDelete }: { list: Patient[]; onEdit: (p: Patient) => void; onDelete: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((p) => {
      if (q && !(p.full_name.toLowerCase().includes(q) || (p.phone ?? "").includes(q))) return false;
      const d = p.appointment_date ?? p.created_at.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [list, search, from, to]);
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <div className="md:col-span-2 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div><Label className="text-xs">من تاريخ</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label className="text-xs">إلى تاريخ</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الوقت</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-center">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{p.appointment_date ?? "—"}</TableCell>
                  <TableCell className="text-xs" dir="ltr">{p.appointment_time?.slice(0,5) ?? "—"}</TableCell>
                  <TableCell className="text-xs" dir="ltr">{p.phone ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => onEdit(p)} title="تعديل"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => onDelete(p.id)} title="حذف"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">لا توجد نتائج</TableCell></TableRow>
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
    else { toast.success("تم تحديث الموعد"); onClose(); }
  };
  return (
    <Dialog open={!!patient} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>تعديل الموعد</DialogTitle></DialogHeader>
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

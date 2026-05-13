import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Mail, Phone, Stethoscope as Steth, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: () => <RequireAuth allow={["admin"]}><AdminPage /></RequireAuth>,
});

interface Profile {
  id: string; full_name: string; email: string; phone: string | null;
  specialty: string | null; clinic_name: string | null;
  status: "pending" | "approved" | "rejected"; doctor_id: string | null;
}

function AdminPage() {
  const [doctors, setDoctors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    // Doctors: those who have role doctor
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
    const { error } = await supabase.from("profiles").update({ status, rejection_reason: status === "rejected" ? "تم الرفض من قبل المدير" : null }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(status === "approved" ? "تمت الموافقة على الحساب" : "تم رفض الحساب");
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
          <p className="text-sm text-muted-foreground">مراجعة وإدارة طلبات الأطباء</p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
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
          <TabsContent value="pending"><DoctorList list={pending} loading={loading} onAction={setStatus} showActions /></TabsContent>
          <TabsContent value="approved"><DoctorList list={approved} loading={loading} onAction={setStatus} /></TabsContent>
          <TabsContent value="rejected"><DoctorList list={rejected} loading={loading} onAction={setStatus} /></TabsContent>
        </Tabs>
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

function DoctorList({ list, loading, onAction, showActions }: { list: Profile[]; loading: boolean; onAction: (id: string, s: "approved" | "rejected") => void; showActions?: boolean }) {
  if (loading) return <p className="py-8 text-center text-muted-foreground">جار التحميل...</p>;
  if (list.length === 0) return <p className="py-8 text-center text-muted-foreground">لا يوجد</p>;
  return (
    <div className="mt-4 grid gap-3">
      {list.map((d) => (
        <Card key={d.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">د. {d.full_name}</CardTitle>
                <Badge variant={d.status === "approved" ? "default" : d.status === "rejected" ? "destructive" : "secondary"} className="mt-1">
                  {d.status === "approved" ? "موافق" : d.status === "rejected" ? "مرفوض" : "قيد الانتظار"}
                </Badge>
              </div>
              {showActions && (
                <div className="flex gap-2">
                  <Button size="sm" variant="default" onClick={() => onAction(d.id, "approved")}><Check className="ml-1 h-4 w-4" />موافقة</Button>
                  <Button size="sm" variant="destructive" onClick={() => onAction(d.id, "rejected")}><X className="ml-1 h-4 w-4" />رفض</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm md:grid-cols-2">
            <Info icon={<Steth className="h-4 w-4" />} text={d.specialty || "—"} label="الاختصاص" />
            <Info icon={<Building2 className="h-4 w-4" />} text={d.clinic_name || "—"} label="العيادة" />
            <Info icon={<Mail className="h-4 w-4" />} text={d.email} label="البريد" ltr />
            <Info icon={<Phone className="h-4 w-4" />} text={d.phone || "—"} label="الهاتف" ltr />
          </CardContent>
        </Card>
      ))}
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

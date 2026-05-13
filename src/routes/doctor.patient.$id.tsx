import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Printer, Save, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/doctor/patient/$id")({
  component: () => <RequireAuth allow={["doctor"]}><PrescriptionPage /></RequireAuth>,
});

interface Patient { id: string; full_name: string; age: number | null; gender: string | null; phone: string | null; }
interface Settings { doctor_name: string; specialty: string; clinic_name: string; clinic_address: string; clinic_phone: string; working_hours: string; }

function PrescriptionPage() {
  const { id } = useParams({ from: "/doctor/patient/$id" });
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [content, setContent] = useState("");
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: s }, { data: presc }] = await Promise.all([
        supabase.from("patients").select("*").eq("id", id).maybeSingle(),
        supabase.from("doctor_settings").select("*").eq("doctor_id", user.id).maybeSingle(),
        supabase.from("prescriptions").select("*").eq("patient_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setPatient(p as Patient | null);
      setSettings(s as Settings | null);
      if (presc) {
        setPrescriptionId(presc.id);
        setContent(presc.content || "");
      }
      setLoading(false);
    })();
  }, [id, user]);

  const save = async () => {
    if (!user || !patient) return;
    setSaving(true);
    if (prescriptionId) {
      const { error } = await supabase.from("prescriptions").update({ content }).eq("id", prescriptionId);
      if (error) toast.error(error.message); else toast.success("تم الحفظ");
    } else {
      const { data, error } = await supabase.from("prescriptions").insert({ patient_id: id, doctor_id: user.id, content }).select().single();
      if (error) toast.error(error.message);
      else { setPrescriptionId(data.id); toast.success("تم الحفظ"); }
    }
    setSaving(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!patient) return <div className="p-8 text-center">المراجع غير موجود</div>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-4xl p-4 md:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 no-print">
          <Link to="/doctor"><Button variant="ghost"><ArrowRight className="ml-1 h-4 w-4" />العودة</Button></Link>
          <div className="flex gap-2">
            <Button variant="outline" onClick={save} disabled={saving}>{saving ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Save className="ml-1 h-4 w-4" />}حفظ</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="ml-1 h-4 w-4" />طباعة</Button>
            <Button onClick={() => window.print()}><Download className="ml-1 h-4 w-4" />تصدير PDF</Button>
          </div>
        </div>

        <Card className="print-area overflow-hidden shadow-elegant">
          {/* HEADER */}
          <div className="bg-gradient-primary p-6 text-primary-foreground">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs opacity-80">الطبيب</div>
                <div className="text-xl font-bold">د. {settings?.doctor_name || "—"}</div>
                <div className="text-sm opacity-90">{settings?.specialty || ""}</div>
              </div>
              <div className="text-left">
                <div className="text-xs opacity-80">التاريخ</div>
                <div className="font-semibold" dir="ltr">{new Date().toLocaleDateString("ar-EG")}</div>
              </div>
            </div>
          </div>

          {/* PATIENT INFO */}
          <div className="grid grid-cols-2 gap-3 border-b bg-muted/30 p-4 md:grid-cols-4">
            <Info label="المراجع" value={patient.full_name} />
            <Info label="العمر" value={patient.age ?? "—"} />
            <Info label="الجنس" value={patient.gender ?? "—"} />
            <Info label="الهاتف" value={patient.phone ?? "—"} ltr />
          </div>

          {/* PRESCRIPTION BODY */}
          <div className="p-6">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-lg font-bold">℞ الوصفة الطبية</h3>
              <span className="text-xs text-muted-foreground no-print">الكتابة من اليسار إلى اليمين</span>
            </div>
            <Textarea
              dir="ltr"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write prescription here (medications, dosage, instructions)..."
              className="min-h-[300px] resize-none border-2 border-primary/30 bg-background font-mono text-base leading-relaxed focus-visible:border-primary"
              style={{ textAlign: "left" }}
            />
          </div>

          {/* CLINIC FOOTER */}
          <div className="border-t bg-muted/30 p-4 text-center text-sm">
            <div className="font-semibold">{settings?.clinic_name || ""}</div>
            <div className="mt-1 text-muted-foreground">{settings?.clinic_address || ""}</div>
            <div className="mt-1 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              {settings?.clinic_phone && <span>📞 <span dir="ltr">{settings.clinic_phone}</span></span>}
              {settings?.working_hours && <span>🕐 {settings.working_hours}</span>}
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}

function Info({ label, value, ltr }: { label: string; value: React.ReactNode; ltr?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold" dir={ltr ? "ltr" : undefined}>{value}</div>
    </div>
  );
}

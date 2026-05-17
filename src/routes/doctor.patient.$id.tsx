import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppHeader } from "@/components/AppHeader";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer, Save, Download, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/doctor/patient/$id")({
  component: () => <RequireAuth allow={["doctor"]}><PrescriptionPage /></RequireAuth>,
});

interface Patient { id: string; full_name: string; age: number | null; gender: string | null; phone: string | null; }
interface Settings {
  doctor_name: string; specialty: string; clinic_name: string;
  clinic_address: string; clinic_phone: string; working_hours: string;
  logo_url: string | null; rx_prefix: string;
  theme_header: string; theme_accent: string; theme_bg: string; theme_text: string;
  font_size?: number; qr_size?: number; footer_note?: string;
  print_size?: "A4" | "A5";
}

function PrescriptionPage() {
  const { id } = useParams({ from: "/doctor/patient/$id" });
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [body, setBody] = useState("");
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const rxPrefix = settings?.rx_prefix || "Rx";

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
        const prefix = (s as any)?.rx_prefix || "Rx";
        const c = presc.content || "";
        // Strip prefix line for editing if present
        const stripped = c.startsWith(prefix + "\n") ? c.slice(prefix.length + 1) : c;
        setBody(stripped);
      }
      setLoading(false);
    })();
  }, [id, user]);

  const fullContent = useMemo(() => `${rxPrefix}\n${body}`, [rxPrefix, body]);

  const save = async () => {
    if (!user || !patient) return;
    setSaving(true);
    if (prescriptionId) {
      const { error } = await supabase.from("prescriptions").update({ content: fullContent }).eq("id", prescriptionId);
      if (error) toast.error(error.message); else toast.success("تم الحفظ");
    } else {
      const { data, error } = await supabase.from("prescriptions").insert({ patient_id: id, doctor_id: user.id, content: fullContent }).select().single();
      if (error) toast.error(error.message);
      else { setPrescriptionId(data.id); toast.success("تم الحفظ"); }
    }
    setSaving(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!patient) return <div className="p-8 text-center">المراجع غير موجود</div>;

  const t = {
    header: settings?.theme_header || "#0ea5e9",
    accent: settings?.theme_accent || "#0369a1",
    bg: settings?.theme_bg || "#ffffff",
    text: settings?.theme_text || "#0f172a",
  };

  // A4 landscape, two prescription slips per sheet
  // Each slip: ~148mm wide × ~200mm tall (half of A4 landscape minus margins/gap)

  const Slip = () => (
    <div
      className="rx-slip relative flex flex-col overflow-hidden rounded-md border"
      style={{ background: t.bg, color: t.text, borderColor: `${t.accent}40` }}
    >
      {settings?.logo_url && (
        <img
          src={settings.logo_url}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 m-auto h-[55%] w-auto max-w-[60%] object-contain opacity-[0.04]"
        />
      )}

      {/* HEADER */}
      <div
        className="relative p-4"
        style={{ background: `linear-gradient(135deg, ${t.header}, ${t.accent})`, color: "#ffffff" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {settings?.logo_url && (
              <img
                src={settings.logo_url}
                alt="logo"
                className="h-14 w-14 object-contain"
                style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }}
              />
            )}
            <div>
              <div className="text-[9px] uppercase tracking-widest opacity-75">Doctor</div>
              <div className="text-lg font-extrabold leading-tight">د. {settings?.doctor_name || "—"}</div>
              <div className="text-[11px] opacity-90">{settings?.specialty || ""}</div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-[9px] uppercase tracking-widest opacity-75">Date</div>
            <div className="text-xs font-semibold" dir="ltr">{new Date().toLocaleDateString("ar-EG")}</div>
            {settings?.clinic_name && <div className="mt-1 text-[10px] opacity-90">{settings.clinic_name}</div>}
          </div>
        </div>
      </div>

      {/* PATIENT */}
      <div
        className="grid grid-cols-2 gap-2 border-b p-3 text-xs"
        style={{ background: `${t.accent}10`, borderColor: `${t.accent}30` }}
      >
        <Info label="المراجع" value={patient.full_name} />
        <Info label="العمر" value={patient.age ?? "—"} />
        <Info label="الجنس" value={patient.gender ?? "—"} />
        <Info label="الهاتف" value={patient.phone ?? "—"} ltr />
      </div>

      {/* BODY */}
      <div className="flex-1 p-4">
        <h3 className="mb-2 text-sm font-bold" style={{ color: t.accent }}>℞ الوصفة الطبية</h3>
        <div className="rounded-md border-2 overflow-hidden" style={{ borderColor: `${t.accent}55` }}>
          <div
            className="border-b px-3 py-1.5 font-mono text-sm font-bold"
            style={{ background: `${t.header}15`, color: t.accent, borderColor: `${t.accent}30` }}
            dir="ltr"
          >
            {rxPrefix}
          </div>
          <pre
            dir="ltr"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => setBody(e.currentTarget.innerText.replace(/\n$/, ""))}
            data-placeholder="Write medications, dosage, instructions..."
            className="rx-editable m-0 min-h-[140px] whitespace-pre-wrap p-3 font-mono leading-relaxed outline-none focus:bg-yellow-50/30"
            style={{ background: t.bg, color: t.text, textAlign: "left", fontSize: `${settings?.font_size || 14}px` }}
          >
            {body}
          </pre>
        </div>
      </div>

      {/* FOOTER */}
      <div
        className="relative border-t p-3"
        style={{ background: `${t.accent}08`, borderColor: `${t.accent}30` }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 text-right text-[10px]">
            <div className="font-semibold">{settings?.clinic_name || ""}</div>
            <div className="mt-0.5 opacity-70">{settings?.clinic_address || ""}</div>
            <div className="mt-0.5 flex flex-wrap gap-2 opacity-70">
              {settings?.clinic_phone && <span>📞 <span dir="ltr">{settings.clinic_phone}</span></span>}
              {settings?.working_hours && <span>🕐 {settings.working_hours}</span>}
            </div>
            {settings?.footer_note && <div className="mt-1 italic opacity-80">{settings.footer_note}</div>}
          </div>
          {prescriptionId && (
            <div className="flex flex-col items-center gap-0.5 rounded-md bg-white p-1.5" style={{ border: `1px solid ${t.accent}30` }}>
              <QRCodeSVG
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/verify/${prescriptionId}`}
                size={64}
                level="M"
                includeMargin={false}
                fgColor={t.accent}
              />
              <div className="flex items-center gap-1 text-[8px] text-slate-600">
                <ShieldCheck className="h-2.5 w-2.5" /><span>تحقق</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <style>{`
        @page { size: A5 portrait; margin: 6mm; }
        @media print {
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: absolute; left: 0; top: 0;
            width: 148mm; height: 210mm;
            margin: 0; padding: 0 !important;
            display: block !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-area .rx-slip {
            width: 100% !important;
            height: 100% !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            break-inside: avoid;
          }
          .no-print { display: none !important; }
        }
      `}</style>
      <main className="container mx-auto max-w-6xl p-4 md:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 no-print">
          <Link to="/doctor"><Button variant="ghost"><ArrowRight className="ml-1 h-4 w-4" />العودة</Button></Link>
          <div className="flex items-center gap-2">
            <span className="rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">A5 عمودي • وصفة واحدة لكل ورقة</span>
            <Button variant="outline" onClick={save} disabled={saving}>{saving ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Save className="ml-1 h-4 w-4" />}حفظ</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="ml-1 h-4 w-4" />طباعة</Button>
            <Button onClick={() => window.print()}><Download className="ml-1 h-4 w-4" />تصدير PDF</Button>
          </div>
        </div>

        {/* Editor (screen only) */}
        <Card className="mb-6 p-4 no-print">
          <label className="mb-2 block text-sm font-semibold" style={{ color: t.accent }}>
            ℞ محتوى الوصفة الطبية
          </label>
          <div className="rounded-md border-2 overflow-hidden" style={{ borderColor: `${t.accent}55` }}>
            <div
              className="border-b px-3 py-2 font-mono text-base font-bold"
              style={{ background: `${t.header}15`, color: t.accent, borderColor: `${t.accent}30` }}
              dir="ltr"
            >
              {rxPrefix}
            </div>
            <Textarea
              dir="ltr"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write medications, dosage, instructions..."
              className="min-h-[220px] resize-none rounded-none border-0 font-mono leading-relaxed focus-visible:ring-0"
              style={{ background: t.bg, color: t.text, textAlign: "left", fontSize: `${settings?.font_size || 16}px` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">المعاينة بالأسفل تطابق الشكل النهائي للطباعة (A4 أفقي – وصفتان متطابقتان).</p>
        </Card>

        {/* Preview = print area (A4 landscape, 2 slips) */}
        <div className="mb-2 flex items-center justify-between no-print">
          <h2 className="text-sm font-semibold text-muted-foreground">معاينة الطباعة</h2>
        </div>
        <div className="overflow-x-auto no-print-scroll">
          <div
            className="print-area mx-auto bg-white shadow-elegant"
            style={{ width: "148mm", height: "210mm" }}
          >
            <Slip />
          </div>
        </div>
      </main>
    </div>
  );
}

function Info({ label, value, ltr }: { label: string; value: React.ReactNode; ltr?: boolean }) {
  return (
    <div>
      <div className="text-xs opacity-60">{label}</div>
      <div className="font-semibold" dir={ltr ? "ltr" : undefined}>{value}</div>
    </div>
  );
}

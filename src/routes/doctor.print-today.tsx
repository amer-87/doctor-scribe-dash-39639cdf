import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { PrescriptionPreview, type PrescriptionTheme } from "@/components/PrescriptionPreview";

export const Route = createFileRoute("/doctor/print-today")({
  component: () => <RequireAuth allow={["doctor"]}><PrintTodayPage /></RequireAuth>,
  validateSearch: (s: Record<string, unknown>) => ({ ids: (s.ids as string) || "" }),
});

interface Patient {
  id: string; full_name: string; age: number | null; gender: string | null; phone: string | null;
}
interface Prescription { id: string; patient_id: string; content: string; }

function PrintTodayPage() {
  const { ids } = Route.useSearch();
  const { user } = useAuth();
  const [settings, setSettings] = useState<PrescriptionTheme | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescByPatient, setPrescByPatient] = useState<Record<string, Prescription>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !ids) return;
    const idList = ids.split(",").filter(Boolean);
    (async () => {
      const [{ data: s }, { data: ps }, { data: pr }] = await Promise.all([
        supabase.from("doctor_settings").select("*").eq("doctor_id", user.id).maybeSingle(),
        supabase.from("patients").select("id,full_name,age,gender,phone").in("id", idList),
        supabase.from("prescriptions").select("id,patient_id,content,created_at").in("patient_id", idList).order("created_at", { ascending: false }),
      ]);
      setSettings(s as any);
      // Order patients to match ids param
      const map = new Map((ps as Patient[] ?? []).map((p) => [p.id, p]));
      setPatients(idList.map((i: string) => map.get(i)).filter(Boolean) as Patient[]);
      // Keep latest prescription per patient
      const byPat: Record<string, Prescription> = {};
      (pr as any[] ?? []).forEach((row) => {
        if (!byPat[row.patient_id]) byPat[row.patient_id] = row;
      });
      setPrescByPatient(byPat);
      setLoading(false);
    })();
  }, [user, ids]);

  useEffect(() => {
    if (!loading && patients.length > 0) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loading, patients.length]);

  if (loading || !settings) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const rxPrefix = settings.rx_prefix || "Rx";

  return (
    <div className="min-h-screen bg-white p-4 print:p-0">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        .rx-page { page-break-after: always; break-after: page; }
        .rx-page:last-child { page-break-after: auto; }
        @media print {
          body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        @media screen {
          .rx-page { margin: 0 auto 24px; max-width: 186mm; }
        }
      `}</style>

      <div className="mb-4 flex items-center justify-between no-print print:hidden">
        <h1 className="text-lg font-bold">طباعة وصفات اليوم — {patients.length} وصفة</h1>
        <button onClick={() => window.print()} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">طباعة الآن</button>
      </div>

      {patients.map((p) => {
        const presc = prescByPatient[p.id];
        const body = presc ? (presc.content.startsWith(rxPrefix + "\n") ? presc.content.slice(rxPrefix.length + 1) : presc.content) : "—";
        return (
          <div key={p.id} className="rx-page">
            <PrescriptionPreview
              settings={settings}
              patient={{ full_name: p.full_name, age: p.age, gender: p.gender, phone: p.phone }}
              body={body}
              prescriptionId={presc?.id ?? null}
              showQrPlaceholder={!!presc}
            />
          </div>
        );
      })}

      {patients.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">لا يوجد مراجعين للطباعة.</div>
      )}
    </div>
  );
}

import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2, Stethoscope, Calendar, User, Building2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/verify/$id")({ component: VerifyPage });

interface VerifyData {
  id: string;
  created_at: string;
  doctor_name: string;
  specialty: string;
  clinic_name: string;
  patient_name: string;
  is_valid: boolean;
}

function VerifyPage() {
  const { id } = useParams({ from: "/verify/$id" });
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerifyData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: rows, error } = await supabase.rpc("verify_prescription", { _id: id });
      if (error || !rows || (rows as VerifyData[]).length === 0) setNotFound(true);
      else setData((rows as VerifyData[])[0]);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background p-4 py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-elegant">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">صفحة التحقق من الوصفة الطبية</h1>
          <p className="text-sm text-muted-foreground">منصة طبية موثوقة</p>
        </div>

        {notFound || !data ? (
          <Card className="border-destructive/40">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <XCircle className="h-16 w-16 text-destructive" />
              <h2 className="text-xl font-bold text-destructive">وصفة غير موجودة</h2>
              <p className="text-sm text-muted-foreground">المعرّف غير صحيح أو تم حذف الوصفة. قد تكون الوصفة مزوّرة.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className={data.is_valid ? "border-success/40" : "border-warning/40"}>
            <CardHeader className={`flex flex-row items-center gap-3 ${data.is_valid ? "bg-success/10" : "bg-warning/10"}`}>
              {data.is_valid ? (
                <CheckCircle2 className="h-10 w-10 text-success" />
              ) : (
                <XCircle className="h-10 w-10 text-warning" />
              )}
              <div>
                <CardTitle className={data.is_valid ? "text-success" : "text-warning"}>
                  {data.is_valid ? "وصفة طبية صحيحة وموثّقة" : "حساب الطبيب غير نشط حالياً"}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.is_valid ? "تم التحقق من صحة هذه الوصفة عبر النظام" : "قد لا تكون هذه الوصفة سارية المفعول"}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <Row icon={<User className="h-4 w-4" />} label="المراجع" value={data.patient_name || "—"} />
              <Row icon={<Stethoscope className="h-4 w-4" />} label="الطبيب" value={`د. ${data.doctor_name}`} />
              {data.specialty && <Row icon={<ShieldCheck className="h-4 w-4" />} label="الاختصاص" value={data.specialty} />}
              {data.clinic_name && <Row icon={<Building2 className="h-4 w-4" />} label="العيادة" value={data.clinic_name} />}
              <Row icon={<Calendar className="h-4 w-4" />} label="تاريخ الإصدار" value={new Date(data.created_at).toLocaleString("ar-EG")} />
              <div className="pt-3 border-t">
                <div className="text-xs text-muted-foreground">معرّف الوصفة</div>
                <div className="font-mono text-xs break-all" dir="ltr">{data.id}</div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-primary">
            الذهاب للصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 text-muted-foreground">{icon}</div>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-semibold">{value}</div>
      </div>
    </div>
  );
}

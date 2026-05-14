import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck } from "lucide-react";

export interface PrescriptionTheme {
  doctor_name: string;
  specialty: string;
  clinic_name: string;
  clinic_address: string;
  clinic_phone: string;
  working_hours: string;
  logo_url: string | null;
  rx_prefix: string;
  theme_header: string;
  theme_accent: string;
  theme_bg: string;
  theme_text: string;
  font_size?: number;
  qr_size?: number;
  footer_note?: string;
}

interface Props {
  settings: PrescriptionTheme;
  patient?: { full_name: string; age: number | string | null; gender: string | null; phone: string | null };
  body?: string;
  prescriptionId?: string | null;
  showQrPlaceholder?: boolean;
}

export function PrescriptionPreview({ settings: s, patient, body = "Sample medication 1\nSample medication 2", prescriptionId, showQrPlaceholder = true }: Props) {
  const t = {
    header: s.theme_header || "#0ea5e9",
    accent: s.theme_accent || "#0369a1",
    bg: s.theme_bg || "#ffffff",
    text: s.theme_text || "#0f172a",
  };
  const fontSize = s.font_size || 16;
  const qrSize = s.qr_size || 84;
  const sample = patient ?? { full_name: "اسم المراجع التجريبي", age: 32, gender: "ذكر", phone: "07xxxxxxxxx" };

  return (
    <div className="print-area relative overflow-hidden rounded-xl border shadow-sm" style={{ background: t.bg, color: t.text }}>
      {s.logo_url && (
        <img src={s.logo_url} alt="" aria-hidden className="pointer-events-none absolute inset-0 m-auto h-[60%] w-auto max-w-[60%] object-contain opacity-[0.04]" />
      )}
      <div className="relative p-6" style={{ background: `linear-gradient(135deg, ${t.header}, ${t.accent})`, color: "#fff" }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {s.logo_url && (
              <img src={s.logo_url} alt="logo" className="h-16 w-16 object-contain" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))" }} />
            )}
            <div>
              <div className="text-[10px] uppercase tracking-widest opacity-75">Doctor</div>
              <div className="text-xl font-extrabold leading-tight">د. {s.doctor_name || "—"}</div>
              <div className="text-xs opacity-90">{s.specialty || ""}</div>
            </div>
          </div>
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-widest opacity-75">Date</div>
            <div className="font-semibold" dir="ltr">{new Date().toLocaleDateString("ar-EG")}</div>
            {s.clinic_name && <div className="mt-1 text-xs opacity-90">{s.clinic_name}</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b p-4 md:grid-cols-4" style={{ background: `${t.accent}10`, borderColor: `${t.accent}30` }}>
        <Cell label="المراجع" value={sample.full_name} />
        <Cell label="العمر" value={sample.age ?? "—"} />
        <Cell label="الجنس" value={sample.gender ?? "—"} />
        <Cell label="الهاتف" value={sample.phone ?? "—"} ltr />
      </div>

      <div className="p-6">
        <h3 className="mb-2 text-base font-bold" style={{ color: t.accent }}>℞ الوصفة الطبية</h3>
        <div className="overflow-hidden rounded-md border-2" style={{ borderColor: `${t.accent}55` }}>
          <div className="border-b px-3 py-2 font-mono font-bold" style={{ background: `${t.header}15`, color: t.accent, borderColor: `${t.accent}30`, fontSize: `${fontSize}px` }} dir="ltr">
            {s.rx_prefix || "Rx"}
          </div>
          <pre className="m-0 whitespace-pre-wrap p-3 font-mono leading-relaxed" style={{ background: t.bg, color: t.text, fontSize: `${fontSize}px`, direction: "ltr", textAlign: "left", minHeight: 120 }}>
            {body || "— —"}
          </pre>
        </div>
      </div>

      <div className="relative border-t p-4" style={{ background: `${t.accent}08`, borderColor: `${t.accent}30` }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-[180px] flex-1 text-center sm:text-right">
            <div className="font-semibold">{s.clinic_name || ""}</div>
            <div className="mt-1 text-xs opacity-70">{s.clinic_address || ""}</div>
            <div className="mt-1 flex flex-wrap justify-center gap-3 text-xs opacity-70 sm:justify-start">
              {s.clinic_phone && <span>📞 <span dir="ltr">{s.clinic_phone}</span></span>}
              {s.working_hours && <span>🕐 {s.working_hours}</span>}
            </div>
            {s.footer_note && <div className="mt-2 text-xs italic opacity-80">{s.footer_note}</div>}
          </div>
          {prescriptionId ? (
            <div className="flex flex-col items-center gap-1 rounded-md bg-white p-2" style={{ border: `1px solid ${t.accent}30` }}>
              <QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : ""}/verify/${prescriptionId}`} size={qrSize} level="M" includeMargin={false} fgColor={t.accent} />
              <div className="flex items-center gap-1 text-[9px] text-slate-600">
                <ShieldCheck className="h-3 w-3" /><span>تحقق من الوصفة</span>
              </div>
            </div>
          ) : showQrPlaceholder ? (
            <div className="flex items-center justify-center rounded-md bg-white p-2" style={{ border: `1px solid ${t.accent}30`, width: qrSize + 16, height: qrSize + 16 }}>
              <QRCodeSVG value="https://example.com/verify/preview" size={qrSize} level="M" includeMargin={false} fgColor={t.accent} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, ltr }: { label: string; value: React.ReactNode; ltr?: boolean }) {
  return (
    <div>
      <div className="text-xs opacity-60">{label}</div>
      <div className="font-semibold" dir={ltr ? "ltr" : undefined}>{value}</div>
    </div>
  );
}

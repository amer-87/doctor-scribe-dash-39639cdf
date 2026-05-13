
-- 1) Admin settings (whatsapp etc.)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  whatsapp_number TEXT DEFAULT '07717119882',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO public.admin_settings (id, whatsapp_number) VALUES (1, '07717119882')
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view admin settings"
  ON public.admin_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin updates admin settings"
  ON public.admin_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Subscription columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- Auto-set subscription_start when admin first approves the doctor
CREATE OR REPLACE FUNCTION public.set_subscription_start()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved' AND NEW.subscription_start IS NULL THEN
    NEW.subscription_start := now();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_subscription_start ON public.profiles;
CREATE TRIGGER trg_set_subscription_start
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_subscription_start();

-- Helper: is the doctor's subscription valid (not expired & active)
CREATE OR REPLACE FUNCTION public.is_subscription_valid(_user_id uuid)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT is_active AND (subscription_end IS NULL OR subscription_end > now())
     FROM public.profiles WHERE id = _user_id),
    false
  );
$$;

-- Doctor write-access check: approved + active + not expired
CREATE OR REPLACE FUNCTION public.can_write(_user_id uuid)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_approved(_user_id)
     AND public.is_subscription_valid(public.get_effective_doctor_id(_user_id));
$$;

-- 3) Login logs
CREATE TABLE IF NOT EXISTS public.login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT,
  user_agent TEXT,
  device_label TEXT,
  ip_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own login log"
  ON public.login_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own login logs"
  ON public.login_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin views all login logs"
  ON public.login_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) Public verification of prescriptions via SECURITY DEFINER (no PHI exposure beyond name/date)
CREATE OR REPLACE FUNCTION public.verify_prescription(_id uuid)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  doctor_name TEXT,
  specialty TEXT,
  clinic_name TEXT,
  patient_name TEXT,
  is_valid BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    pr.id,
    pr.created_at,
    COALESCE(ds.doctor_name, prof.full_name, '') AS doctor_name,
    COALESCE(ds.specialty, prof.specialty, '') AS specialty,
    COALESCE(ds.clinic_name, prof.clinic_name, '') AS clinic_name,
    p.full_name AS patient_name,
    (prof.status = 'approved'
       AND COALESCE(prof.is_active, true)
       AND (prof.subscription_end IS NULL OR prof.subscription_end > now())) AS is_valid
  FROM public.prescriptions pr
  LEFT JOIN public.patients p ON p.id = pr.patient_id
  LEFT JOIN public.profiles prof ON prof.id = pr.doctor_id
  LEFT JOIN public.doctor_settings ds ON ds.doctor_id = pr.doctor_id
  WHERE pr.id = _id;
$$;

GRANT EXECUTE ON FUNCTION public.verify_prescription(uuid) TO anon, authenticated;

-- 5) Update patients write policy to also enforce subscription validity
DROP POLICY IF EXISTS "Doctor/secretary insert patients" ON public.patients;
CREATE POLICY "Doctor/secretary insert patients"
  ON public.patients FOR INSERT TO authenticated
  WITH CHECK (doctor_id = public.get_effective_doctor_id(auth.uid())
             AND public.can_write(auth.uid()));

DROP POLICY IF EXISTS "Doctor updates patients" ON public.patients;
CREATE POLICY "Doctor updates patients"
  ON public.patients FOR UPDATE TO authenticated
  USING (doctor_id = auth.uid()
         AND public.has_role(auth.uid(), 'doctor')
         AND public.can_write(auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.login_logs;

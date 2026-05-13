
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'doctor', 'secretary');
CREATE TYPE public.account_status AS ENUM ('pending', 'approved', 'rejected');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  specialty TEXT,
  clinic_name TEXT,
  status public.account_status NOT NULL DEFAULT 'pending',
  doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Has role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Get current user's doctor_id (for secretaries it's their assigned doctor; for doctors it's themselves)
CREATE OR REPLACE FUNCTION public.get_effective_doctor_id(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.has_role(_user_id, 'doctor') THEN _user_id
    WHEN public.has_role(_user_id, 'secretary') THEN (SELECT doctor_id FROM public.profiles WHERE id = _user_id)
    ELSE NULL
  END
$$;

-- Is account approved
CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'approved')
$$;

-- Doctor settings
CREATE TABLE public.doctor_settings (
  doctor_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL DEFAULT '',
  specialty TEXT NOT NULL DEFAULT '',
  clinic_name TEXT NOT NULL DEFAULT '',
  clinic_address TEXT NOT NULL DEFAULT '',
  clinic_phone TEXT NOT NULL DEFAULT '',
  working_hours TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Patients
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  phone TEXT,
  chronic_diseases TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX patients_doctor_idx ON public.patients(doctor_id, created_at DESC);

-- Prescriptions
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin views all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Doctor views own secretaries" ON public.profiles FOR SELECT USING (doctor_id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin updates all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Doctor updates own secretaries" ON public.profiles FOR UPDATE USING (doctor_id = auth.uid() AND public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin views all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Doctor settings policies
CREATE POLICY "Doctor manages own settings" ON public.doctor_settings FOR ALL USING (auth.uid() = doctor_id) WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "Secretary views doctor settings" ON public.doctor_settings FOR SELECT USING (doctor_id = public.get_effective_doctor_id(auth.uid()));

-- Patients policies
CREATE POLICY "Doctor/secretary view patients" ON public.patients FOR SELECT USING (doctor_id = public.get_effective_doctor_id(auth.uid()) AND public.is_approved(auth.uid()));
CREATE POLICY "Doctor/secretary insert patients" ON public.patients FOR INSERT WITH CHECK (doctor_id = public.get_effective_doctor_id(auth.uid()) AND public.is_approved(auth.uid()));
CREATE POLICY "Doctor updates patients" ON public.patients FOR UPDATE USING (doctor_id = auth.uid() AND public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "Secretary updates patients they added" ON public.patients FOR UPDATE USING (added_by = auth.uid() AND public.has_role(auth.uid(), 'secretary'));
CREATE POLICY "Doctor deletes patients" ON public.patients FOR DELETE USING (doctor_id = auth.uid() AND public.has_role(auth.uid(), 'doctor'));

-- Prescriptions policies
CREATE POLICY "Doctor manages own prescriptions" ON public.prescriptions FOR ALL USING (doctor_id = auth.uid() AND public.has_role(auth.uid(), 'doctor')) WITH CHECK (doctor_id = auth.uid());
CREATE POLICY "Secretary views prescriptions" ON public.prescriptions FOR SELECT USING (doctor_id = public.get_effective_doctor_id(auth.uid()) AND public.is_approved(auth.uid()));

-- Trigger: auto profile + role + settings on signup; auto-approve admin email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
  _status public.account_status := 'pending';
  _doctor_id UUID;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'doctor');
  _doctor_id := NULLIF(NEW.raw_user_meta_data->>'doctor_id', '')::UUID;

  -- Admin email auto-approve as admin
  IF NEW.email = 'amer87salam@gmail.com' THEN
    _role := 'admin';
    _status := 'approved';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone, specialty, clinic_name, status, doctor_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'specialty',
    NEW.raw_user_meta_data->>'clinic_name',
    _status,
    _doctor_id
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  IF _role = 'doctor' THEN
    INSERT INTO public.doctor_settings (doctor_id, doctor_name, specialty, clinic_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.raw_user_meta_data->>'specialty', ''), COALESCE(NEW.raw_user_meta_data->>'clinic_name', ''));
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_prescriptions_updated BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.doctor_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Enable realtime
ALTER TABLE public.patients REPLICA IDENTITY FULL;
ALTER TABLE public.prescriptions REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

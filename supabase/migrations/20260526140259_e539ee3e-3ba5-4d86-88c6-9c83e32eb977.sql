
-- Add short_code column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE;

-- Generator function (8 chars, A-Z 0-9 minus confusing chars)
CREATE OR REPLACE FUNCTION public.generate_doctor_short_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
  i INT;
  tries INT := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, 1 + floor(random()*length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE short_code = code);
    tries := tries + 1;
    IF tries > 50 THEN RAISE EXCEPTION 'Could not generate unique short_code'; END IF;
  END LOOP;
  RETURN code;
END;
$$;

-- Backfill for existing doctors (anyone with role doctor or admin gets one)
UPDATE public.profiles p
SET short_code = public.generate_doctor_short_code()
WHERE short_code IS NULL
  AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role IN ('doctor','admin'));

-- Lookup function used by anon during secretary signup
CREATE OR REPLACE FUNCTION public.find_doctor_by_code(_code TEXT)
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE short_code = upper(_code) LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.find_doctor_by_code(TEXT) TO anon, authenticated;

-- Update handle_new_user: generate short_code for doctors, resolve doctor_code for secretaries
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role public.app_role;
  _status public.account_status := 'pending';
  _doctor_id UUID;
  _doctor_code TEXT;
  _short_code TEXT;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'doctor');
  _doctor_id := NULLIF(NEW.raw_user_meta_data->>'doctor_id', '')::UUID;
  _doctor_code := NULLIF(NEW.raw_user_meta_data->>'doctor_code', '');

  -- Secretary may pass doctor_code instead of doctor_id
  IF _doctor_id IS NULL AND _doctor_code IS NOT NULL THEN
    SELECT id INTO _doctor_id FROM public.profiles WHERE short_code = upper(_doctor_code) LIMIT 1;
  END IF;

  IF NEW.email = 'amer87salam@gmail.com' THEN
    _role := 'admin';
    _status := 'approved';
  END IF;

  IF _role IN ('doctor','admin') THEN
    _short_code := public.generate_doctor_short_code();
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone, specialty, clinic_name, status, doctor_id, short_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'specialty',
    NEW.raw_user_meta_data->>'clinic_name',
    _status,
    _doctor_id,
    _short_code
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  IF _role = 'doctor' THEN
    INSERT INTO public.doctor_settings (doctor_id, doctor_name, specialty, clinic_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.raw_user_meta_data->>'specialty', ''), COALESCE(NEW.raw_user_meta_data->>'clinic_name', ''));
  END IF;

  RETURN NEW;
END;
$function$;

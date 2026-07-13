
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secretary_password TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

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
  _sec_password TEXT;
  _username TEXT;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'doctor');
  _doctor_id := NULLIF(NEW.raw_user_meta_data->>'doctor_id', '')::UUID;
  _doctor_code := NULLIF(NEW.raw_user_meta_data->>'doctor_code', '');
  _sec_password := NULLIF(NEW.raw_user_meta_data->>'secretary_password', '');
  _username := NULLIF(NEW.raw_user_meta_data->>'username', '');

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

  INSERT INTO public.profiles (id, full_name, email, phone, specialty, clinic_name, status, doctor_id, short_code, secretary_password, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'specialty',
    NEW.raw_user_meta_data->>'clinic_name',
    _status,
    _doctor_id,
    _short_code,
    CASE WHEN _role = 'secretary' THEN _sec_password ELSE NULL END,
    _username
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  IF _role = 'doctor' THEN
    INSERT INTO public.doctor_settings (doctor_id, doctor_name, specialty, clinic_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.raw_user_meta_data->>'specialty', ''), COALESCE(NEW.raw_user_meta_data->>'clinic_name', ''));
  END IF;

  RETURN NEW;
END;
$function$;

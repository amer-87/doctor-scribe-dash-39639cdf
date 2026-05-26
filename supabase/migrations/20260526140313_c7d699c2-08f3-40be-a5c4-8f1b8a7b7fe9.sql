
CREATE OR REPLACE FUNCTION public.generate_doctor_short_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
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

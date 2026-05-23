CREATE OR REPLACE FUNCTION public.set_subscription_start()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved' AND NEW.subscription_start IS NULL THEN
    NEW.subscription_start := now();
  END IF;
  RETURN NEW;
END;
$$;
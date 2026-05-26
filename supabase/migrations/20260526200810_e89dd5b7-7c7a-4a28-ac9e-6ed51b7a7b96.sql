
-- 1. Tighten prescriptions ALL policy to require doctor role
DROP POLICY IF EXISTS "Doctor manages own prescriptions" ON public.prescriptions;

CREATE POLICY "Doctor manages own prescriptions"
ON public.prescriptions
FOR ALL
TO authenticated
USING (doctor_id = auth.uid() AND public.has_role(auth.uid(), 'doctor'))
WITH CHECK (doctor_id = auth.uid() AND public.has_role(auth.uid(), 'doctor'));

-- 2. Restrict Realtime subscriptions: users may only subscribe to topics they own
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated may receive own profile topic" ON realtime.messages;

CREATE POLICY "Authenticated may receive own profile topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'profile-' || auth.uid()::text
);

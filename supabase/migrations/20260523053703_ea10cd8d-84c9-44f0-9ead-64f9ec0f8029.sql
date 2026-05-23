-- 1) Make attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'attachments';

-- 2) Replace attachments storage policies with ownership-scoped ones
DROP POLICY IF EXISTS "Public read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete attachments" ON storage.objects;

CREATE POLICY "Clinic members read attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments'
  AND public.is_approved(auth.uid())
  AND public.get_effective_doctor_id(((storage.foldername(name))[1])::uuid)
      = public.get_effective_doctor_id(auth.uid())
);

CREATE POLICY "Owner uploads attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND public.is_approved(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owner updates attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owner deletes attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3) Privilege escalation: remove self-insert into user_roles.
-- Roles are assigned only by the SECURITY DEFINER trigger handle_new_user.
DROP POLICY IF EXISTS "Users insert own role" ON public.user_roles;

-- 4) Approval gate on secretary patient mutations
DROP POLICY IF EXISTS "Secretary updates doctor patients" ON public.patients;
CREATE POLICY "Secretary updates doctor patients"
ON public.patients FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'secretary'::public.app_role)
  AND doctor_id = public.get_effective_doctor_id(auth.uid())
  AND public.can_write(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'secretary'::public.app_role)
  AND doctor_id = public.get_effective_doctor_id(auth.uid())
  AND public.can_write(auth.uid())
);

DROP POLICY IF EXISTS "Secretary deletes doctor patients" ON public.patients;
CREATE POLICY "Secretary deletes doctor patients"
ON public.patients FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'secretary'::public.app_role)
  AND doctor_id = public.get_effective_doctor_id(auth.uid())
  AND public.is_approved(auth.uid())
);

-- 5) Fix mutable search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 6) Revoke direct EXECUTE on internal SECURITY DEFINER helpers.
-- RLS still calls them internally; only direct RPC exposure is removed.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_subscription_valid(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_write(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_effective_doctor_id(uuid) FROM PUBLIC, anon, authenticated;
-- Keep verify_prescription callable (used by public verification page)
GRANT EXECUTE ON FUNCTION public.verify_prescription(uuid) TO anon, authenticated;
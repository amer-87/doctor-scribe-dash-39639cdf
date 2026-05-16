
-- Allow secretary to update/delete any patient under their effective doctor
DROP POLICY IF EXISTS "Secretary updates patients they added" ON public.patients;

CREATE POLICY "Secretary updates doctor patients"
ON public.patients FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'secretary'::app_role)
  AND doctor_id = get_effective_doctor_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'secretary'::app_role)
  AND doctor_id = get_effective_doctor_id(auth.uid())
);

CREATE POLICY "Secretary deletes doctor patients"
ON public.patients FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'secretary'::app_role)
  AND doctor_id = get_effective_doctor_id(auth.uid())
);

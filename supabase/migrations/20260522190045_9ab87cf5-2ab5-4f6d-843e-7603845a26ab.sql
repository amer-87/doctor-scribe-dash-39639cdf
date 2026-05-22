ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS visit_count integer NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_patients_doctor_phone ON public.patients(doctor_id, phone);
CREATE INDEX IF NOT EXISTS idx_patients_doctor_name ON public.patients(doctor_id, full_name);
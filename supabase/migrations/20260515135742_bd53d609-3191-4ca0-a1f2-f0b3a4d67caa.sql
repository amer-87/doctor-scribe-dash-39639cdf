
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS appointment_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  ADD COLUMN IF NOT EXISTS appointment_time time,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_patients_doctor_appt ON public.patients (doctor_id, appointment_date);

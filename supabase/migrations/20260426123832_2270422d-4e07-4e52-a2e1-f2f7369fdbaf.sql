-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients (name);
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients (status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_cpf_unique ON public.patients (cpf) WHERE cpf IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist ON public.appointments (dentist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments (date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments (status);

CREATE INDEX IF NOT EXISTS idx_dentists_cro ON public.dentists (cro);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles (user_id);

CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs (entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs (created_at DESC);
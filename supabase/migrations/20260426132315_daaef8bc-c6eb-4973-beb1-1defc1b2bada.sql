-- =====================================================================
-- FASE 3 — Procedimentos, Planos de Tratamento, Financeiro e Anexos
-- =====================================================================

-- ============== ENUMS ==============
CREATE TYPE public.procedure_status AS ENUM (
  'planejado', 'autorizado', 'em_execucao', 'realizado', 'cancelado'
);

CREATE TYPE public.treatment_plan_status AS ENUM (
  'rascunho', 'apresentado', 'aprovado', 'em_andamento', 'pausado', 'concluido', 'cancelado'
);

CREATE TYPE public.treatment_step_status AS ENUM (
  'pendente', 'em_andamento', 'concluida', 'cancelada'
);

CREATE TYPE public.financial_status AS ENUM (
  'pendente', 'pago', 'parcial', 'atrasado', 'cancelado', 'estornado'
);

CREATE TYPE public.payment_method AS ENUM (
  'dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia', 'convenio', 'outro'
);

CREATE TYPE public.attachment_category AS ENUM (
  'documento', 'exame', 'radiografia', 'imagem_clinica', 'contrato', 'outro'
);

-- ============== TREATMENT PLANS (criar antes de procedures por FK) ==============
CREATE TABLE public.treatment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  dentist_id UUID REFERENCES public.dentists(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (estimated_value >= 0),
  final_value NUMERIC(12,2) CHECK (final_value IS NULL OR final_value >= 0),
  status public.treatment_plan_status NOT NULL DEFAULT 'rascunho',
  start_date DATE,
  end_date DATE,
  approved_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_treatment_plans_patient ON public.treatment_plans(patient_id);
CREATE INDEX idx_treatment_plans_dentist ON public.treatment_plans(dentist_id);
CREATE INDEX idx_treatment_plans_status ON public.treatment_plans(status);

CREATE TRIGGER update_treatment_plans_updated_at
BEFORE UPDATE ON public.treatment_plans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinical staff can view treatment plans"
ON public.treatment_plans FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'dentist'::app_role)
  OR has_role(auth.uid(), 'receptionist'::app_role)
  OR has_role(auth.uid(), 'assistant'::app_role)
);

CREATE POLICY "Patient can view own treatment plans"
ON public.treatment_plans FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.patients p
  WHERE p.id = treatment_plans.patient_id AND p.user_id = auth.uid()
));

CREATE POLICY "Dentist/Admin can create treatment plans"
ON public.treatment_plans FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dentist'::app_role));

CREATE POLICY "Dentist/Admin can update treatment plans"
ON public.treatment_plans FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dentist'::app_role));

-- Hard delete forbidden — apenas cancelamento lógico

-- ============== TREATMENT PLAN STEPS ==============
CREATE TABLE public.treatment_plan_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treatment_plan_id UUID NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  status public.treatment_step_status NOT NULL DEFAULT 'pendente',
  expected_date DATE,
  completed_date DATE,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_treatment_steps_plan ON public.treatment_plan_steps(treatment_plan_id);
CREATE INDEX idx_treatment_steps_status ON public.treatment_plan_steps(status);

CREATE TRIGGER update_treatment_steps_updated_at
BEFORE UPDATE ON public.treatment_plan_steps
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.treatment_plan_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinical staff can view steps"
ON public.treatment_plan_steps FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'dentist'::app_role)
  OR has_role(auth.uid(), 'receptionist'::app_role)
  OR has_role(auth.uid(), 'assistant'::app_role)
);

CREATE POLICY "Patient can view own plan steps"
ON public.treatment_plan_steps FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.treatment_plans tp
  JOIN public.patients p ON p.id = tp.patient_id
  WHERE tp.id = treatment_plan_steps.treatment_plan_id AND p.user_id = auth.uid()
));

CREATE POLICY "Dentist/Admin can manage steps"
ON public.treatment_plan_steps FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dentist'::app_role));

CREATE POLICY "Dentist/Admin can update steps"
ON public.treatment_plan_steps FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dentist'::app_role));

CREATE POLICY "Dentist/Admin can delete steps"
ON public.treatment_plan_steps FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dentist'::app_role));

-- ============== PROCEDURES ==============
CREATE TABLE public.procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  dentist_id UUID NOT NULL REFERENCES public.dentists(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  treatment_plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE SET NULL,
  tooth_number INTEGER,
  tooth_face TEXT,
  name TEXT NOT NULL,
  description TEXT,
  value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  status public.procedure_status NOT NULL DEFAULT 'planejado',
  planned_date DATE,
  performed_date DATE,
  cancelled_reason TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_procedures_patient ON public.procedures(patient_id);
CREATE INDEX idx_procedures_dentist ON public.procedures(dentist_id);
CREATE INDEX idx_procedures_appointment ON public.procedures(appointment_id);
CREATE INDEX idx_procedures_plan ON public.procedures(treatment_plan_id);
CREATE INDEX idx_procedures_status ON public.procedures(status);
CREATE INDEX idx_procedures_performed_date ON public.procedures(performed_date);

CREATE TRIGGER update_procedures_updated_at
BEFORE UPDATE ON public.procedures
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinical staff can view procedures"
ON public.procedures FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'dentist'::app_role)
  OR has_role(auth.uid(), 'receptionist'::app_role)
  OR has_role(auth.uid(), 'assistant'::app_role)
);

CREATE POLICY "Patient can view own procedures"
ON public.procedures FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.patients p
  WHERE p.id = procedures.patient_id AND p.user_id = auth.uid()
));

CREATE POLICY "Dentist/Admin can create procedures"
ON public.procedures FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dentist'::app_role));

CREATE POLICY "Dentist/Admin can update procedures"
ON public.procedures FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dentist'::app_role));

CREATE POLICY "Only admin can delete procedures"
ON public.procedures FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND status <> 'realizado');

-- ============== FINANCIAL RECORDS ==============
CREATE TABLE public.financial_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  procedure_id UUID REFERENCES public.procedures(id) ON DELETE SET NULL,
  treatment_plan_id UUID REFERENCES public.treatment_plans(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  original_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (original_value >= 0),
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_value >= 0),
  final_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (final_value >= 0),
  paid_value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_value >= 0),
  remaining_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method public.payment_method,
  status public.financial_status NOT NULL DEFAULT 'pendente',
  due_date DATE,
  payment_date DATE,
  received_by UUID,
  cancelled_reason TEXT,
  refunded_reason TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_financial_patient ON public.financial_records(patient_id);
CREATE INDEX idx_financial_status ON public.financial_records(status);
CREATE INDEX idx_financial_due_date ON public.financial_records(due_date);
CREATE INDEX idx_financial_payment_date ON public.financial_records(payment_date);
CREATE INDEX idx_financial_method ON public.financial_records(payment_method);

CREATE TRIGGER update_financial_updated_at
BEFORE UPDATE ON public.financial_records
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view financial records"
ON public.financial_records FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'dentist'::app_role)
  OR has_role(auth.uid(), 'receptionist'::app_role)
);

CREATE POLICY "Patient can view own financial"
ON public.financial_records FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.patients p
  WHERE p.id = financial_records.patient_id AND p.user_id = auth.uid()
));

CREATE POLICY "Staff can create financial records"
ON public.financial_records FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'dentist'::app_role)
  OR has_role(auth.uid(), 'receptionist'::app_role)
);

CREATE POLICY "Staff can update financial records"
ON public.financial_records FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'dentist'::app_role)
  OR has_role(auth.uid(), 'receptionist'::app_role)
);

CREATE POLICY "Only admin can delete unpaid financial"
ON public.financial_records FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND status NOT IN ('pago', 'parcial'));

-- ============== ATTACHMENTS ==============
CREATE TABLE public.attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES public.medical_records(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  category public.attachment_category NOT NULL DEFAULT 'documento',
  released_to_patient BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_patient ON public.attachments(patient_id);
CREATE INDEX idx_attachments_record ON public.attachments(medical_record_id);
CREATE INDEX idx_attachments_category ON public.attachments(category);
CREATE INDEX idx_attachments_active ON public.attachments(active);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view attachments"
ON public.attachments FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'dentist'::app_role)
  OR has_role(auth.uid(), 'assistant'::app_role)
  OR has_role(auth.uid(), 'receptionist'::app_role)
);

CREATE POLICY "Patient can view released attachments"
ON public.attachments FOR SELECT TO authenticated
USING (
  released_to_patient = true
  AND active = true
  AND EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = attachments.patient_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Clinical staff can upload attachments"
ON public.attachments FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'dentist'::app_role)
  OR has_role(auth.uid(), 'assistant'::app_role)
  OR has_role(auth.uid(), 'receptionist'::app_role)
);

CREATE POLICY "Clinical staff can update attachments"
ON public.attachments FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'dentist'::app_role)
  OR has_role(auth.uid(), 'assistant'::app_role)
);

-- ============== STORAGE BUCKET ==============
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-attachments', 'patient-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies — staff can upload/read; patients see only released (gate via signed URLs)
CREATE POLICY "Staff can read patient attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'patient-attachments'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'dentist'::app_role)
    OR has_role(auth.uid(), 'assistant'::app_role)
    OR has_role(auth.uid(), 'receptionist'::app_role)
  )
);

CREATE POLICY "Staff can upload patient attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'patient-attachments'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'dentist'::app_role)
    OR has_role(auth.uid(), 'assistant'::app_role)
    OR has_role(auth.uid(), 'receptionist'::app_role)
  )
);

CREATE POLICY "Admin can delete patient attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'patient-attachments'
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Patient can read own released attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'patient-attachments'
  AND EXISTS (
    SELECT 1 FROM public.attachments a
    JOIN public.patients p ON p.id = a.patient_id
    WHERE a.file_path = storage.objects.name
      AND a.released_to_patient = true
      AND a.active = true
      AND p.user_id = auth.uid()
  )
);
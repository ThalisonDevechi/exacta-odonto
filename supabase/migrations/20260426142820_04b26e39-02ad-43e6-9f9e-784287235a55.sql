
-- =========================================================
-- FASE 5: Configurações da clínica
-- =========================================================
CREATE TABLE public.clinic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name text NOT NULL,
  trade_name text,
  cnpj text,
  phone text,
  whatsapp text,
  email text,
  cep text,
  address text,
  number text,
  district text,
  city text,
  state text,
  logo_url text,
  logo_path text,
  responsible_name text,
  responsible_cro text,
  opening_hours text,
  document_footer text,
  default_budget_validity_days integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view clinic settings"
  ON public.clinic_settings FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'dentist'::app_role)
    OR has_role(auth.uid(), 'receptionist'::app_role)
    OR has_role(auth.uid(), 'assistant'::app_role)
  );

CREATE POLICY "Admins can insert clinic settings"
  ON public.clinic_settings FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update clinic settings"
  ON public.clinic_settings FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete clinic settings"
  ON public.clinic_settings FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_clinic_settings_updated_at
  BEFORE UPDATE ON public.clinic_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- FASE 5: Modelos de mensagens
-- =========================================================
CREATE TYPE public.message_template_type AS ENUM (
  'confirmacao_consulta', 'lembrete_consulta', 'cobranca',
  'orcamento', 'recibo', 'retorno_pos_atendimento', 'aniversario', 'outro'
);

CREATE TYPE public.message_channel AS ENUM (
  'whatsapp', 'email', 'sms', 'outro'
);

CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.message_template_type NOT NULL DEFAULT 'outro',
  channel public.message_channel NOT NULL DEFAULT 'whatsapp',
  subject text,
  body text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view templates"
  ON public.message_templates FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'dentist'::app_role)
    OR has_role(auth.uid(), 'receptionist'::app_role)
    OR has_role(auth.uid(), 'assistant'::app_role)
  );

CREATE POLICY "Admins manage templates insert"
  ON public.message_templates FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage templates update"
  ON public.message_templates FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage templates delete"
  ON public.message_templates FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- FASE 5: Sequências de numeração (orçamento e recibo, ano-corrente)
-- =========================================================
CREATE TABLE public.document_sequences (
  doc_type text NOT NULL,
  year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (doc_type, year)
);

ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;
-- (sem políticas: acessada exclusivamente por funções SECURITY DEFINER)

CREATE OR REPLACE FUNCTION public.next_document_number(_doc_type text, _prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year integer := EXTRACT(YEAR FROM now())::int;
  _next integer;
BEGIN
  INSERT INTO public.document_sequences (doc_type, year, last_number)
  VALUES (_doc_type, _year, 1)
  ON CONFLICT (doc_type, year)
  DO UPDATE SET last_number = public.document_sequences.last_number + 1
  RETURNING last_number INTO _next;

  RETURN _prefix || '-' || _year::text || '-' || lpad(_next::text, 4, '0');
END;
$$;

-- =========================================================
-- FASE 5: Orçamentos
-- =========================================================
CREATE TYPE public.budget_status AS ENUM (
  'rascunho', 'emitido', 'aceito', 'recusado', 'vencido', 'cancelado'
);

CREATE TABLE public.treatment_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  treatment_plan_id uuid,
  dentist_id uuid,
  budget_number text UNIQUE,
  title text NOT NULL,
  description text,
  subtotal numeric NOT NULL DEFAULT 0,
  discount_value numeric NOT NULL DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  validity_date date,
  status public.budget_status NOT NULL DEFAULT 'rascunho',
  notes text,
  released_to_patient boolean NOT NULL DEFAULT false,
  accepted_at timestamptz,
  cancelled_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.treatment_budgets(id) ON DELETE CASCADE,
  description text NOT NULL,
  tooth_number integer,
  quantity numeric NOT NULL DEFAULT 1,
  unit_value numeric NOT NULL DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.treatment_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

-- Trigger: gera budget_number ao mudar para emitido
CREATE OR REPLACE FUNCTION public.assign_budget_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.budget_number IS NULL AND NEW.status <> 'rascunho' THEN
    NEW.budget_number := public.next_document_number('budget', 'ORC');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_budget_number
  BEFORE INSERT OR UPDATE ON public.treatment_budgets
  FOR EACH ROW EXECUTE FUNCTION public.assign_budget_number();

CREATE TRIGGER trg_treatment_budgets_updated_at
  BEFORE UPDATE ON public.treatment_budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS treatment_budgets
CREATE POLICY "Staff can view budgets"
  ON public.treatment_budgets FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'dentist'::app_role)
    OR has_role(auth.uid(), 'receptionist'::app_role)
    OR has_role(auth.uid(), 'assistant'::app_role)
  );

CREATE POLICY "Patient can view own released budgets"
  ON public.treatment_budgets FOR SELECT TO authenticated
  USING (
    released_to_patient = true
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = treatment_budgets.patient_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Dentist/Admin can create budgets"
  ON public.treatment_budgets FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'dentist'::app_role)
  );

CREATE POLICY "Dentist/Admin can update budgets"
  ON public.treatment_budgets FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'dentist'::app_role)
  );

CREATE POLICY "Admin can delete non-accepted budgets"
  ON public.treatment_budgets FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND status <> 'aceito'
  );

-- RLS budget_items
CREATE POLICY "Staff can view budget items"
  ON public.budget_items FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'dentist'::app_role)
    OR has_role(auth.uid(), 'receptionist'::app_role)
    OR has_role(auth.uid(), 'assistant'::app_role)
  );

CREATE POLICY "Patient can view items of own released budgets"
  ON public.budget_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.treatment_budgets b
      JOIN public.patients p ON p.id = b.patient_id
      WHERE b.id = budget_items.budget_id
        AND b.released_to_patient = true
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Dentist/Admin can manage budget items insert"
  ON public.budget_items FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'dentist'::app_role)
  );

CREATE POLICY "Dentist/Admin can manage budget items update"
  ON public.budget_items FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'dentist'::app_role)
  );

CREATE POLICY "Dentist/Admin can manage budget items delete"
  ON public.budget_items FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'dentist'::app_role)
  );

-- =========================================================
-- FASE 5: Recibos
-- =========================================================
CREATE TABLE public.payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_record_id uuid NOT NULL REFERENCES public.financial_records(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  receipt_number text UNIQUE,
  amount numeric NOT NULL DEFAULT 0,
  payment_method public.payment_method,
  payment_date date,
  description text,
  notes text,
  released_to_patient boolean NOT NULL DEFAULT false,
  issued_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.assign_receipt_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.receipt_number IS NULL THEN
    NEW.receipt_number := public.next_document_number('receipt', 'REC');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_receipt_number
  BEFORE INSERT ON public.payment_receipts
  FOR EACH ROW EXECUTE FUNCTION public.assign_receipt_number();

CREATE POLICY "Staff can view receipts"
  ON public.payment_receipts FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'dentist'::app_role)
    OR has_role(auth.uid(), 'receptionist'::app_role)
  );

CREATE POLICY "Patient can view released receipts"
  ON public.payment_receipts FOR SELECT TO authenticated
  USING (
    released_to_patient = true
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = payment_receipts.patient_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin/Receptionist can create receipts"
  ON public.payment_receipts FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'receptionist'::app_role)
    OR has_role(auth.uid(), 'dentist'::app_role)
  );

CREATE POLICY "Admin can delete receipts"
  ON public.payment_receipts FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- FASE 5: Confirmação de consulta
-- =========================================================
CREATE TYPE public.appointment_confirmation_status AS ENUM (
  'pendente', 'confirmada', 'recusada', 'sem_resposta'
);

CREATE TYPE public.communication_channel AS ENUM (
  'whatsapp', 'telefone', 'presencial', 'email', 'sms', 'outro'
);

ALTER TABLE public.appointments
  ADD COLUMN confirmation_status public.appointment_confirmation_status NOT NULL DEFAULT 'pendente',
  ADD COLUMN confirmation_channel public.communication_channel,
  ADD COLUMN confirmed_at timestamptz,
  ADD COLUMN confirmed_by uuid,
  ADD COLUMN confirmation_notes text;

-- =========================================================
-- FASE 5: Storage bucket clinic-assets (logo)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-assets', 'clinic-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read clinic-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'clinic-assets');

CREATE POLICY "Admin upload clinic-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-assets'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin update clinic-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'clinic-assets'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admin delete clinic-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'clinic-assets'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

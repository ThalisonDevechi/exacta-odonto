-- Enums
CREATE TYPE public.reminder_type AS ENUM ('vinte_quatro_horas_antes', 'no_dia', 'personalizado');
CREATE TYPE public.reminder_status AS ENUM ('pendente', 'preparado', 'enviado_manual', 'cancelado', 'falhou');
CREATE TYPE public.communication_type AS ENUM (
  'lembrete_consulta',
  'confirmacao_consulta',
  'cobranca',
  'envio_orcamento',
  'envio_recibo',
  'retorno_pos_atendimento',
  'atendimento_manual',
  'outro'
);
CREATE TYPE public.communication_direction AS ENUM ('enviada', 'recebida');
CREATE TYPE public.communication_status AS ENUM ('registrada', 'enviada_manual', 'sem_resposta', 'respondida', 'falhou');

-- appointment_reminders
CREATE TABLE public.appointment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  reminder_type public.reminder_type NOT NULL DEFAULT 'personalizado',
  channel public.communication_channel NOT NULL DEFAULT 'whatsapp',
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status public.reminder_status NOT NULL DEFAULT 'pendente',
  message TEXT,
  cancelled_reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminders_appointment ON public.appointment_reminders(appointment_id);
CREATE INDEX idx_reminders_patient ON public.appointment_reminders(patient_id);
CREATE INDEX idx_reminders_status ON public.appointment_reminders(status);
CREATE INDEX idx_reminders_scheduled ON public.appointment_reminders(scheduled_for);

ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view reminders"
ON public.appointment_reminders FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'receptionist') OR
  public.has_role(auth.uid(), 'dentist') OR
  public.has_role(auth.uid(), 'assistant')
);

CREATE POLICY "Admin/Receptionist/Dentist can create reminders"
ON public.appointment_reminders FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'receptionist') OR
  public.has_role(auth.uid(), 'dentist')
);

CREATE POLICY "Admin/Receptionist/Dentist can update reminders"
ON public.appointment_reminders FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'receptionist') OR
  public.has_role(auth.uid(), 'dentist')
);

CREATE POLICY "Only admin can delete reminders"
ON public.appointment_reminders FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_appointment_reminders_updated_at
BEFORE UPDATE ON public.appointment_reminders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- communication_logs
CREATE TABLE public.communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  financial_record_id UUID REFERENCES public.financial_records(id) ON DELETE SET NULL,
  budget_id UUID REFERENCES public.treatment_budgets(id) ON DELETE SET NULL,
  receipt_id UUID REFERENCES public.payment_receipts(id) ON DELETE SET NULL,
  reminder_id UUID REFERENCES public.appointment_reminders(id) ON DELETE SET NULL,
  channel public.communication_channel NOT NULL DEFAULT 'whatsapp',
  type public.communication_type NOT NULL DEFAULT 'atendimento_manual',
  direction public.communication_direction NOT NULL DEFAULT 'enviada',
  message TEXT,
  status public.communication_status NOT NULL DEFAULT 'registrada',
  responsible_user_id UUID,
  responsible_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comm_logs_patient ON public.communication_logs(patient_id);
CREATE INDEX idx_comm_logs_appointment ON public.communication_logs(appointment_id);
CREATE INDEX idx_comm_logs_created_at ON public.communication_logs(created_at DESC);

ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view communication logs"
ON public.communication_logs FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'receptionist') OR
  public.has_role(auth.uid(), 'dentist') OR
  public.has_role(auth.uid(), 'assistant')
);

CREATE POLICY "Admin/Receptionist/Dentist can create communication logs"
ON public.communication_logs FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'receptionist') OR
  public.has_role(auth.uid(), 'dentist')
);

CREATE POLICY "Only admin can update communication logs"
ON public.communication_logs FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
-- Correções de segurança/regressão:
-- 1) Paciente inativo deixa de enxergar dados pelo portal/RLS.
-- 2) Prontuário do paciente só fica visível ao próprio paciente quando liberado.
-- 3) Agendamentos não podem sobrepor horários do mesmo dentista.
-- 4) Agendamentos não podem ser criados/alterados para paciente inativo.

-- =========================
-- Paciente só vê próprio cadastro se estiver ativo
-- =========================
DROP POLICY IF EXISTS "Patients can view their own record" ON public.patients;
CREATE POLICY "Patients can view their own active record"
  ON public.patients FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND status = 'active'::public.patient_status);

-- =========================
-- Agendamentos
-- =========================
DROP POLICY IF EXISTS "Patients can view own appointments" ON public.appointments;
CREATE POLICY "Patients can view own active appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.patients p
      WHERE p.id = appointments.patient_id
        AND p.user_id = auth.uid()
        AND p.status = 'active'::public.patient_status
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_appointment_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'Horário final deve ser posterior ao inicial.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = NEW.patient_id
      AND p.status = 'active'::public.patient_status
  ) THEN
    RAISE EXCEPTION 'Não é permitido agendar paciente inativo.';
  END IF;

  IF NEW.status <> 'cancelled'::public.appointment_status AND EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND a.dentist_id = NEW.dentist_id
      AND a.date = NEW.date
      AND a.status <> 'cancelled'::public.appointment_status
      AND a.start_time < NEW.end_time
      AND a.end_time > NEW.start_time
  ) THEN
    RAISE EXCEPTION 'Conflito de horário: este dentista já tem agendamento neste período.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_appointment_integrity ON public.appointments;
CREATE TRIGGER trg_enforce_appointment_integrity
  BEFORE INSERT OR UPDATE OF patient_id, dentist_id, date, start_time, end_time, status
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_appointment_integrity();

-- =========================
-- Prontuário médico
-- =========================
DROP POLICY IF EXISTS "Patient can view own record" ON public.medical_records;
CREATE POLICY "Patient can view own released active record"
  ON public.medical_records FOR SELECT TO authenticated
  USING (
    released_to_patient = true
    AND EXISTS (
      SELECT 1
      FROM public.patients p
      WHERE p.id = medical_records.patient_id
        AND p.user_id = auth.uid()
        AND p.status = 'active'::public.patient_status
    )
  );

-- =========================
-- Evoluções clínicas
-- =========================
DROP POLICY IF EXISTS "Patient can view released evolutions" ON public.clinical_evolutions;
CREATE POLICY "Patient can view released active evolutions"
  ON public.clinical_evolutions FOR SELECT TO authenticated
  USING (
    released_to_patient = true
    AND status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.patients p
      WHERE p.id = clinical_evolutions.patient_id
        AND p.user_id = auth.uid()
        AND p.status = 'active'::public.patient_status
    )
  );

-- =========================
-- Odontograma e dentes/faces
-- =========================
DROP POLICY IF EXISTS "Patient can view own odontogram" ON public.odontograms;
CREATE POLICY "Patient can view own active odontogram"
  ON public.odontograms FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = odontograms.patient_id
        AND p.user_id = auth.uid()
        AND p.status = 'active'::public.patient_status
    )
  );

DROP POLICY IF EXISTS "Patient can view own teeth" ON public.odontogram_teeth;
CREATE POLICY "Patient can view own active teeth"
  ON public.odontogram_teeth FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = odontogram_teeth.patient_id
        AND p.user_id = auth.uid()
        AND p.status = 'active'::public.patient_status
    )
  );

DROP POLICY IF EXISTS "Patient can view own faces" ON public.tooth_faces;
CREATE POLICY "Patient can view own active faces"
  ON public.tooth_faces FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.odontogram_teeth t
      JOIN public.patients p ON p.id = t.patient_id
      WHERE t.id = tooth_faces.tooth_id
        AND p.user_id = auth.uid()
        AND p.status = 'active'::public.patient_status
    )
  );

-- =========================
-- Planos/procedimentos/financeiro do portal
-- =========================
DROP POLICY IF EXISTS "Patient can view own treatment plans" ON public.treatment_plans;
CREATE POLICY "Patient can view own active treatment plans"
  ON public.treatment_plans FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = treatment_plans.patient_id
        AND p.user_id = auth.uid()
        AND p.status = 'active'::public.patient_status
    )
  );

DROP POLICY IF EXISTS "Patient can view own plan steps" ON public.treatment_plan_steps;
CREATE POLICY "Patient can view own active plan steps"
  ON public.treatment_plan_steps FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.treatment_plans tp
      JOIN public.patients p ON p.id = tp.patient_id
      WHERE tp.id = treatment_plan_steps.treatment_plan_id
        AND p.user_id = auth.uid()
        AND p.status = 'active'::public.patient_status
    )
  );

DROP POLICY IF EXISTS "Patient can view own procedures" ON public.procedures;
CREATE POLICY "Patient can view own active procedures"
  ON public.procedures FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = procedures.patient_id
        AND p.user_id = auth.uid()
        AND p.status = 'active'::public.patient_status
    )
  );

DROP POLICY IF EXISTS "Patient can view own financial" ON public.financial_records;
CREATE POLICY "Patient can view own active financial"
  ON public.financial_records FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = financial_records.patient_id
        AND p.user_id = auth.uid()
        AND p.status = 'active'::public.patient_status
    )
  );

-- =========================
-- Anexos / storage
-- =========================
DROP POLICY IF EXISTS "Patient can view released attachments" ON public.attachments;
CREATE POLICY "Patient can view released active attachments"
  ON public.attachments FOR SELECT TO authenticated
  USING (
    released_to_patient = true
    AND active = true
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = attachments.patient_id
        AND p.user_id = auth.uid()
        AND p.status = 'active'::public.patient_status
    )
  );

DROP POLICY IF EXISTS "Patient can read own released attachments" ON storage.objects;
CREATE POLICY "Patient can read own released active attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'patient-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.attachments a
    JOIN public.patients p ON p.id = a.patient_id
    WHERE a.file_path = storage.objects.name
      AND a.released_to_patient = true
      AND a.active = true
      AND p.user_id = auth.uid()
      AND p.status = 'active'::public.patient_status
  )
);

-- =========================
-- Orçamentos / recibos liberados ao paciente
-- =========================
DROP POLICY IF EXISTS "Patient can view own released budgets" ON public.treatment_budgets;
CREATE POLICY "Patient can view own released active budgets"
  ON public.treatment_budgets FOR SELECT TO authenticated
  USING (
    released_to_patient = true
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = treatment_budgets.patient_id
        AND p.user_id = auth.uid()
        AND p.status = 'active'::public.patient_status
    )
  );

DROP POLICY IF EXISTS "Patient can view items of own released budgets" ON public.budget_items;
CREATE POLICY "Patient can view items of own released active budgets"
  ON public.budget_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.treatment_budgets b
      JOIN public.patients p ON p.id = b.patient_id
      WHERE b.id = budget_items.budget_id
        AND b.released_to_patient = true
        AND p.user_id = auth.uid()
        AND p.status = 'active'::public.patient_status
    )
  );

DROP POLICY IF EXISTS "Patient can view released receipts" ON public.payment_receipts;
CREATE POLICY "Patient can view released active receipts"
  ON public.payment_receipts FOR SELECT TO authenticated
  USING (
    released_to_patient = true
    AND EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = payment_receipts.patient_id
        AND p.user_id = auth.uid()
        AND p.status = 'active'::public.patient_status
    )
  );

-- 1. Add released_to_patient to medical_records
ALTER TABLE public.medical_records
  ADD COLUMN IF NOT EXISTS released_to_patient boolean NOT NULL DEFAULT false;

-- 2. ENUMs
DO $$ BEGIN
  CREATE TYPE public.evolution_status AS ENUM ('active','rectified','cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.dentition_type AS ENUM ('deciduous','mixed','permanent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.tooth_kind AS ENUM ('deciduous','permanent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.tooth_status AS ENUM (
    'integro','cariado','restaurado','ausente','extraido',
    'indicado_para_extracao','tratamento_endodontico','coroa','implante',
    'protese','selante','fraturado','incluso','em_erupcao','nao_erupcionado',
    'mobilidade','outro'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.tooth_face_type AS ENUM (
    'vestibular','lingual','palatina','mesial','distal',
    'oclusal','incisal','cervical','raiz'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.face_condition AS ENUM (
    'normal','carie','restauracao','restauracao_infiltrada','fratura',
    'desgaste','mancha','selante','tratamento_indicado','tratamento_realizado','outro'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. clinical_evolutions
CREATE TABLE IF NOT EXISTS public.clinical_evolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id uuid NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  professional_id uuid NOT NULL,
  professional_name text,
  description text NOT NULL,
  status public.evolution_status NOT NULL DEFAULT 'active',
  original_text text,
  rectification_reason text,
  released_to_patient boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_evolutions_patient ON public.clinical_evolutions(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_evolutions_record ON public.clinical_evolutions(medical_record_id);
CREATE INDEX IF NOT EXISTS idx_clinical_evolutions_appointment ON public.clinical_evolutions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_clinical_evolutions_created ON public.clinical_evolutions(created_at DESC);

ALTER TABLE public.clinical_evolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinical staff can view evolutions"
  ON public.clinical_evolutions FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'dentist') OR has_role(auth.uid(),'assistant'));

CREATE POLICY "Patient can view released evolutions"
  ON public.clinical_evolutions FOR SELECT TO authenticated
  USING (released_to_patient = true AND EXISTS (
    SELECT 1 FROM public.patients p WHERE p.id = clinical_evolutions.patient_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Dentist/Admin/Assistant can create evolutions"
  ON public.clinical_evolutions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'dentist') OR has_role(auth.uid(),'assistant'));

CREATE POLICY "Dentist/Admin can update evolutions"
  ON public.clinical_evolutions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'dentist'));

-- No DELETE policy: cannot be hard-deleted

CREATE TRIGGER set_updated_at_clinical_evolutions
  BEFORE UPDATE ON public.clinical_evolutions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. odontograms (one per patient)
CREATE TABLE IF NOT EXISTS public.odontograms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  dentition_type public.dentition_type NOT NULL DEFAULT 'permanent',
  defined_automatically boolean NOT NULL DEFAULT true,
  manually_changed boolean NOT NULL DEFAULT false,
  change_justification text,
  professional_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_odontograms_patient ON public.odontograms(patient_id);

ALTER TABLE public.odontograms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinical staff can view odontograms"
  ON public.odontograms FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'dentist') OR has_role(auth.uid(),'assistant') OR has_role(auth.uid(),'receptionist'));

CREATE POLICY "Patient can view own odontogram"
  ON public.odontograms FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = odontograms.patient_id AND p.user_id = auth.uid()));

CREATE POLICY "Dentist/Admin can create odontograms"
  ON public.odontograms FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'dentist'));

CREATE POLICY "Dentist/Admin can update odontograms"
  ON public.odontograms FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'dentist'));

CREATE TRIGGER set_updated_at_odontograms
  BEFORE UPDATE ON public.odontograms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. odontogram_teeth
CREATE TABLE IF NOT EXISTS public.odontogram_teeth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  odontogram_id uuid NOT NULL REFERENCES public.odontograms(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  tooth_number int NOT NULL,
  tooth_kind public.tooth_kind NOT NULL,
  quadrant int NOT NULL,
  status public.tooth_status NOT NULL DEFAULT 'integro',
  observation text,
  professional_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (odontogram_id, tooth_number)
);

CREATE INDEX IF NOT EXISTS idx_odontogram_teeth_odontogram ON public.odontogram_teeth(odontogram_id);
CREATE INDEX IF NOT EXISTS idx_odontogram_teeth_patient ON public.odontogram_teeth(patient_id);

ALTER TABLE public.odontogram_teeth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinical staff can view teeth"
  ON public.odontogram_teeth FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'dentist') OR has_role(auth.uid(),'assistant') OR has_role(auth.uid(),'receptionist'));

CREATE POLICY "Patient can view own teeth"
  ON public.odontogram_teeth FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = odontogram_teeth.patient_id AND p.user_id = auth.uid()));

CREATE POLICY "Dentist/Admin can manage teeth"
  ON public.odontogram_teeth FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'dentist'));

CREATE POLICY "Dentist/Admin can update teeth"
  ON public.odontogram_teeth FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'dentist'));

CREATE TRIGGER set_updated_at_odontogram_teeth
  BEFORE UPDATE ON public.odontogram_teeth
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. tooth_faces
CREATE TABLE IF NOT EXISTS public.tooth_faces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tooth_id uuid NOT NULL REFERENCES public.odontogram_teeth(id) ON DELETE CASCADE,
  face public.tooth_face_type NOT NULL,
  condition public.face_condition NOT NULL DEFAULT 'normal',
  planned_procedure text,
  performed_procedure text,
  observation text,
  professional_id uuid,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tooth_id, face)
);

CREATE INDEX IF NOT EXISTS idx_tooth_faces_tooth ON public.tooth_faces(tooth_id);

ALTER TABLE public.tooth_faces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinical staff can view faces"
  ON public.tooth_faces FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'dentist') OR has_role(auth.uid(),'assistant') OR has_role(auth.uid(),'receptionist'));

CREATE POLICY "Patient can view own faces"
  ON public.tooth_faces FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.odontogram_teeth t
    JOIN public.patients p ON p.id = t.patient_id
    WHERE t.id = tooth_faces.tooth_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Dentist/Admin can create faces"
  ON public.tooth_faces FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'dentist'));

CREATE POLICY "Dentist/Admin can update faces"
  ON public.tooth_faces FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'dentist'));

CREATE POLICY "Dentist/Admin can delete faces"
  ON public.tooth_faces FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'dentist'));

CREATE TRIGGER set_updated_at_tooth_faces
  BEFORE UPDATE ON public.tooth_faces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
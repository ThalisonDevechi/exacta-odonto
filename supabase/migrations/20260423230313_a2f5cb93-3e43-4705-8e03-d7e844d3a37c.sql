
-- ========== ENUMS ==========
CREATE TYPE public.app_role AS ENUM ('admin', 'receptionist', 'dentist', 'assistant', 'patient');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'blocked');
CREATE TYPE public.patient_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE public.gender_type AS ENUM ('M', 'F', 'O');
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'missed', 'rescheduled');

-- ========== PROFILES ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  status public.user_status NOT NULL DEFAULT 'active',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ========== USER_ROLES ==========
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ========== HAS_ROLE FUNCTION ==========
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ========== UPDATED_AT TRIGGER ==========
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ========== HANDLE NEW USER ==========
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );
  -- Default role: patient (admin can promote later)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'patient');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== PATIENTS ==========
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT UNIQUE,
  rg TEXT,
  birth_date DATE NOT NULL,
  gender public.gender_type,
  phone TEXT,
  email TEXT,
  zip_code TEXT,
  address TEXT,
  address_number TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  guardian_name TEXT,
  guardian_cpf TEXT,
  guardian_phone TEXT,
  guardian_relationship TEXT,
  notes TEXT,
  status public.patient_status NOT NULL DEFAULT 'active',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_patients_name ON public.patients(name);
CREATE INDEX idx_patients_cpf ON public.patients(cpf);
CREATE INDEX idx_patients_user_id ON public.patients(user_id);

-- ========== DENTISTS ==========
CREATE TABLE public.dentists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT,
  cro TEXT NOT NULL UNIQUE,
  phone TEXT,
  email TEXT,
  status public.user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dentists ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER dentists_updated_at BEFORE UPDATE ON public.dentists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== APPOINTMENTS ==========
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  dentist_id UUID NOT NULL REFERENCES public.dentists(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  appointment_type TEXT,
  notes TEXT,
  cancellation_reason TEXT,
  status public.appointment_status NOT NULL DEFAULT 'scheduled',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_appointments_date ON public.appointments(date);
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX idx_appointments_dentist ON public.appointments(dentist_id);

-- ========== MEDICAL RECORDS ==========
CREATE TABLE public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  chief_complaint TEXT,
  medical_history TEXT,
  allergies TEXT,
  medications TEXT,
  diagnosis TEXT,
  treatment_plan_summary TEXT,
  clinical_notes TEXT,
  last_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER medical_records_updated_at BEFORE UPDATE ON public.medical_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== RLS POLICIES ==========

-- PROFILES
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PATIENTS
CREATE POLICY "Staff can view all patients"
  ON public.patients FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'receptionist') OR
    public.has_role(auth.uid(), 'dentist') OR
    public.has_role(auth.uid(), 'assistant')
  );
CREATE POLICY "Patients can view their own record"
  ON public.patients FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admin/Receptionist/Dentist can create patients"
  ON public.patients FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'receptionist') OR
    public.has_role(auth.uid(), 'dentist')
  );
CREATE POLICY "Admin/Receptionist/Dentist can edit patients"
  ON public.patients FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'receptionist') OR
    public.has_role(auth.uid(), 'dentist')
  );
CREATE POLICY "Only admins can delete patients"
  ON public.patients FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- DENTISTS
CREATE POLICY "Authenticated users can view dentists"
  ON public.dentists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage dentists"
  ON public.dentists FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- APPOINTMENTS
CREATE POLICY "Staff can view all appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'receptionist') OR
    public.has_role(auth.uid(), 'dentist') OR
    public.has_role(auth.uid(), 'assistant')
  );
CREATE POLICY "Patients can view own appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = appointments.patient_id AND user_id = auth.uid())
  );
CREATE POLICY "Admin/Receptionist/Dentist can create appointments"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'receptionist') OR
    public.has_role(auth.uid(), 'dentist')
  );
CREATE POLICY "Admin/Receptionist/Dentist can update appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'receptionist') OR
    public.has_role(auth.uid(), 'dentist')
  );
CREATE POLICY "Only admin can delete appointments"
  ON public.appointments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- MEDICAL RECORDS
CREATE POLICY "Clinical staff can view records"
  ON public.medical_records FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dentist') OR
    public.has_role(auth.uid(), 'assistant')
  );
CREATE POLICY "Patient can view own record"
  ON public.medical_records FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = medical_records.patient_id AND user_id = auth.uid())
  );
CREATE POLICY "Admin/Dentist/Assistant can create records"
  ON public.medical_records FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dentist') OR
    public.has_role(auth.uid(), 'assistant')
  );
CREATE POLICY "Admin/Dentist/Assistant can update records"
  ON public.medical_records FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'dentist') OR
    public.has_role(auth.uid(), 'assistant')
  );

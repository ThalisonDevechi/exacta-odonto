-- Enum for document types that can be signed
CREATE TYPE public.document_signature_type AS ENUM ('budget', 'receipt', 'treatment_plan', 'consent');

-- Signatures table
CREATE TABLE public.document_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type public.document_signature_type NOT NULL,
  document_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  signer_name TEXT NOT NULL,
  signer_document TEXT NOT NULL,
  signature_image_url TEXT,
  signature_image_path TEXT NOT NULL,
  accepted_terms BOOLEAN NOT NULL DEFAULT false,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_signatures_document ON public.document_signatures (document_type, document_id);
CREATE INDEX idx_document_signatures_patient ON public.document_signatures (patient_id);

ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view signatures"
ON public.document_signatures
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'dentist'::app_role)
  OR public.has_role(auth.uid(), 'receptionist'::app_role)
  OR public.has_role(auth.uid(), 'assistant'::app_role)
);

CREATE POLICY "Admin/Dentist/Receptionist can create signatures"
ON public.document_signatures
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'dentist'::app_role)
  OR public.has_role(auth.uid(), 'receptionist'::app_role)
);

CREATE POLICY "Only admin can update signatures"
ON public.document_signatures
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-signatures', 'document-signatures', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Staff can view signature files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'document-signatures'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'dentist'::app_role)
    OR public.has_role(auth.uid(), 'receptionist'::app_role)
    OR public.has_role(auth.uid(), 'assistant'::app_role)
  )
);

CREATE POLICY "Staff can upload signature files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'document-signatures'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'dentist'::app_role)
    OR public.has_role(auth.uid(), 'receptionist'::app_role)
  )
);

CREATE POLICY "Admin can delete signature files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'document-signatures'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
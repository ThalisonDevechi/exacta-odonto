-- Enum for export types
CREATE TYPE public.export_type AS ENUM (
  'pacientes',
  'consultas',
  'financeiro',
  'procedimentos',
  'planos_tratamento',
  'logs_auditoria',
  'recibos',
  'orcamentos',
  'comunicacoes',
  'lembretes',
  'assinaturas'
);

-- Enum for export formats
CREATE TYPE public.export_format AS ENUM ('csv');

-- Export logs table
CREATE TABLE public.export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_name text,
  export_type public.export_type NOT NULL,
  filters jsonb,
  format public.export_format NOT NULL DEFAULT 'csv',
  total_records integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_export_logs_user_id ON public.export_logs(user_id);
CREATE INDEX idx_export_logs_created_at ON public.export_logs(created_at DESC);
CREATE INDEX idx_export_logs_export_type ON public.export_logs(export_type);

ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admin can view export logs"
ON public.export_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admin can create export logs"
ON public.export_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = user_id);
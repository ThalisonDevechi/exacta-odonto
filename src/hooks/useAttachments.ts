import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import type { Database } from "@/integrations/supabase/types";

export type AttachmentRow = Database["public"]["Tables"]["attachments"]["Row"];
export type AttachmentCategory = Database["public"]["Enums"]["attachment_category"];

export const ATTACHMENT_CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  documento: "Documento",
  exame: "Exame",
  radiografia: "Radiografia",
  imagem_clinica: "Imagem Clínica",
  contrato: "Contrato",
  outro: "Outro",
};

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const BUCKET = "patient-attachments";

export function useAttachments(patientId?: string) {
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!patientId) { setAttachments([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("attachments").select("*")
      .eq("patient_id", patientId).eq("active", true)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setAttachments(data ?? []);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const upload = useCallback(async (
    file: File,
    category: AttachmentCategory,
    options?: { medicalRecordId?: string | null; releasedToPatient?: boolean; uploadedBy?: string },
  ) => {
    if (!patientId) throw new Error("Paciente é obrigatório.");
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error("Tipo de arquivo não permitido. Aceitos: PDF, JPG, PNG.");
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new Error("Arquivo excede o tamanho máximo de 15MB.");
    }
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${patientId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type, upsert: false,
    });
    if (upErr) throw upErr;
    const { data: inserted, error: insErr } = await supabase.from("attachments").insert({
      patient_id: patientId,
      medical_record_id: options?.medicalRecordId ?? null,
      file_name: file.name,
      file_type: file.type,
      file_path: path,
      file_size: file.size,
      category,
      released_to_patient: options?.releasedToPatient ?? false,
      uploaded_by: options?.uploadedBy ?? null,
    }).select().single();
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw insErr;
    }
    await logAudit("attachment.upload", "attachments", inserted.id, { file_name: file.name, category });
    await fetchAll();
    return inserted;
  }, [patientId, fetchAll]);

  const getSignedUrl = useCallback(async (path: string, expiresIn = 60) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  }, []);

  const setReleased = useCallback(async (id: string, released: boolean) => {
    const { error } = await supabase.from("attachments")
      .update({ released_to_patient: released }).eq("id", id);
    if (error) throw error;
    await logAudit("attachment.release", "attachments", id, { released });
    await fetchAll();
  }, [fetchAll]);

  const deactivate = useCallback(async (id: string) => {
    const { error } = await supabase.from("attachments")
      .update({ active: false }).eq("id", id);
    if (error) throw error;
    await logAudit("attachment.deactivate", "attachments", id);
    await fetchAll();
  }, [fetchAll]);

  return { attachments, loading, error, refetch: fetchAll, upload, getSignedUrl, setReleased, deactivate };
}

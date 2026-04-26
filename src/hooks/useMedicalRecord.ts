import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { logAudit } from "@/lib/audit";

export type DBMedicalRecord = Database["public"]["Tables"]["medical_records"]["Row"];
export type MedicalRecordUpdate = Database["public"]["Tables"]["medical_records"]["Update"];

export function useMedicalRecord(patientId: string | undefined) {
  const [record, setRecord] = useState<DBMedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("medical_records")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();
    if (error) setError(error.message);
    setRecord(data);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { refetch(); }, [refetch]);

  /** Ensures a record exists for the patient (creating empty if missing). */
  const ensureRecord = useCallback(async (currentUserId?: string): Promise<DBMedicalRecord | null> => {
    if (!patientId) return null;
    const { data: existing } = await supabase
      .from("medical_records").select("*").eq("patient_id", patientId).maybeSingle();
    if (existing) { setRecord(existing); return existing; }
    const { data, error } = await supabase
      .from("medical_records")
      .insert({ patient_id: patientId, last_updated_by: currentUserId ?? null })
      .select().single();
    if (error) throw error;
    await logAudit("record.create", "medical_record", data.id, { patient_id: patientId });
    setRecord(data);
    return data;
  }, [patientId]);

  const upsertRecord = async (data: MedicalRecordUpdate, currentUserId?: string) => {
    if (!patientId) throw new Error("patientId required");
    if (record) {
      const { error } = await supabase
        .from("medical_records")
        .update({ ...data, last_updated_by: currentUserId ?? null })
        .eq("id", record.id);
      if (error) throw error;
      await logAudit("record.update", "medical_record", record.id, { patient_id: patientId });
    } else {
      const { data: created, error } = await supabase
        .from("medical_records")
        .insert({ patient_id: patientId, ...data, last_updated_by: currentUserId ?? null })
        .select().single();
      if (error) throw error;
      await logAudit("record.create", "medical_record", created.id, { patient_id: patientId });
    }
    await refetch();
  };

  const setReleased = async (released: boolean) => {
    if (!record) return;
    const { error } = await supabase.from("medical_records").update({ released_to_patient: released }).eq("id", record.id);
    if (error) throw error;
    await logAudit("record.release", "medical_record", record.id, { released });
    await refetch();
  };

  return { record, loading, error, refetch, upsertRecord, ensureRecord, setReleased };
}

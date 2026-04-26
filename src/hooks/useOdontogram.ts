import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { logAudit } from "@/lib/audit";
import { DentitionType, quadrantOf, kindOf, suggestDentition } from "@/lib/dentition";

export type DBOdontogram = Database["public"]["Tables"]["odontograms"]["Row"];
export type DBTooth = Database["public"]["Tables"]["odontogram_teeth"]["Row"];
export type DBFace = Database["public"]["Tables"]["tooth_faces"]["Row"];

export interface OdontogramData {
  odontogram: DBOdontogram | null;
  teeth: DBTooth[];
  faces: DBFace[];
}

export function useOdontogram(patientId: string | undefined, birthDate?: string) {
  const [data, setData] = useState<OdontogramData>({ odontogram: null, teeth: [], faces: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    const { data: odo, error: e1 } = await supabase
      .from("odontograms").select("*").eq("patient_id", patientId).maybeSingle();
    if (e1) { setError(e1.message); setLoading(false); return; }
    if (!odo) {
      setData({ odontogram: null, teeth: [], faces: [] });
      setLoading(false);
      return;
    }
    const [{ data: teeth }, { data: faces }] = await Promise.all([
      supabase.from("odontogram_teeth").select("*").eq("odontogram_id", odo.id).order("tooth_number"),
      supabase.from("tooth_faces").select("*, odontogram_teeth!inner(odontogram_id)").eq("odontogram_teeth.odontogram_id", odo.id),
    ]);
    setData({ odontogram: odo, teeth: teeth ?? [], faces: (faces as DBFace[]) ?? [] });
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const ensureOdontogram = useCallback(async (professionalId?: string): Promise<DBOdontogram | null> => {
    if (!patientId) return null;
    const { data: existing } = await supabase
      .from("odontograms").select("*").eq("patient_id", patientId).maybeSingle();
    if (existing) return existing;
    const dentition: DentitionType = birthDate ? suggestDentition(birthDate) : "permanent";
    const { data: created, error } = await supabase
      .from("odontograms")
      .insert({
        patient_id: patientId,
        dentition_type: dentition,
        defined_automatically: true,
        professional_id: professionalId ?? null,
      })
      .select().single();
    if (error) throw error;
    await logAudit("odontogram.create", "odontogram", created.id, { patient_id: patientId, dentition_type: dentition });
    await fetchAll();
    return created;
  }, [patientId, birthDate, fetchAll]);

  const changeDentitionType = async (newType: DentitionType, justification: string, professionalId?: string) => {
    const odo = data.odontogram ?? await ensureOdontogram(professionalId);
    if (!odo) return;
    const { error } = await supabase.from("odontograms").update({
      dentition_type: newType,
      manually_changed: true,
      defined_automatically: false,
      change_justification: justification,
      professional_id: professionalId ?? odo.professional_id,
    }).eq("id", odo.id);
    if (error) throw error;
    await logAudit("odontogram.dentition.change", "odontogram", odo.id, { newType, justification });
    await fetchAll();
  };

  const upsertTooth = async (toothNumber: number, payload: Partial<DBTooth>, professionalId?: string) => {
    const odo = data.odontogram ?? await ensureOdontogram(professionalId);
    if (!odo) throw new Error("Odontograma indisponível");
    const existing = data.teeth.find(t => t.tooth_number === toothNumber);
    if (existing) {
      const { error } = await supabase.from("odontogram_teeth").update({
        ...payload,
        professional_id: professionalId ?? existing.professional_id,
      }).eq("id", existing.id);
      if (error) throw error;
      await logAudit("tooth.update", "odontogram_tooth", existing.id, { tooth_number: toothNumber, ...payload });
    } else {
      const { error } = await supabase.from("odontogram_teeth").insert({
        odontogram_id: odo.id,
        patient_id: patientId!,
        tooth_number: toothNumber,
        tooth_kind: kindOf(toothNumber),
        quadrant: quadrantOf(toothNumber),
        status: payload.status ?? "integro",
        observation: payload.observation ?? null,
        professional_id: professionalId ?? null,
      });
      if (error) throw error;
      await logAudit("tooth.update", "odontogram_tooth", null, { tooth_number: toothNumber, created: true });
    }
    await fetchAll();
  };

  const upsertFace = async (
    toothId: string,
    face: DBFace["face"],
    payload: Partial<DBFace>,
    professionalId?: string,
  ) => {
    const existing = data.faces.find(f => f.tooth_id === toothId && f.face === face);
    if (existing) {
      const { error } = await supabase.from("tooth_faces").update({
        ...payload, professional_id: professionalId ?? existing.professional_id,
      }).eq("id", existing.id);
      if (error) throw error;
      await logAudit("face.update", "tooth_face", existing.id, { face, ...payload });
    } else {
      const { error } = await supabase.from("tooth_faces").insert({
        tooth_id: toothId, face,
        condition: payload.condition ?? "normal",
        planned_procedure: payload.planned_procedure ?? null,
        performed_procedure: payload.performed_procedure ?? null,
        observation: payload.observation ?? null,
        professional_id: professionalId ?? null,
        appointment_id: payload.appointment_id ?? null,
      });
      if (error) throw error;
      await logAudit("face.update", "tooth_face", null, { face, created: true });
    }
    await fetchAll();
  };

  return { data, loading, error, refetch: fetchAll, ensureOdontogram, changeDentitionType, upsertTooth, upsertFace };
}

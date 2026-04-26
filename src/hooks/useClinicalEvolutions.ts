import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { logAudit } from "@/lib/audit";

export type DBEvolution = Database["public"]["Tables"]["clinical_evolutions"]["Row"];
export type EvolutionInsert = Database["public"]["Tables"]["clinical_evolutions"]["Insert"];

export function useClinicalEvolutions(patientId: string | undefined) {
  const [evolutions, setEvolutions] = useState<DBEvolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("clinical_evolutions")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setEvolutions(data ?? []);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { refetch(); }, [refetch]);

  const addEvolution = async (payload: Omit<EvolutionInsert, "patient_id">) => {
    if (!patientId) throw new Error("patientId required");
    const { data, error } = await supabase
      .from("clinical_evolutions")
      .insert({ ...payload, patient_id: patientId })
      .select().single();
    if (error) throw error;
    await logAudit("evolution.create", "clinical_evolution", data.id, { patient_id: patientId });
    await refetch();
    return data;
  };

  const rectifyEvolution = async (id: string, newDescription: string, reason: string) => {
    const current = evolutions.find(e => e.id === id);
    if (!current) throw new Error("Evolução não encontrada");
    const { error } = await supabase
      .from("clinical_evolutions")
      .update({
        description: newDescription,
        original_text: current.original_text ?? current.description,
        rectification_reason: reason,
        status: "rectified",
      })
      .eq("id", id);
    if (error) throw error;
    await logAudit("evolution.rectify", "clinical_evolution", id, { reason });
    await refetch();
  };

  const cancelEvolution = async (id: string, reason: string) => {
    const { error } = await supabase
      .from("clinical_evolutions")
      .update({ status: "cancelled", rectification_reason: reason })
      .eq("id", id);
    if (error) throw error;
    await logAudit("evolution.cancel", "clinical_evolution", id, { reason });
    await refetch();
  };

  const toggleRelease = async (id: string, released: boolean) => {
    const { error } = await supabase
      .from("clinical_evolutions")
      .update({ released_to_patient: released })
      .eq("id", id);
    if (error) throw error;
    await refetch();
  };

  return { evolutions, loading, error, refetch, addEvolution, rectifyEvolution, cancelEvolution, toggleRelease };
}

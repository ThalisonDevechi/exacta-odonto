import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import type { Database } from "@/integrations/supabase/types";

export type ProcedureRow = Database["public"]["Tables"]["procedures"]["Row"] & {
  patients?: { name: string } | null;
  dentists?: { name: string } | null;
};
export type ProcedureInsert = Database["public"]["Tables"]["procedures"]["Insert"];
export type ProcedureUpdate = Database["public"]["Tables"]["procedures"]["Update"];
export type ProcedureStatus = Database["public"]["Enums"]["procedure_status"];

export const PROCEDURE_STATUS_LABELS: Record<ProcedureStatus, string> = {
  planejado: "Planejado",
  autorizado: "Autorizado",
  em_execucao: "Em Execução",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export function useProcedures(patientId?: string) {
  const [procedures, setProcedures] = useState<ProcedureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("procedures")
      .select("*, patients(name), dentists(name)")
      .order("created_at", { ascending: false });
    if (patientId) q = q.eq("patient_id", patientId);
    const { data, error } = await q;
    if (error) setError(error.message);
    else setProcedures((data as unknown as ProcedureRow[]) ?? []);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addProcedure = useCallback(async (payload: ProcedureInsert) => {
    const { data, error } = await supabase.from("procedures").insert(payload).select().single();
    if (error) throw error;
    await logAudit("procedure.create", "procedures", data.id, { name: payload.name, value: payload.value });
    await fetchAll();
    return data;
  }, [fetchAll]);

  const updateProcedure = useCallback(async (id: string, payload: ProcedureUpdate) => {
    const { error } = await supabase.from("procedures").update(payload).eq("id", id);
    if (error) throw error;
    await logAudit("procedure.update", "procedures", id, payload as Record<string, unknown>);
    await fetchAll();
  }, [fetchAll]);

  const completeProcedure = useCallback(async (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("procedures")
      .update({ status: "realizado", performed_date: today })
      .eq("id", id);
    if (error) throw error;
    await logAudit("procedure.complete", "procedures", id);
    await fetchAll();
  }, [fetchAll]);

  const cancelProcedure = useCallback(async (id: string, reason: string) => {
    if (!reason?.trim()) throw new Error("Motivo do cancelamento é obrigatório.");
    const { error } = await supabase
      .from("procedures")
      .update({ status: "cancelado", cancelled_reason: reason })
      .eq("id", id);
    if (error) throw error;
    await logAudit("procedure.cancel", "procedures", id, { reason });
    await fetchAll();
  }, [fetchAll]);

  return { procedures, loading, error, refetch: fetchAll, addProcedure, updateProcedure, completeProcedure, cancelProcedure };
}

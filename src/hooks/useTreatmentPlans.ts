import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import type { Database } from "@/integrations/supabase/types";

export type PlanRow = Database["public"]["Tables"]["treatment_plans"]["Row"] & {
  patients?: { name: string } | null;
  dentists?: { name: string } | null;
};
export type PlanInsert = Database["public"]["Tables"]["treatment_plans"]["Insert"];
export type PlanUpdate = Database["public"]["Tables"]["treatment_plans"]["Update"];
export type PlanStatus = Database["public"]["Enums"]["treatment_plan_status"];

export type StepRow = Database["public"]["Tables"]["treatment_plan_steps"]["Row"];
export type StepInsert = Database["public"]["Tables"]["treatment_plan_steps"]["Insert"];
export type StepUpdate = Database["public"]["Tables"]["treatment_plan_steps"]["Update"];
export type StepStatus = Database["public"]["Enums"]["treatment_step_status"];

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  rascunho: "Rascunho",
  apresentado: "Apresentado",
  aprovado: "Aprovado",
  em_andamento: "Em Andamento",
  pausado: "Pausado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export function useTreatmentPlans(patientId?: string) {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("treatment_plans")
      .select("*, patients(name), dentists(name)")
      .order("created_at", { ascending: false });
    if (patientId) q = q.eq("patient_id", patientId);
    const { data: plansData, error: planErr } = await q;
    if (planErr) { setError(planErr.message); setLoading(false); return; }
    setPlans((plansData as unknown as PlanRow[]) ?? []);

    const planIds = (plansData ?? []).map(p => p.id);
    if (planIds.length) {
      const { data: stepsData } = await supabase
        .from("treatment_plan_steps").select("*").in("treatment_plan_id", planIds)
        .order("order_index", { ascending: true });
      setSteps(stepsData ?? []);
    } else setSteps([]);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addPlan = useCallback(async (payload: PlanInsert) => {
    const { data, error } = await supabase.from("treatment_plans").insert(payload).select().single();
    if (error) throw error;
    await logAudit("treatment_plan.create", "treatment_plans", data.id, { title: payload.title });
    await fetchAll();
    return data;
  }, [fetchAll]);

  const updatePlan = useCallback(async (id: string, payload: PlanUpdate) => {
    const { error } = await supabase.from("treatment_plans").update(payload).eq("id", id);
    if (error) throw error;
    await logAudit("treatment_plan.update", "treatment_plans", id, payload as Record<string, unknown>);
    await fetchAll();
  }, [fetchAll]);

  const changeStatus = useCallback(async (id: string, status: PlanStatus, reason?: string) => {
    const payload: PlanUpdate = { status };
    if (status === "aprovado") payload.approved_at = new Date().toISOString();
    if (status === "cancelado") {
      if (!reason?.trim()) throw new Error("Motivo do cancelamento é obrigatório.");
      payload.cancelled_reason = reason;
    }
    const { error } = await supabase.from("treatment_plans").update(payload).eq("id", id);
    if (error) throw error;
    const map: Record<PlanStatus, "treatment_plan.approve" | "treatment_plan.pause" | "treatment_plan.complete" | "treatment_plan.cancel" | "treatment_plan.update"> = {
      aprovado: "treatment_plan.approve", pausado: "treatment_plan.pause",
      concluido: "treatment_plan.complete", cancelado: "treatment_plan.cancel",
      rascunho: "treatment_plan.update", apresentado: "treatment_plan.update", em_andamento: "treatment_plan.update",
    };
    await logAudit(map[status], "treatment_plans", id, { status, reason });
    await fetchAll();
  }, [fetchAll]);

  const addStep = useCallback(async (payload: StepInsert) => {
    const { data, error } = await supabase.from("treatment_plan_steps").insert(payload).select().single();
    if (error) throw error;
    await logAudit("treatment_step.create", "treatment_plan_steps", data.id, { title: payload.title });
    await fetchAll();
    return data;
  }, [fetchAll]);

  const updateStep = useCallback(async (id: string, payload: StepUpdate) => {
    const { error } = await supabase.from("treatment_plan_steps").update(payload).eq("id", id);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const completeStep = useCallback(async (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("treatment_plan_steps")
      .update({ status: "concluida", completed_date: today })
      .eq("id", id);
    if (error) throw error;
    await logAudit("treatment_step.complete", "treatment_plan_steps", id);
    await fetchAll();
  }, [fetchAll]);

  const cancelStep = useCallback(async (id: string, reason: string) => {
    if (!reason?.trim()) throw new Error("Motivo do cancelamento é obrigatório.");
    const { error } = await supabase
      .from("treatment_plan_steps")
      .update({ status: "cancelada", cancelled_reason: reason })
      .eq("id", id);
    if (error) throw error;
    await logAudit("treatment_step.cancel", "treatment_plan_steps", id, { reason });
    await fetchAll();
  }, [fetchAll]);

  return {
    plans, steps, loading, error, refetch: fetchAll,
    addPlan, updatePlan, changeStatus,
    addStep, updateStep, completeStep, cancelStep,
  };
}

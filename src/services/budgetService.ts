import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Budget = Database["public"]["Tables"]["treatment_budgets"]["Row"];
export type BudgetInsert = Database["public"]["Tables"]["treatment_budgets"]["Insert"];
export type BudgetUpdate = Database["public"]["Tables"]["treatment_budgets"]["Update"];
export type BudgetStatus = Database["public"]["Enums"]["budget_status"];

export type BudgetItem = Database["public"]["Tables"]["budget_items"]["Row"];
export type BudgetItemInsert = Database["public"]["Tables"]["budget_items"]["Insert"];

export interface BudgetRelations {
  patients: { id: string; name: string; cpf: string | null; phone: string | null } | null;
  dentists: { id: string; name: string; cro: string | null } | null;
}

export type BudgetWithItems = Budget & BudgetRelations & { items: BudgetItem[] };

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  rascunho: "Rascunho",
  emitido: "Emitido",
  aceito: "Aceito",
  recusado: "Recusado",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

function recalcTotals(items: { unit_value: number; quantity: number }[], discount: number) {
  const subtotal = items.reduce((s, it) => s + Number(it.unit_value) * Number(it.quantity), 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));
  return { subtotal, total };
}

async function fetchRelations(budgets: Budget[]): Promise<BudgetWithItems[]> {
  if (!budgets.length) return [];
  const ids = budgets.map((b) => b.id);
  const patientIds = Array.from(new Set(budgets.map((b) => b.patient_id).filter(Boolean)));
  const dentistIds = Array.from(new Set(budgets.map((b) => b.dentist_id).filter(Boolean) as string[]));

  const [{ data: items }, { data: patients }, { data: dentists }] = await Promise.all([
    supabase.from("budget_items").select("*").in("budget_id", ids).order("order_index"),
    patientIds.length
      ? supabase.from("patients").select("id,name,cpf,phone").in("id", patientIds)
      : Promise.resolve({ data: [] as { id: string; name: string; cpf: string | null; phone: string | null }[] }),
    dentistIds.length
      ? supabase.from("dentists").select("id,name,cro").in("id", dentistIds)
      : Promise.resolve({ data: [] as { id: string; name: string; cro: string | null }[] }),
  ]);

  const pMap = new Map((patients ?? []).map((p) => [p.id, p]));
  const dMap = new Map((dentists ?? []).map((d) => [d.id, d]));
  const allItems = items ?? [];

  return budgets.map((b) => ({
    ...b,
    items: allItems.filter((it) => it.budget_id === b.id),
    patients: pMap.get(b.patient_id) ?? null,
    dentists: b.dentist_id ? dMap.get(b.dentist_id) ?? null : null,
  }));
}

export const budgetService = {
  async listByPatient(patientId: string): Promise<BudgetWithItems[]> {
    const { data, error } = await supabase
      .from("treatment_budgets")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return fetchRelations(data ?? []);
  },

  async listAll(): Promise<BudgetWithItems[]> {
    const { data, error } = await supabase
      .from("treatment_budgets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return fetchRelations(data ?? []);
  },

  async getById(id: string): Promise<BudgetWithItems | null> {
    const { data, error } = await supabase
      .from("treatment_budgets")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const [full] = await fetchRelations([data]);
    return full ?? null;
  },

  async create(
    payload: Omit<BudgetInsert, "subtotal" | "total_value">,
    items: Omit<BudgetItemInsert, "budget_id" | "total_value">[],
  ): Promise<BudgetWithItems> {
    const { subtotal, total } = recalcTotals(
      items.map((i) => ({ unit_value: Number(i.unit_value), quantity: Number(i.quantity) })),
      Number(payload.discount_value ?? 0),
    );
    const { data: budget, error } = await supabase
      .from("treatment_budgets")
      .insert({ ...payload, subtotal, total_value: total })
      .select()
      .single();
    if (error) throw error;
    if (items.length) {
      const rows: BudgetItemInsert[] = items.map((it, idx) => ({
        budget_id: budget.id,
        description: it.description,
        quantity: Number(it.quantity),
        unit_value: Number(it.unit_value),
        total_value: Number(it.unit_value) * Number(it.quantity),
        tooth_number: it.tooth_number ?? null,
        order_index: it.order_index ?? idx,
      }));
      const { error: errItems } = await supabase.from("budget_items").insert(rows);
      if (errItems) throw errItems;
    }
    const full = await this.getById(budget.id);
    if (!full) throw new Error("Failed to load budget");
    return full;
  },

  async update(
    id: string,
    payload: BudgetUpdate,
    items?: Omit<BudgetItemInsert, "budget_id" | "total_value">[],
  ): Promise<void> {
    let merged: BudgetUpdate = { ...payload };
    if (items) {
      const { subtotal, total } = recalcTotals(
        items.map((i) => ({ unit_value: Number(i.unit_value), quantity: Number(i.quantity) })),
        Number(payload.discount_value ?? 0),
      );
      merged = { ...merged, subtotal, total_value: total };
      await supabase.from("budget_items").delete().eq("budget_id", id);
      if (items.length) {
        const rows: BudgetItemInsert[] = items.map((it, idx) => ({
          budget_id: id,
          description: it.description,
          quantity: Number(it.quantity),
          unit_value: Number(it.unit_value),
          total_value: Number(it.unit_value) * Number(it.quantity),
          tooth_number: it.tooth_number ?? null,
          order_index: it.order_index ?? idx,
        }));
        const { error } = await supabase.from("budget_items").insert(rows);
        if (error) throw error;
      }
    }
    const { error } = await supabase.from("treatment_budgets").update(merged).eq("id", id);
    if (error) throw error;
  },

  async issue(id: string): Promise<void> {
    const { error } = await supabase
      .from("treatment_budgets")
      .update({ status: "emitido" })
      .eq("id", id);
    if (error) throw error;
  },

  async accept(id: string): Promise<void> {
    const { error } = await supabase
      .from("treatment_budgets")
      .update({ status: "aceito", accepted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async reject(id: string): Promise<void> {
    const { error } = await supabase
      .from("treatment_budgets")
      .update({ status: "recusado" })
      .eq("id", id);
    if (error) throw error;
  },

  async cancel(id: string, reason: string): Promise<void> {
    if (!reason.trim()) throw new Error("Motivo é obrigatório.");
    const { error } = await supabase
      .from("treatment_budgets")
      .update({ status: "cancelado", cancelled_reason: reason.trim() })
      .eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    await supabase.from("budget_items").delete().eq("budget_id", id);
    const { error } = await supabase.from("treatment_budgets").delete().eq("id", id);
    if (error) throw error;
  },
};

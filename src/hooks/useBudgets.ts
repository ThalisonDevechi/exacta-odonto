import { useCallback, useEffect, useState } from "react";
import { budgetService, type BudgetWithItems, type BudgetInsert, type BudgetUpdate, type BudgetItemInsert } from "@/services/budgetService";
import { logAudit } from "@/lib/audit";

export function useBudgets(patientId?: string) {
  const [budgets, setBudgets] = useState<BudgetWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = patientId
        ? await budgetService.listByPatient(patientId)
        : await budgetService.listAll();
      setBudgets(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar orçamentos.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { refetch(); }, [refetch]);

  const create = useCallback(async (
    payload: Omit<BudgetInsert, "subtotal" | "total_value">,
    items: Omit<BudgetItemInsert, "budget_id" | "total_value">[],
  ) => {
    const b = await budgetService.create(payload, items);
    await logAudit("budget.create", "treatment_budgets", b.id, { title: b.title, total: b.total_value });
    await refetch();
    return b;
  }, [refetch]);

  const update = useCallback(async (
    id: string,
    payload: BudgetUpdate,
    items?: Omit<BudgetItemInsert, "budget_id" | "total_value">[],
  ) => {
    await budgetService.update(id, payload, items);
    await logAudit("budget.update", "treatment_budgets", id, payload as Record<string, unknown>);
    await refetch();
  }, [refetch]);

  const issue = useCallback(async (id: string) => {
    await budgetService.issue(id);
    await logAudit("budget.issue", "treatment_budgets", id);
    await refetch();
  }, [refetch]);

  const accept = useCallback(async (id: string) => {
    await budgetService.accept(id);
    await logAudit("budget.accept", "treatment_budgets", id);
    await refetch();
  }, [refetch]);

  const reject = useCallback(async (id: string) => {
    await budgetService.reject(id);
    await logAudit("budget.reject", "treatment_budgets", id);
    await refetch();
  }, [refetch]);

  const cancel = useCallback(async (id: string, reason: string) => {
    await budgetService.cancel(id, reason);
    await logAudit("budget.cancel", "treatment_budgets", id, { reason });
    await refetch();
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    await budgetService.remove(id);
    await refetch();
  }, [refetch]);

  return { budgets, loading, error, refetch, create, update, issue, accept, reject, cancel, remove };
}

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import type { Database } from "@/integrations/supabase/types";

export type FinancialRow = Database["public"]["Tables"]["financial_records"]["Row"] & {
  patients?: { name: string; phone?: string | null } | null;
};
export type FinancialInsert = Database["public"]["Tables"]["financial_records"]["Insert"];
export type FinancialUpdate = Database["public"]["Tables"]["financial_records"]["Update"];
export type FinancialStatus = Database["public"]["Enums"]["financial_status"];
export type PaymentMethodEnum = Database["public"]["Enums"]["payment_method"];

export const FINANCIAL_STATUS_LABELS: Record<FinancialStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
  parcial: "Parcial",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
  estornado: "Estornado",
};

export const PAYMENT_METHOD_LABELS_V2: Record<PaymentMethodEnum, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Cartão Crédito",
  cartao_debito: "Cartão Débito",
  boleto: "Boleto",
  transferencia: "Transferência",
  convenio: "Convênio",
  outro: "Outro",
};

function computeRemaining(originalValue: number, discount: number, paid: number): { final: number; remaining: number } {
  const final = Math.max(0, (originalValue ?? 0) - (discount ?? 0));
  const remaining = Math.max(0, final - (paid ?? 0));
  return { final, remaining };
}

function deriveStatus(final: number, paid: number, dueDate: string | null, current: FinancialStatus): FinancialStatus {
  if (current === "cancelado" || current === "estornado") return current;
  if (paid <= 0) {
    if (dueDate && new Date(dueDate) < new Date(new Date().toDateString())) return "atrasado";
    return "pendente";
  }
  if (paid >= final) return "pago";
  return "parcial";
}

export function useFinancialRecords(patientId?: string) {
  const [records, setRecords] = useState<FinancialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("financial_records")
      .select("*, patients(name,phone)")
      .order("created_at", { ascending: false });
    if (patientId) q = q.eq("patient_id", patientId);
    const { data, error } = await q;
    if (error) setError(error.message);
    else setRecords((data as unknown as FinancialRow[]) ?? []);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addRecord = useCallback(async (payload: FinancialInsert) => {
    const original = Number(payload.original_value ?? 0);
    const discount = Number(payload.discount_value ?? 0);
    if (discount > original) throw new Error("Desconto não pode ser maior que valor original.");
    const { final, remaining } = computeRemaining(original, discount, Number(payload.paid_value ?? 0));
    const insert: FinancialInsert = {
      ...payload,
      original_value: original,
      discount_value: discount,
      final_value: final,
      remaining_value: remaining,
    };
    const { data, error } = await supabase.from("financial_records").insert(insert).select().single();
    if (error) throw error;
    await logAudit("financial.create", "financial_records", data.id, { description: payload.description, value: final });
    await fetchAll();
    return data;
  }, [fetchAll]);

  const updateRecord = useCallback(async (id: string, payload: FinancialUpdate) => {
    const { data: current, error: getErr } = await supabase
      .from("financial_records").select("*").eq("id", id).single();
    if (getErr) throw getErr;
    const original = Number(payload.original_value ?? current.original_value);
    const discount = Number(payload.discount_value ?? current.discount_value);
    if (discount > original) throw new Error("Desconto não pode ser maior que valor original.");
    const paid = Number(payload.paid_value ?? current.paid_value);
    const { final, remaining } = computeRemaining(original, discount, paid);
    const due = (payload.due_date ?? current.due_date) as string | null;
    const status = deriveStatus(final, paid, due, (payload.status ?? current.status) as FinancialStatus);
    const merged: FinancialUpdate = {
      ...payload, original_value: original, discount_value: discount,
      final_value: final, paid_value: paid, remaining_value: remaining, status,
    };
    const { error } = await supabase.from("financial_records").update(merged).eq("id", id);
    if (error) throw error;
    await logAudit("financial.create", "financial_records", id, payload as Record<string, unknown>);
    await fetchAll();
  }, [fetchAll]);

  const registerPayment = useCallback(async (id: string, amount: number, method: PaymentMethodEnum, receivedBy?: string) => {
    if (amount <= 0) throw new Error("Valor do pagamento deve ser maior que zero.");
    const { data: current, error: getErr } = await supabase
      .from("financial_records").select("*").eq("id", id).single();
    if (getErr) throw getErr;
    if (current.status === "pago" || current.status === "cancelado" || current.status === "estornado") {
      throw new Error("Lançamento não permite novo pagamento.");
    }
    const newPaid = Number(current.paid_value) + amount;
    const final = Number(current.final_value);
    if (newPaid > final) throw new Error("Pagamento maior que valor final.");
    const remaining = Math.max(0, final - newPaid);
    const status: FinancialStatus = newPaid >= final ? "pago" : "parcial";
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("financial_records").update({
      paid_value: newPaid, remaining_value: remaining, status,
      payment_method: method, payment_date: today, received_by: receivedBy ?? null,
    }).eq("id", id);
    if (error) throw error;
    await logAudit(status === "pago" ? "financial.payment" : "financial.partial_payment",
      "financial_records", id, { amount, method, total_paid: newPaid });
    await fetchAll();
  }, [fetchAll]);

  const cancelRecord = useCallback(async (id: string, reason: string) => {
    if (!reason?.trim()) throw new Error("Motivo do cancelamento é obrigatório.");
    const { error } = await supabase.from("financial_records")
      .update({ status: "cancelado", cancelled_reason: reason }).eq("id", id);
    if (error) throw error;
    await logAudit("financial.cancel", "financial_records", id, { reason });
    await fetchAll();
  }, [fetchAll]);

  const refundRecord = useCallback(async (id: string, reason: string) => {
    if (!reason?.trim()) throw new Error("Motivo do estorno é obrigatório.");
    const { error } = await supabase.from("financial_records")
      .update({ status: "estornado", refunded_reason: reason }).eq("id", id);
    if (error) throw error;
    await logAudit("financial.refund", "financial_records", id, { reason });
    await fetchAll();
  }, [fetchAll]);

  return { records, loading, error, refetch: fetchAll, addRecord, updateRecord, registerPayment, cancelRecord, refundRecord };
}

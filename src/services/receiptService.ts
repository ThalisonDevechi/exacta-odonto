import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Receipt = Database["public"]["Tables"]["payment_receipts"]["Row"];
export type ReceiptInsert = Database["public"]["Tables"]["payment_receipts"]["Insert"];

export interface ReceiptRelations {
  patients: { id: string; name: string; cpf: string | null; phone: string | null } | null;
}

export type ReceiptWithRelations = Receipt & ReceiptRelations;

async function attachPatients(receipts: Receipt[]): Promise<ReceiptWithRelations[]> {
  if (!receipts.length) return [];
  const patientIds = Array.from(new Set(receipts.map((r) => r.patient_id).filter(Boolean)));
  if (!patientIds.length) return receipts.map((r) => ({ ...r, patients: null }));
  const { data: patients } = await supabase
    .from("patients")
    .select("id,name,cpf,phone")
    .in("id", patientIds);
  const map = new Map((patients ?? []).map((p) => [p.id, p]));
  return receipts.map((r) => ({ ...r, patients: map.get(r.patient_id) ?? null }));
}

export const receiptService = {
  async listByPatient(patientId: string): Promise<ReceiptWithRelations[]> {
    const { data, error } = await supabase
      .from("payment_receipts")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return attachPatients(data ?? []);
  },

  async listByFinancial(financialId: string): Promise<ReceiptWithRelations[]> {
    const { data, error } = await supabase
      .from("payment_receipts")
      .select("*")
      .eq("financial_record_id", financialId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return attachPatients(data ?? []);
  },

  async listAll(): Promise<ReceiptWithRelations[]> {
    const { data, error } = await supabase
      .from("payment_receipts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return attachPatients(data ?? []);
  },

  async getById(id: string): Promise<ReceiptWithRelations | null> {
    const { data, error } = await supabase
      .from("payment_receipts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const [full] = await attachPatients([data]);
    return full ?? null;
  },

  async create(payload: ReceiptInsert): Promise<ReceiptWithRelations> {
    const { data, error } = await supabase
      .from("payment_receipts")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    const [full] = await attachPatients([data]);
    return full;
  },
};

import { useCallback, useEffect, useState } from "react";
import { receiptService, type ReceiptWithRelations, type ReceiptInsert } from "@/services/receiptService";
import { logAudit } from "@/lib/audit";

export function useReceipts(opts: { patientId?: string; financialId?: string } = {}) {
  const { patientId, financialId } = opts;
  const [receipts, setReceipts] = useState<ReceiptWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = financialId
        ? await receiptService.listByFinancial(financialId)
        : patientId
          ? await receiptService.listByPatient(patientId)
          : await receiptService.listAll();
      setReceipts(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar recibos.");
    } finally {
      setLoading(false);
    }
  }, [patientId, financialId]);

  useEffect(() => { refetch(); }, [refetch]);

  const create = useCallback(async (payload: ReceiptInsert) => {
    const r = await receiptService.create(payload);
    await logAudit("receipt.create", "payment_receipts", r.id, { amount: r.amount });
    await refetch();
    return r;
  }, [refetch]);

  return { receipts, loading, error, refetch, create };
}

import { useCallback, useEffect, useState } from "react";
import {
  type DateRangeFilter,
  type ExportLogRow,
  type ExportType,
  createExportLog,
  exportAppointments,
  exportAuditLogs,
  exportBudgets,
  exportCommunications,
  exportFinancialRecords,
  exportPatients,
  exportProcedures,
  exportReceipts,
  exportReminders,
  exportSignatures,
  exportTreatmentPlans,
  listExportLogs,
} from "@/services/backupExportService";
import { logAudit } from "@/lib/audit";

const exportersMap: Record<ExportType, (f?: DateRangeFilter) => Promise<number>> = {
  pacientes: exportPatients,
  consultas: exportAppointments,
  financeiro: exportFinancialRecords,
  procedimentos: exportProcedures,
  planos_tratamento: exportTreatmentPlans,
  logs_auditoria: exportAuditLogs,
  recibos: exportReceipts,
  orcamentos: exportBudgets,
  comunicacoes: exportCommunications,
  lembretes: exportReminders,
  assinaturas: exportSignatures,
};

export function useBackupExports() {
  const [logs, setLogs] = useState<ExportLogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const data = await listExportLogs(100);
      setLogs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar histórico");
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runExport = useCallback(
    async (type: ExportType, filters?: DateRangeFilter): Promise<number> => {
      setExporting(type);
      setError(null);
      try {
        const total = await exportersMap[type](filters);
        await createExportLog(type, total, (filters ?? null) as Record<string, unknown> | null);
        await logAudit("backup.export", "export", null, {
          export_type: type,
          total_records: total,
          filters: filters ?? null,
        });
        await refresh();
        return total;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Falha ao exportar";
        setError(msg);
        await logAudit("backup.export", "export", null, {
          export_type: type,
          error: msg,
          filters: filters ?? null,
        }).catch(() => undefined);
        throw e;
      } finally {
        setExporting(null);
      }
    },
    [refresh],
  );

  return { logs, loadingLogs, exporting, error, refresh, runExport };
}

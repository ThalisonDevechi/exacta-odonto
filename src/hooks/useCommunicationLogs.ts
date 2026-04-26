import { useCallback, useEffect, useState } from "react";
import {
  communicationLogService,
  type CommunicationLog,
  type CommunicationLogInsert,
  type CommunicationFilter,
} from "@/services/communicationLogService";
import { logAudit } from "@/lib/audit";

export function useCommunicationLogs(filter: CommunicationFilter = {}) {
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = JSON.stringify(filter);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await communicationLogService.list(filter);
      setLogs(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar comunicações.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(
    async (payload: CommunicationLogInsert) => {
      const log = await communicationLogService.create(payload);
      await logAudit("communication.create", "communication_logs", log.id, {
        channel: log.channel,
        type: log.type,
        direction: log.direction,
      });
      await refetch();
      return log;
    },
    [refetch],
  );

  return { logs, loading, error, refetch, create };
}

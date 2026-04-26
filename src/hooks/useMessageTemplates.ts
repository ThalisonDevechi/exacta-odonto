import { useCallback, useEffect, useState } from "react";
import { messageTemplateService, type MessageTemplate, type MessageTemplateInsert, type MessageTemplateUpdate } from "@/services/messageTemplateService";
import { logAudit } from "@/lib/audit";

export function useMessageTemplates(includeInactive = true) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await messageTemplateService.list(includeInactive);
      setTemplates(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar modelos.");
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => { refetch(); }, [refetch]);

  const create = useCallback(async (payload: MessageTemplateInsert) => {
    const t = await messageTemplateService.create(payload);
    await logAudit("message_template.create", "message_templates", t.id, { name: t.name, type: t.type });
    await refetch();
    return t;
  }, [refetch]);

  const update = useCallback(async (id: string, payload: MessageTemplateUpdate) => {
    const t = await messageTemplateService.update(id, payload);
    await logAudit("message_template.update", "message_templates", id, payload as Record<string, unknown>);
    await refetch();
    return t;
  }, [refetch]);

  const remove = useCallback(async (id: string) => {
    await messageTemplateService.remove(id);
    await logAudit("message_template.delete", "message_templates", id);
    await refetch();
  }, [refetch]);

  return { templates, loading, error, refetch, create, update, remove };
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommunicationForm } from "@/components/CommunicationForm";
import { useCommunicationLogs } from "@/hooks/useCommunicationLogs";
import { useAuth } from "@/lib/auth-context";
import { canRegisterCommunication } from "@/lib/permissions";
import {
  COMMUNICATION_CHANNEL_LABELS,
  COMMUNICATION_DIRECTION_LABELS,
  COMMUNICATION_STATUS_LABELS,
  COMMUNICATION_TYPE_LABELS,
} from "@/services/communicationLogService";
import { MessageSquare, Plus } from "lucide-react";

interface Props {
  patientId: string;
}

export function CommunicationTimeline({ patientId }: Props) {
  const { logs, loading, refetch } = useCommunicationLogs({ patientId });
  const { user } = useAuth();
  const canCreate = user ? canRegisterCommunication(user.role) : false;
  const [formOpen, setFormOpen] = useState(false);

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Histórico de comunicação
          </h3>
          {canCreate && (
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Registrar
            </Button>
          )}
        </div>

        {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!loading && !logs.length && (
          <p className="text-sm text-muted-foreground">Nenhuma comunicação registrada ainda.</p>
        )}

        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{COMMUNICATION_CHANNEL_LABELS[log.channel]}</Badge>
                    <Badge variant="secondary">{COMMUNICATION_TYPE_LABELS[log.type]}</Badge>
                    <Badge variant="outline">{COMMUNICATION_DIRECTION_LABELS[log.direction]}</Badge>
                    <Badge>{COMMUNICATION_STATUS_LABELS[log.status]}</Badge>
                  </div>
                  {log.message && (
                    <p className="text-sm text-foreground/80 whitespace-pre-line">{log.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                    {log.responsible_name ? ` • ${log.responsible_name}` : ""}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <CommunicationForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        patientId={patientId}
        onSaved={refetch}
      />
    </>
  );
}

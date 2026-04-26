import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReminderStatusBadge } from "@/components/ReminderStatusBadge";
import { WhatsAppMessageModal } from "@/components/WhatsAppMessageModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAppointmentReminders } from "@/hooks/useAppointmentReminders";
import { useAuth } from "@/lib/auth-context";
import { canManageReminders } from "@/lib/permissions";
import {
  REMINDER_TYPE_LABELS,
  type ReminderWithRelations,
} from "@/services/appointmentReminderService";
import { COMMUNICATION_CHANNEL_LABELS } from "@/services/communicationLogService";
import { Bell, Check, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  appointmentId: string;
  patientName?: string;
  patientPhone?: string | null;
}

export function ReminderList({ appointmentId, patientName, patientPhone }: Props) {
  const { reminders, loading, markSent, cancel } = useAppointmentReminders({
    kind: "appointment",
    appointmentId,
  });
  const { user } = useAuth();
  const canManage = user ? canManageReminders(user.role) : false;

  const [whatsappFor, setWhatsappFor] = useState<ReminderWithRelations | null>(null);
  const [cancelFor, setCancelFor] = useState<ReminderWithRelations | null>(null);

  const handleMarkSent = async (r: ReminderWithRelations) => {
    try {
      await markSent(r.id);
      toast.success("Lembrete marcado como enviado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao marcar.");
    }
  };

  const handleCancel = async () => {
    if (!cancelFor) return;
    try {
      await cancel(cancelFor.id, "Cancelado pelo usuário");
      toast.success("Lembrete cancelado.");
      setCancelFor(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cancelar.");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando lembretes...</p>;
  if (!reminders.length)
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <Bell className="h-4 w-4" /> Nenhum lembrete cadastrado.
      </p>
    );

  return (
    <>
      <div className="space-y-2">
        {reminders.map((r) => {
          const isFinal = r.status === "enviado_manual" || r.status === "cancelado";
          return (
            <Card key={r.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {REMINDER_TYPE_LABELS[r.reminder_type]}
                    </span>
                    <ReminderStatusBadge status={r.status} />
                    <span className="text-xs text-muted-foreground">
                      {COMMUNICATION_CHANNEL_LABELS[r.channel]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Agendado para {new Date(r.scheduled_for).toLocaleString("pt-BR")}
                  </p>
                  {r.message && (
                    <p className="text-sm text-foreground/80 line-clamp-2 whitespace-pre-line">
                      {r.message}
                    </p>
                  )}
                  {r.cancelled_reason && (
                    <p className="text-xs text-destructive">Motivo: {r.cancelled_reason}</p>
                  )}
                </div>
                {canManage && !isFinal && (
                  <div className="flex flex-col gap-1.5">
                    {r.channel === "whatsapp" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setWhatsappFor(r)}
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                      </Button>
                    )}
                    <Button size="sm" onClick={() => handleMarkSent(r)}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Marcar enviado
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCancelFor(r)}>
                      <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {whatsappFor && (
        <WhatsAppMessageModal
          open={!!whatsappFor}
          onClose={() => setWhatsappFor(null)}
          phone={patientPhone ?? undefined}
          defaultMessage={whatsappFor.message ?? ""}
          patientId={whatsappFor.patient_id}
          appointmentId={whatsappFor.appointment_id}
          context={`reminder:${whatsappFor.id}`}
          entity="appointment_reminders"
          entityId={whatsappFor.id}
          communicationType="lembrete_consulta"
          title={`Enviar lembrete${patientName ? ` — ${patientName}` : ""}`}
        />
      )}

      <ConfirmDialog
        open={!!cancelFor}
        onOpenChange={(v) => {
          if (!v) setCancelFor(null);
        }}
        onConfirm={handleCancel}
        title="Cancelar lembrete"
        description="Tem certeza que deseja cancelar este lembrete? Esta ação será registrada na auditoria."
        confirmLabel="Cancelar lembrete"
        destructive
      />
    </>
  );
}

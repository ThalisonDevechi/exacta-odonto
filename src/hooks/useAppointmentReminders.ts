import { useCallback, useEffect, useState } from "react";
import {
  appointmentReminderService,
  type ReminderWithRelations,
  type AppointmentReminderInsert,
} from "@/services/appointmentReminderService";
import { communicationLogService } from "@/services/communicationLogService";
import { logAudit } from "@/lib/audit";

export type ReminderScope =
  | { kind: "all" }
  | { kind: "pending" }
  | { kind: "appointment"; appointmentId: string }
  | { kind: "patient"; patientId: string };

export function useAppointmentReminders(scope: ReminderScope = { kind: "all" }) {
  const [reminders, setReminders] = useState<ReminderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      let data: ReminderWithRelations[] = [];
      switch (scope.kind) {
        case "pending":
          data = await appointmentReminderService.listPending();
          break;
        case "appointment":
          data = await appointmentReminderService.listByAppointment(scope.appointmentId);
          break;
        case "patient":
          data = await appointmentReminderService.listByPatient(scope.patientId);
          break;
        default:
          data = await appointmentReminderService.listAll();
      }
      setReminders(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar lembretes.");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(
    async (payload: AppointmentReminderInsert) => {
      const r = await appointmentReminderService.create(payload);
      await logAudit("reminder.create", "appointment_reminders", r.id, {
        appointment_id: r.appointment_id,
        type: r.reminder_type,
        channel: r.channel,
      });
      await refetch();
      return r;
    },
    [refetch],
  );

  const prepare = useCallback(
    async (id: string, message: string) => {
      const r = await appointmentReminderService.markPrepared(id, message);
      await logAudit("reminder.prepare", "appointment_reminders", id, { channel: r.channel });
      await refetch();
      return r;
    },
    [refetch],
  );

  const markSent = useCallback(
    async (id: string) => {
      const r = await appointmentReminderService.markSentManual(id);
      await logAudit("reminder.sent_manual", "appointment_reminders", id, { channel: r.channel });
      // Auto-create communication log linked to this reminder
      try {
        await communicationLogService.create({
          patient_id: r.patient_id,
          appointment_id: r.appointment_id,
          reminder_id: r.id,
          channel: r.channel,
          type: "lembrete_consulta",
          direction: "enviada",
          status: "enviada_manual",
          message: r.message ?? null,
        });
      } catch {
        /* non-blocking */
      }
      await refetch();
      return r;
    },
    [refetch],
  );

  const cancel = useCallback(
    async (id: string, reason: string) => {
      const r = await appointmentReminderService.cancel(id, reason);
      await logAudit("reminder.cancel", "appointment_reminders", id, { reason });
      await refetch();
      return r;
    },
    [refetch],
  );

  return { reminders, loading, error, refetch, create, prepare, markSent, cancel };
}

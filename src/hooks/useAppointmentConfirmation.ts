import { useCallback } from "react";
import { appointmentConfirmationService, type SetConfirmationInput } from "@/services/appointmentConfirmationService";
import { logAudit } from "@/lib/audit";

export function useAppointmentConfirmation() {
  const setStatus = useCallback(async (input: SetConfirmationInput) => {
    await appointmentConfirmationService.setStatus(input);
    const action =
      input.status === "confirmada" ? "appointment.confirm" :
      input.status === "recusada" ? "appointment.confirm.refuse" :
      input.status === "sem_resposta" ? "appointment.confirm.no_response" :
      "appointment.update";
    await logAudit(action, "appointment", input.appointmentId, {
      status: input.status,
      channel: input.channel ?? null,
    });
  }, []);

  return { setStatus };
}

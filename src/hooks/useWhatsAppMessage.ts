import { useCallback } from "react";
import { openWhatsApp, isValidWhatsAppPhone } from "@/services/whatsappService";
import { logAudit } from "@/lib/audit";
import { communicationLogService, type CommunicationType } from "@/services/communicationLogService";

export interface WhatsAppPrepareInput {
  phone: string | null | undefined;
  message: string;
  context?: string;
  entity?: string;
  entityId?: string | null;
  /** When provided, automatically creates a communication_log linked to this patient. */
  patientId?: string | null;
  /** Optional foreign keys for richer linkage. */
  appointmentId?: string | null;
  financialRecordId?: string | null;
  budgetId?: string | null;
  receiptId?: string | null;
  /** Communication type for the log entry (defaults to atendimento_manual). */
  communicationType?: CommunicationType;
}

export function useWhatsAppMessage() {
  const send = useCallback(
    async ({
      phone,
      message,
      context,
      entity,
      entityId,
      patientId,
      appointmentId,
      financialRecordId,
      budgetId,
      receiptId,
      communicationType = "atendimento_manual",
    }: WhatsAppPrepareInput) => {
      openWhatsApp(phone, message);
      await logAudit("whatsapp.prepare", entity ?? "communication", entityId ?? null, {
        context: context ?? null,
        phone_present: Boolean(phone),
        patient_id: patientId ?? null,
      });
      // Auto-create a communication log when the recipient patient is known.
      if (patientId) {
        try {
          await communicationLogService.create({
            patient_id: patientId,
            appointment_id: appointmentId ?? null,
            financial_record_id: financialRecordId ?? null,
            budget_id: budgetId ?? null,
            receipt_id: receiptId ?? null,
            channel: "whatsapp",
            type: communicationType,
            direction: "enviada",
            status: "enviada_manual",
            message,
          });
          await logAudit("communication.create", "communication_logs", null, {
            origin: "whatsapp.prepare",
            patient_id: patientId,
            type: communicationType,
          });
        } catch {
          /* non-blocking */
        }
      }
    },
    [],
  );

  return { send, isValidPhone: isValidWhatsAppPhone };
}

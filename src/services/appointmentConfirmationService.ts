import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ConfirmationStatus = Database["public"]["Enums"]["appointment_confirmation_status"];
export type CommunicationChannel = Database["public"]["Enums"]["communication_channel"];

export const CONFIRMATION_STATUS_LABELS: Record<ConfirmationStatus, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  recusada: "Recusada",
  sem_resposta: "Sem Resposta",
};

export const COMMUNICATION_CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  presencial: "Presencial",
  email: "E-mail",
  sms: "SMS",
  outro: "Outro",
};

export interface SetConfirmationInput {
  appointmentId: string;
  status: ConfirmationStatus;
  channel?: CommunicationChannel | null;
  notes?: string | null;
  userId?: string | null;
}

export const appointmentConfirmationService = {
  async setStatus({ appointmentId, status, channel = null, notes = null, userId = null }: SetConfirmationInput): Promise<void> {
    const payload = {
      confirmation_status: status,
      confirmation_channel: channel,
      confirmation_notes: notes?.trim() || null,
      confirmed_at: status === "pendente" ? null : new Date().toISOString(),
      confirmed_by: status === "pendente" ? null : userId,
    };
    const { error } = await supabase.from("appointments").update(payload).eq("id", appointmentId);
    if (error) throw error;
  },
};

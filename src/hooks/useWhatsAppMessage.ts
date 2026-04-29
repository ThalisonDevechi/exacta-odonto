import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { openWhatsApp } from "@/services/whatsappService";
import { communicationLogService, type CommunicationType } from "@/services/communicationLogService";

export type WhatsAppMessage = {
  id: string;
  patient_id: string;
  direction: "inbound" | "outbound";
  content: string;
  sender_type?: "bot" | "user";
  sender_id?: string;
  sender_name?: string;
  created_at: string;
};

type ManualWhatsAppParams = {
  phone: string | null | undefined;
  message: string;
  context?: string;
  entity?: string;
  entityId?: string | null;
  patientId?: string | null;
  appointmentId?: string | null;
  financialRecordId?: string | null;
  budgetId?: string | null;
  receiptId?: string | null;
  communicationType?: CommunicationType;
};

// ==========================================
// 1. Chat em tempo real
// ==========================================
export function useWhatsAppMessages(patientId: string | null) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("whatsapp_messages")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: true });

      if (data) setMessages(data as WhatsAppMessage[]);
      setLoading(false);
    };

    fetchMessages();

    const channel = (supabase as any)
      .channel(`messages-${patientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_messages", filter: `patient_id=eq.${patientId}` },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new as WhatsAppMessage]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId]);

  const sendMessage = async (content: string, senderId?: string, senderName?: string) => {
    if (!patientId) return;
    const { error } = await (supabase as any).from("whatsapp_messages").insert({
      patient_id: patientId,
      direction: "outbound",
      content,
      sender_id: senderId,
      sender_name: senderName,
      sender_type: "user",
    });
    if (error) throw error;
  };

  return { messages, loading, sendMessage };
}

// ==========================================
// 2. Envio manual pelos modais
// ==========================================
export function useWhatsAppMessage() {
  const send = async (params: ManualWhatsAppParams) => {
    openWhatsApp(params.phone, params.message);

    // Só grava no histórico quando há paciente. Sem patient_id a tabela rejeita a inserção,
    // então evitamos erro 400/console em fluxos sem contexto clínico.
    if (!params.patientId) return;

    await communicationLogService.create({
      patient_id: params.patientId,
      appointment_id: params.appointmentId ?? null,
      financial_record_id: params.financialRecordId ?? null,
      budget_id: params.budgetId ?? null,
      receipt_id: params.receiptId ?? null,
      channel: "whatsapp",
      direction: "enviada",
      status: "enviada_manual",
      type: params.communicationType ?? "atendimento_manual",
      message: params.message,
    });
  };

  return { send };
}

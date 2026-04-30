import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { openWhatsApp } from "@/services/whatsappService";
import { communicationLogService, type CommunicationType } from "@/services/communicationLogService";

export type WhatsAppMessage = {
  id: string;
  patient_id: string;
  direction: "inbound" | "outbound";
  content: string;
  sender_type?: "bot" | "user" | null;
  sender_id?: string | null;
  sender_name?: string | null;
  status?: "queued" | "sent" | "failed" | "received" | null;
  provider_message_id?: string | null;
  sent_at?: string | null;
  error_message?: string | null;
  created_at: string;
};

type RealtimeStatus = "idle" | "connecting" | "subscribed" | "error" | "closed" | "timeout";

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
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("idle");

  const upsertMessage = useCallback((message: WhatsAppMessage) => {
    setMessages((prev) => {
      const exists = prev.some((item) => item.id === message.id);

      const next = exists
        ? prev.map((item) => (item.id === message.id ? { ...item, ...message } : item))
        : [...prev, message];

      return next.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    });
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const fetchMessages = useCallback(async (targetPatientId: string) => {
    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("whatsapp_messages")
      .select("*")
      .eq("patient_id", targetPatientId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao carregar mensagens do WhatsApp:", error);
      setMessages([]);
    } else {
      setMessages((data ?? []) as WhatsAppMessage[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!patientId) {
      setMessages([]);
      setRealtimeStatus("idle");
      return;
    }

    let isActive = true;

    setRealtimeStatus("connecting");
    void fetchMessages(patientId);

    const channel = (supabase as any)
      .channel(`whatsapp-messages-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload: any) => {
          if (!isActive) return;

          if (payload.eventType === "DELETE") {
            const deletedId = payload.old?.id;
            if (deletedId) removeMessage(deletedId);
            return;
          }

          if (payload.new) {
            upsertMessage(payload.new as WhatsAppMessage);
          }
        },
      )
      .subscribe((status: string, error?: Error) => {
        if (!isActive) return;

        if (status === "SUBSCRIBED") setRealtimeStatus("subscribed");

        if (status === "CHANNEL_ERROR") {
          console.error("Erro no canal Realtime do WhatsApp:", error);
          setRealtimeStatus("error");
        }

        if (status === "TIMED_OUT") setRealtimeStatus("timeout");
        if (status === "CLOSED") setRealtimeStatus("closed");
      });

    return () => {
      isActive = false;
      void supabase.removeChannel(channel);
    };
  }, [fetchMessages, patientId, removeMessage, upsertMessage]);

  const sendMessage = async (content: string, senderId?: string, senderName?: string) => {
    if (!patientId) return;

    const { data, error } = await (supabase as any)
      .from("whatsapp_messages")
      .insert({
        patient_id: patientId,
        direction: "outbound",
        content,
        sender_id: senderId ?? null,
        sender_name: senderName ?? null,
        sender_type: "user",
        status: "queued",
      })
      .select("*")
      .single();

    if (error) throw error;

    // Mensagem aparece imediatamente.
    // Quando o Realtime chegar, o upsert evita duplicação.
    if (data) upsertMessage(data as WhatsAppMessage);
  };

  return { messages, loading, realtimeStatus, sendMessage, refetch: fetchMessages };
}

// ==========================================
// 2. Envio manual pelos modais
// ==========================================
export function useWhatsAppMessage() {
  const send = async (params: ManualWhatsAppParams) => {
    openWhatsApp(params.phone, params.message);

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

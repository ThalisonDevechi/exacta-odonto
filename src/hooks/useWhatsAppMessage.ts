import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { openWhatsApp } from "@/services/whatsappService";
import { communicationLogService } from "@/services/communicationLogService";

export type WhatsAppMessage = {
  id: string;
  patient_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  sender_type?: 'bot' | 'user';
  sender_id?: string;
  sender_name?: string;
  created_at: string;
};

// ==========================================
// 1. O HOOK NOVO (Para o Chat em Tempo Real)
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
        }
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
      sender_type: "user" 
    });
    if (error) throw error;
  };

  return { messages, loading, sendMessage };
}

// ==========================================
// 2. O HOOK ANTIGO RESTAURADO (Para os Modais de Lembrete)
// ==========================================
export function useWhatsAppMessage() {
  const send = async (params: any) => {
    // Abre a aba do WhatsApp Web/App
    openWhatsApp(params.phone, params.message);
    
    // Salva no histórico de comunicação do paciente
    try {
      await communicationLogService.create({
        patient_id: params.patientId || null,
        appointment_id: params.appointmentId || null,
        channel: "whatsapp",
        direction: "enviada",
        status: "enviada_manual",
        type: params.communicationType || "atendimento_manual",
        content: params.message,
        notes: params.context ? `Enviado via: ${params.context}` : null
      });
    } catch (err) {
      console.error("Erro ao salvar log de comunicação", err);
    }
  };

  return { send };
}

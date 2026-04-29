import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export function useWhatsAppMessages(patientId: string | null) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId) {
      setMessages([]);
      return;
    }

    // 1. Busca o histórico de mensagens
    const fetchMessages = async () => {
      setLoading(true);
      // CORREÇÃO: (supabase as any) para o Vercel não chiar da tabela nova
      const { data } = await (supabase as any)
        .from("whatsapp_messages")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: true });
        
      if (data) setMessages(data as WhatsAppMessage[]);
      setLoading(false);
    };

    fetchMessages();

    // 2. Fica "escutando" o banco em tempo real
    const channel = supabase
      .channel(`messages-${patientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_messages", filter: `patient_id=eq.${patientId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as WhatsAppMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId]);

  // 3. Função para salvar nossa mensagem enviada com dados de quem enviou
  const sendMessage = async (content: string, senderId?: string, senderName?: string) => {
    if (!patientId) return;
    // CORREÇÃO: (supabase as any) aqui também
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

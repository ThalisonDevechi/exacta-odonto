import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CommunicationLog = Database["public"]["Tables"]["communication_logs"]["Row"];
export type CommunicationLogInsert = Database["public"]["Tables"]["communication_logs"]["Insert"];
export type CommunicationLogUpdate = Database["public"]["Tables"]["communication_logs"]["Update"];
export type CommunicationType = Database["public"]["Enums"]["communication_type"];
export type CommunicationDirection = Database["public"]["Enums"]["communication_direction"];
export type CommunicationStatus = Database["public"]["Enums"]["communication_status"];
export type CommunicationChannel = Database["public"]["Enums"]["communication_channel"];

export const COMMUNICATION_TYPE_LABELS: Record<CommunicationType, string> = {
  lembrete_consulta: "Lembrete de consulta",
  confirmacao_consulta: "Confirmação de consulta",
  cobranca: "Cobrança",
  envio_orcamento: "Envio de orçamento",
  envio_recibo: "Envio de recibo",
  retorno_pos_atendimento: "Retorno pós-atendimento",
  atendimento_manual: "Atendimento manual",
  outro: "Outro",
};

export const COMMUNICATION_CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  email: "E-mail",
  presencial: "Presencial",
  sms: "SMS",
  outro: "Outro",
};

export const COMMUNICATION_DIRECTION_LABELS: Record<CommunicationDirection, string> = {
  enviada: "Enviada",
  recebida: "Recebida",
};

export const COMMUNICATION_STATUS_LABELS: Record<CommunicationStatus, string> = {
  registrada: "Registrada",
  enviada_manual: "Enviada manualmente",
  sem_resposta: "Sem resposta",
  respondida: "Respondida",
  falhou: "Falhou",
};

export interface CommunicationFilter {
  patientId?: string;
  appointmentId?: string;
  channel?: CommunicationChannel;
  type?: CommunicationType;
  startDate?: string;
  endDate?: string;
}

export const communicationLogService = {
  async list(filter: CommunicationFilter = {}): Promise<CommunicationLog[]> {
    let q = supabase.from("communication_logs").select("*").order("created_at", { ascending: false });
    if (filter.patientId) q = q.eq("patient_id", filter.patientId);
    if (filter.appointmentId) q = q.eq("appointment_id", filter.appointmentId);
    if (filter.channel) q = q.eq("channel", filter.channel);
    if (filter.type) q = q.eq("type", filter.type);
    if (filter.startDate) q = q.gte("created_at", filter.startDate);
    if (filter.endDate) q = q.lte("created_at", filter.endDate);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async create(payload: CommunicationLogInsert): Promise<CommunicationLog> {
    const { data: auth } = await supabase.auth.getUser();
    const responsibleUserId = payload.responsible_user_id ?? auth.user?.id ?? null;
    let responsibleName = payload.responsible_name ?? null;
    if (responsibleUserId && !responsibleName) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", responsibleUserId)
        .maybeSingle();
      responsibleName = profile?.name ?? null;
    }
    const { data, error } = await supabase
      .from("communication_logs")
      .insert({ ...payload, responsible_user_id: responsibleUserId, responsible_name: responsibleName })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: CommunicationLogUpdate): Promise<CommunicationLog> {
    const { data, error } = await supabase
      .from("communication_logs")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

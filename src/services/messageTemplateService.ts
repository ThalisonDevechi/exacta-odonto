import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type MessageTemplate = Database["public"]["Tables"]["message_templates"]["Row"];
export type MessageTemplateInsert = Database["public"]["Tables"]["message_templates"]["Insert"];
export type MessageTemplateUpdate = Database["public"]["Tables"]["message_templates"]["Update"];
export type MessageTemplateType = Database["public"]["Enums"]["message_template_type"];
export type MessageChannel = Database["public"]["Enums"]["message_channel"];

export const MESSAGE_TYPE_LABELS: Record<MessageTemplateType, string> = {
  confirmacao_consulta: "Confirmação de Consulta",
  lembrete_consulta: "Lembrete de Consulta",
  cobranca: "Cobrança",
  orcamento: "Orçamento",
  recibo: "Recibo",
  retorno_pos_atendimento: "Retorno Pós-Atendimento",
  aniversario: "Aniversário",
  outro: "Outro",
};

export const MESSAGE_CHANNEL_LABELS: Record<MessageChannel, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  sms: "SMS",
  outro: "Outro",
};

export interface TemplateVars {
  nome_paciente?: string;
  nome_clinica?: string;
  data_consulta?: string;
  horario_consulta?: string;
  nome_dentista?: string;
  valor_pendente?: string;
  link_orcamento?: string;
  link_recibo?: string;
  whatsapp_clinica?: string;
}

export function renderTemplate(body: string, vars: TemplateVars): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key as keyof TemplateVars];
    return v ?? `{{${key}}}`;
  });
}

export const messageTemplateService = {
  async list(includeInactive = true): Promise<MessageTemplate[]> {
    let q = supabase.from("message_templates").select("*").order("name");
    if (!includeInactive) q = q.eq("active", true);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },
  async create(payload: MessageTemplateInsert): Promise<MessageTemplate> {
    const { data, error } = await supabase.from("message_templates").insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, payload: MessageTemplateUpdate): Promise<MessageTemplate> {
    const { data, error } = await supabase.from("message_templates").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return data;
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("message_templates").delete().eq("id", id);
    if (error) throw error;
  },
};

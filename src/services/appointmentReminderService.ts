import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppointmentReminder = Database["public"]["Tables"]["appointment_reminders"]["Row"];
export type AppointmentReminderInsert = Database["public"]["Tables"]["appointment_reminders"]["Insert"];
export type AppointmentReminderUpdate = Database["public"]["Tables"]["appointment_reminders"]["Update"];
export type ReminderType = Database["public"]["Enums"]["reminder_type"];
export type ReminderStatus = Database["public"]["Enums"]["reminder_status"];
export type CommunicationChannel = Database["public"]["Enums"]["communication_channel"];

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  vinte_quatro_horas_antes: "24h antes",
  no_dia: "No dia",
  personalizado: "Personalizado",
};

export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  pendente: "Pendente",
  preparado: "Preparado",
  enviado_manual: "Enviado manualmente",
  cancelado: "Cancelado",
  falhou: "Falhou",
};

export const REMINDER_STATUS_VARIANTS: Record<ReminderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  pendente: "secondary",
  preparado: "outline",
  enviado_manual: "default",
  cancelado: "outline",
  falhou: "destructive",
};

export interface ReminderRelations {
  patients: { id: string; name: string; phone: string | null } | null;
  appointments: { id: string; date: string; start_time: string; end_time: string } | null;
}

export type ReminderWithRelations = AppointmentReminder & ReminderRelations;

async function attachRelations(rows: AppointmentReminder[]): Promise<ReminderWithRelations[]> {
  if (!rows.length) return [];
  const patientIds = Array.from(new Set(rows.map((r) => r.patient_id)));
  const apptIds = Array.from(new Set(rows.map((r) => r.appointment_id)));
  const [{ data: patients }, { data: appointments }] = await Promise.all([
    supabase.from("patients").select("id,name,phone").in("id", patientIds),
    supabase.from("appointments").select("id,date,start_time,end_time").in("id", apptIds),
  ]);
  const pMap = new Map((patients ?? []).map((p) => [p.id, p]));
  const aMap = new Map((appointments ?? []).map((a) => [a.id, a]));
  return rows.map((r) => ({
    ...r,
    patients: pMap.get(r.patient_id) ?? null,
    appointments: aMap.get(r.appointment_id) ?? null,
  }));
}

export const appointmentReminderService = {
  async listAll(): Promise<ReminderWithRelations[]> {
    const { data, error } = await supabase
      .from("appointment_reminders")
      .select("*")
      .order("scheduled_for", { ascending: true });
    if (error) throw error;
    return attachRelations(data ?? []);
  },

  async listPending(): Promise<ReminderWithRelations[]> {
    const { data, error } = await supabase
      .from("appointment_reminders")
      .select("*")
      .in("status", ["pendente", "preparado"])
      .order("scheduled_for", { ascending: true });
    if (error) throw error;
    return attachRelations(data ?? []);
  },

  async listByAppointment(appointmentId: string): Promise<ReminderWithRelations[]> {
    const { data, error } = await supabase
      .from("appointment_reminders")
      .select("*")
      .eq("appointment_id", appointmentId)
      .order("scheduled_for", { ascending: true });
    if (error) throw error;
    return attachRelations(data ?? []);
  },

  async listByPatient(patientId: string): Promise<ReminderWithRelations[]> {
    const { data, error } = await supabase
      .from("appointment_reminders")
      .select("*")
      .eq("patient_id", patientId)
      .order("scheduled_for", { ascending: true });
    if (error) throw error;
    return attachRelations(data ?? []);
  },

  async create(payload: AppointmentReminderInsert): Promise<AppointmentReminder> {
    const { data, error } = await supabase
      .from("appointment_reminders")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: AppointmentReminderUpdate): Promise<AppointmentReminder> {
    const { data, error } = await supabase
      .from("appointment_reminders")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markPrepared(id: string, message: string): Promise<AppointmentReminder> {
    return this.update(id, { status: "preparado", message });
  },

  async markSentManual(id: string): Promise<AppointmentReminder> {
    return this.update(id, { status: "enviado_manual", sent_at: new Date().toISOString() });
  },

  async cancel(id: string, reason: string): Promise<AppointmentReminder> {
    return this.update(id, { status: "cancelado", cancelled_reason: reason });
  },

  async markFailed(id: string, reason: string): Promise<AppointmentReminder> {
    return this.update(id, { status: "falhou", cancelled_reason: reason });
  },
};

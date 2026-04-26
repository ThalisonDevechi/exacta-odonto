import { supabase } from "@/integrations/supabase/client";

export type ExportType =
  | "pacientes"
  | "consultas"
  | "financeiro"
  | "procedimentos"
  | "planos_tratamento"
  | "logs_auditoria"
  | "recibos"
  | "orcamentos"
  | "comunicacoes"
  | "lembretes"
  | "assinaturas";

export type ExportFormat = "csv";

export interface ExportLogRow {
  id: string;
  user_id: string | null;
  user_name: string | null;
  export_type: ExportType;
  filters: Record<string, unknown> | null;
  format: ExportFormat;
  total_records: number;
  created_at: string;
}

export interface DateRangeFilter {
  startDate?: string; // ISO yyyy-MM-dd
  endDate?: string;
}

/* ---------- helpers ---------- */

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "object" ? JSON.stringify(value) : String(value);
  const needsQuote = /[",\n;]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

function buildCsv<T extends Record<string, unknown>>(rows: T[], headers: { key: keyof T; label: string }[]): string {
  const headerRow = headers.map(h => escapeCsv(h.label)).join(";");
  const body = rows
    .map(r => headers.map(h => escapeCsv(r[h.key])).join(";"))
    .join("\n");
  return "\uFEFF" + headerRow + "\n" + body;
}

function todayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

function fmtMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return "";
  return n.toFixed(2).replace(".", ",");
}

function fileNameFor(type: ExportType): string {
  return `exacta-odonto-${type.replace(/_/g, "-")}-${todayStamp()}.csv`;
}

function applyDateRange<TQuery extends { gte: (col: string, v: string) => TQuery; lte: (col: string, v: string) => TQuery }>(
  query: TQuery,
  column: string,
  filters?: DateRangeFilter,
): TQuery {
  if (filters?.startDate) query = query.gte(column, filters.startDate);
  if (filters?.endDate) query = query.lte(column, filters.endDate);
  return query;
}

/* ---------- export log ---------- */

export async function createExportLog(
  exportType: ExportType,
  totalRecords: number,
  filters?: Record<string, unknown> | null,
  format: ExportFormat = "csv",
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();
  await supabase.from("export_logs").insert({
    user_id: user.id,
    user_name: profile?.name ?? user.email ?? null,
    export_type: exportType,
    filters: (filters ?? null) as never,
    format,
    total_records: totalRecords,
  });
}

export async function listExportLogs(limit = 100): Promise<ExportLogRow[]> {
  const { data, error } = await supabase
    .from("export_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ExportLogRow[];
}

/* ---------- per-type exports ---------- */

export async function exportPatients(filters?: DateRangeFilter): Promise<number> {
  let q = supabase.from("patients").select("*").order("name");
  q = applyDateRange(q, "created_at", filters);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).map(p => ({
    ...p,
    birth_date: p.birth_date ?? "",
    created_at: fmtDate(p.created_at),
    updated_at: fmtDate(p.updated_at),
  }));
  const csv = buildCsv(rows, [
    { key: "id", label: "ID" },
    { key: "name", label: "Nome" },
    { key: "cpf", label: "CPF" },
    { key: "rg", label: "RG" },
    { key: "birth_date", label: "Data Nascimento" },
    { key: "gender", label: "Gênero" },
    { key: "phone", label: "Telefone" },
    { key: "email", label: "E-mail" },
    { key: "zip_code", label: "CEP" },
    { key: "address", label: "Endereço" },
    { key: "address_number", label: "Número" },
    { key: "neighborhood", label: "Bairro" },
    { key: "city", label: "Cidade" },
    { key: "state", label: "UF" },
    { key: "guardian_name", label: "Responsável" },
    { key: "guardian_cpf", label: "CPF Responsável" },
    { key: "guardian_phone", label: "Telefone Responsável" },
    { key: "guardian_relationship", label: "Parentesco" },
    { key: "status", label: "Status" },
    { key: "notes", label: "Observações" },
    { key: "created_at", label: "Criado em" },
    { key: "updated_at", label: "Atualizado em" },
  ]);
  downloadCsv(fileNameFor("pacientes"), csv);
  return rows.length;
}

export async function exportAppointments(filters?: DateRangeFilter): Promise<number> {
  let q = supabase.from("appointments").select("*, patients(name), dentists(name)").order("date", { ascending: false });
  q = applyDateRange(q, "date", filters);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).map((a: Record<string, unknown>) => {
    const patient = a.patients as { name?: string } | null;
    const dentist = a.dentists as { name?: string } | null;
    return {
      id: a.id,
      date: a.date,
      start_time: a.start_time,
      end_time: a.end_time,
      patient_name: patient?.name ?? "",
      dentist_name: dentist?.name ?? "",
      appointment_type: a.appointment_type,
      status: a.status,
      confirmation_status: a.confirmation_status,
      notes: a.notes,
      cancellation_reason: a.cancellation_reason,
      created_at: fmtDate(a.created_at as string),
      updated_at: fmtDate(a.updated_at as string),
    };
  });
  const csv = buildCsv(rows, [
    { key: "id", label: "ID" },
    { key: "date", label: "Data" },
    { key: "start_time", label: "Início" },
    { key: "end_time", label: "Fim" },
    { key: "patient_name", label: "Paciente" },
    { key: "dentist_name", label: "Dentista" },
    { key: "appointment_type", label: "Tipo" },
    { key: "status", label: "Status" },
    { key: "confirmation_status", label: "Confirmação" },
    { key: "notes", label: "Observações" },
    { key: "cancellation_reason", label: "Motivo Cancelamento" },
    { key: "created_at", label: "Criado em" },
    { key: "updated_at", label: "Atualizado em" },
  ]);
  downloadCsv(fileNameFor("consultas"), csv);
  return rows.length;
}

export async function exportFinancialRecords(filters?: DateRangeFilter): Promise<number> {
  let q = supabase.from("financial_records").select("*, patients(name)").order("created_at", { ascending: false });
  q = applyDateRange(q, "created_at", filters);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).map((r: Record<string, unknown>) => {
    const patient = r.patients as { name?: string } | null;
    return {
      id: r.id,
      patient_name: patient?.name ?? "",
      description: r.description,
      original_value: fmtMoney(r.original_value as number),
      discount_value: fmtMoney(r.discount_value as number),
      final_value: fmtMoney(r.final_value as number),
      paid_value: fmtMoney(r.paid_value as number),
      remaining_value: fmtMoney(r.remaining_value as number),
      status: r.status,
      payment_method: r.payment_method,
      due_date: r.due_date,
      payment_date: r.payment_date,
      cancelled_reason: r.cancelled_reason,
      refunded_reason: r.refunded_reason,
      created_at: fmtDate(r.created_at as string),
      updated_at: fmtDate(r.updated_at as string),
    };
  });
  const csv = buildCsv(rows, [
    { key: "id", label: "ID" },
    { key: "patient_name", label: "Paciente" },
    { key: "description", label: "Descrição" },
    { key: "original_value", label: "Valor Original" },
    { key: "discount_value", label: "Desconto" },
    { key: "final_value", label: "Valor Final" },
    { key: "paid_value", label: "Pago" },
    { key: "remaining_value", label: "Saldo" },
    { key: "status", label: "Status" },
    { key: "payment_method", label: "Pagamento" },
    { key: "due_date", label: "Vencimento" },
    { key: "payment_date", label: "Data Pagamento" },
    { key: "cancelled_reason", label: "Motivo Cancelamento" },
    { key: "refunded_reason", label: "Motivo Estorno" },
    { key: "created_at", label: "Criado em" },
    { key: "updated_at", label: "Atualizado em" },
  ]);
  downloadCsv(fileNameFor("financeiro"), csv);
  return rows.length;
}

export async function exportProcedures(filters?: DateRangeFilter): Promise<number> {
  let q = supabase.from("procedures").select("*, patients(name), dentists(name)").order("created_at", { ascending: false });
  q = applyDateRange(q, "created_at", filters);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).map((p: Record<string, unknown>) => {
    const patient = p.patients as { name?: string } | null;
    const dentist = p.dentists as { name?: string } | null;
    return {
      id: p.id,
      patient_name: patient?.name ?? "",
      dentist_name: dentist?.name ?? "",
      name: p.name,
      description: p.description,
      tooth_number: p.tooth_number,
      tooth_face: p.tooth_face,
      value: fmtMoney(p.value as number),
      status: p.status,
      planned_date: p.planned_date,
      performed_date: p.performed_date,
      cancelled_reason: p.cancelled_reason,
      created_at: fmtDate(p.created_at as string),
      updated_at: fmtDate(p.updated_at as string),
    };
  });
  const csv = buildCsv(rows, [
    { key: "id", label: "ID" },
    { key: "patient_name", label: "Paciente" },
    { key: "dentist_name", label: "Dentista" },
    { key: "name", label: "Procedimento" },
    { key: "description", label: "Descrição" },
    { key: "tooth_number", label: "Dente" },
    { key: "tooth_face", label: "Face" },
    { key: "value", label: "Valor" },
    { key: "status", label: "Status" },
    { key: "planned_date", label: "Planejado para" },
    { key: "performed_date", label: "Realizado em" },
    { key: "cancelled_reason", label: "Motivo Cancelamento" },
    { key: "created_at", label: "Criado em" },
    { key: "updated_at", label: "Atualizado em" },
  ]);
  downloadCsv(fileNameFor("procedimentos"), csv);
  return rows.length;
}

export async function exportTreatmentPlans(filters?: DateRangeFilter): Promise<number> {
  let q = supabase.from("treatment_plans").select("*, patients(name), dentists(name)").order("created_at", { ascending: false });
  q = applyDateRange(q, "created_at", filters);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).map((p: Record<string, unknown>) => {
    const patient = p.patients as { name?: string } | null;
    const dentist = p.dentists as { name?: string } | null;
    return {
      id: p.id,
      patient_name: patient?.name ?? "",
      dentist_name: dentist?.name ?? "",
      title: p.title,
      description: p.description,
      status: p.status,
      estimated_value: fmtMoney(p.estimated_value as number),
      final_value: fmtMoney(p.final_value as number),
      start_date: p.start_date,
      end_date: p.end_date,
      approved_at: fmtDate(p.approved_at as string),
      cancelled_reason: p.cancelled_reason,
      created_at: fmtDate(p.created_at as string),
      updated_at: fmtDate(p.updated_at as string),
    };
  });
  const csv = buildCsv(rows, [
    { key: "id", label: "ID" },
    { key: "patient_name", label: "Paciente" },
    { key: "dentist_name", label: "Dentista" },
    { key: "title", label: "Título" },
    { key: "description", label: "Descrição" },
    { key: "status", label: "Status" },
    { key: "estimated_value", label: "Valor Estimado" },
    { key: "final_value", label: "Valor Final" },
    { key: "start_date", label: "Início" },
    { key: "end_date", label: "Término" },
    { key: "approved_at", label: "Aprovado em" },
    { key: "cancelled_reason", label: "Motivo Cancelamento" },
    { key: "created_at", label: "Criado em" },
    { key: "updated_at", label: "Atualizado em" },
  ]);
  downloadCsv(fileNameFor("planos_tratamento"), csv);
  return rows.length;
}

export async function exportAuditLogs(filters?: DateRangeFilter): Promise<number> {
  let q = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(10000);
  q = applyDateRange(q, "created_at", filters);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).map(l => ({
    id: l.id,
    user_id: l.user_id,
    user_name: l.user_name,
    action: l.action,
    entity: l.entity,
    entity_id: l.entity_id,
    details: l.details ? JSON.stringify(l.details) : "",
    created_at: fmtDate(l.created_at),
  }));
  const csv = buildCsv(rows, [
    { key: "id", label: "ID" },
    { key: "user_id", label: "Usuário ID" },
    { key: "user_name", label: "Usuário" },
    { key: "action", label: "Ação" },
    { key: "entity", label: "Entidade" },
    { key: "entity_id", label: "Entidade ID" },
    { key: "details", label: "Detalhes" },
    { key: "created_at", label: "Data" },
  ]);
  downloadCsv(fileNameFor("logs_auditoria"), csv);
  return rows.length;
}

export async function exportReceipts(filters?: DateRangeFilter): Promise<number> {
  let q = supabase.from("payment_receipts").select("*, patients(name)").order("created_at", { ascending: false });
  q = applyDateRange(q, "created_at", filters);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).map((r: Record<string, unknown>) => {
    const patient = r.patients as { name?: string } | null;
    return {
      id: r.id,
      receipt_number: r.receipt_number,
      patient_name: patient?.name ?? "",
      financial_record_id: r.financial_record_id,
      amount: fmtMoney(r.amount as number),
      payment_method: r.payment_method,
      payment_date: r.payment_date,
      description: r.description,
      notes: r.notes,
      released_to_patient: r.released_to_patient ? "Sim" : "Não",
      created_at: fmtDate(r.created_at as string),
    };
  });
  const csv = buildCsv(rows, [
    { key: "id", label: "ID" },
    { key: "receipt_number", label: "Número" },
    { key: "patient_name", label: "Paciente" },
    { key: "financial_record_id", label: "Lançamento ID" },
    { key: "amount", label: "Valor" },
    { key: "payment_method", label: "Pagamento" },
    { key: "payment_date", label: "Data Pagamento" },
    { key: "description", label: "Descrição" },
    { key: "notes", label: "Observações" },
    { key: "released_to_patient", label: "Liberado ao Paciente" },
    { key: "created_at", label: "Criado em" },
  ]);
  downloadCsv(fileNameFor("recibos"), csv);
  return rows.length;
}

export async function exportBudgets(filters?: DateRangeFilter): Promise<number> {
  let q = supabase.from("treatment_budgets").select("*, patients(name), dentists(name)").order("created_at", { ascending: false });
  q = applyDateRange(q, "created_at", filters);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).map((b: Record<string, unknown>) => {
    const patient = b.patients as { name?: string } | null;
    const dentist = b.dentists as { name?: string } | null;
    return {
      id: b.id,
      budget_number: b.budget_number,
      patient_name: patient?.name ?? "",
      dentist_name: dentist?.name ?? "",
      title: b.title,
      description: b.description,
      status: b.status,
      subtotal: fmtMoney(b.subtotal as number),
      discount_value: fmtMoney(b.discount_value as number),
      total_value: fmtMoney(b.total_value as number),
      validity_date: b.validity_date,
      accepted_at: fmtDate(b.accepted_at as string),
      cancelled_reason: b.cancelled_reason,
      released_to_patient: b.released_to_patient ? "Sim" : "Não",
      created_at: fmtDate(b.created_at as string),
      updated_at: fmtDate(b.updated_at as string),
    };
  });
  const csv = buildCsv(rows, [
    { key: "id", label: "ID" },
    { key: "budget_number", label: "Número" },
    { key: "patient_name", label: "Paciente" },
    { key: "dentist_name", label: "Dentista" },
    { key: "title", label: "Título" },
    { key: "description", label: "Descrição" },
    { key: "status", label: "Status" },
    { key: "subtotal", label: "Subtotal" },
    { key: "discount_value", label: "Desconto" },
    { key: "total_value", label: "Total" },
    { key: "validity_date", label: "Validade" },
    { key: "accepted_at", label: "Aceito em" },
    { key: "cancelled_reason", label: "Motivo Cancelamento" },
    { key: "released_to_patient", label: "Liberado ao Paciente" },
    { key: "created_at", label: "Criado em" },
    { key: "updated_at", label: "Atualizado em" },
  ]);
  downloadCsv(fileNameFor("orcamentos"), csv);
  return rows.length;
}

export async function exportCommunications(filters?: DateRangeFilter): Promise<number> {
  let q = supabase.from("communication_logs").select("*, patients(name)").order("created_at", { ascending: false });
  q = applyDateRange(q, "created_at", filters);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).map((c: Record<string, unknown>) => {
    const patient = c.patients as { name?: string } | null;
    return {
      id: c.id,
      patient_name: patient?.name ?? "",
      type: c.type,
      channel: c.channel,
      direction: c.direction,
      status: c.status,
      message: c.message,
      responsible_name: c.responsible_name,
      appointment_id: c.appointment_id,
      budget_id: c.budget_id,
      receipt_id: c.receipt_id,
      financial_record_id: c.financial_record_id,
      reminder_id: c.reminder_id,
      created_at: fmtDate(c.created_at as string),
    };
  });
  const csv = buildCsv(rows, [
    { key: "id", label: "ID" },
    { key: "patient_name", label: "Paciente" },
    { key: "type", label: "Tipo" },
    { key: "channel", label: "Canal" },
    { key: "direction", label: "Direção" },
    { key: "status", label: "Status" },
    { key: "message", label: "Mensagem" },
    { key: "responsible_name", label: "Responsável" },
    { key: "appointment_id", label: "Consulta ID" },
    { key: "budget_id", label: "Orçamento ID" },
    { key: "receipt_id", label: "Recibo ID" },
    { key: "financial_record_id", label: "Financeiro ID" },
    { key: "reminder_id", label: "Lembrete ID" },
    { key: "created_at", label: "Data" },
  ]);
  downloadCsv(fileNameFor("comunicacoes"), csv);
  return rows.length;
}

export async function exportReminders(filters?: DateRangeFilter): Promise<number> {
  let q = supabase.from("appointment_reminders").select("*, patients(name)").order("scheduled_for", { ascending: false });
  q = applyDateRange(q, "scheduled_for", filters);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).map((r: Record<string, unknown>) => {
    const patient = r.patients as { name?: string } | null;
    return {
      id: r.id,
      appointment_id: r.appointment_id,
      patient_name: patient?.name ?? "",
      reminder_type: r.reminder_type,
      channel: r.channel,
      scheduled_for: fmtDate(r.scheduled_for as string),
      sent_at: fmtDate(r.sent_at as string),
      status: r.status,
      message: r.message,
      cancelled_reason: r.cancelled_reason,
      created_at: fmtDate(r.created_at as string),
    };
  });
  const csv = buildCsv(rows, [
    { key: "id", label: "ID" },
    { key: "appointment_id", label: "Consulta ID" },
    { key: "patient_name", label: "Paciente" },
    { key: "reminder_type", label: "Tipo" },
    { key: "channel", label: "Canal" },
    { key: "scheduled_for", label: "Agendado para" },
    { key: "sent_at", label: "Enviado em" },
    { key: "status", label: "Status" },
    { key: "message", label: "Mensagem" },
    { key: "cancelled_reason", label: "Motivo Cancelamento" },
    { key: "created_at", label: "Criado em" },
  ]);
  downloadCsv(fileNameFor("lembretes"), csv);
  return rows.length;
}

export async function exportSignatures(filters?: DateRangeFilter): Promise<number> {
  // Metadata only — never bulk-export image binaries
  let q = supabase.from("document_signatures").select("*, patients(name)").order("signed_at", { ascending: false });
  q = applyDateRange(q, "signed_at", filters);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []).map((s: Record<string, unknown>) => {
    const patient = s.patients as { name?: string } | null;
    return {
      id: s.id,
      document_type: s.document_type,
      document_id: s.document_id,
      patient_name: patient?.name ?? "",
      signer_name: s.signer_name,
      signer_document: s.signer_document,
      accepted_terms: s.accepted_terms ? "Sim" : "Não",
      signature_image_path: s.signature_image_path,
      signed_at: fmtDate(s.signed_at as string),
      created_at: fmtDate(s.created_at as string),
    };
  });
  const csv = buildCsv(rows, [
    { key: "id", label: "ID" },
    { key: "document_type", label: "Tipo Documento" },
    { key: "document_id", label: "Documento ID" },
    { key: "patient_name", label: "Paciente" },
    { key: "signer_name", label: "Assinante" },
    { key: "signer_document", label: "CPF/Documento" },
    { key: "accepted_terms", label: "Aceitou Termos" },
    { key: "signature_image_path", label: "Caminho Imagem" },
    { key: "signed_at", label: "Assinado em" },
    { key: "created_at", label: "Criado em" },
  ]);
  downloadCsv(fileNameFor("assinaturas"), csv);
  return rows.length;
}

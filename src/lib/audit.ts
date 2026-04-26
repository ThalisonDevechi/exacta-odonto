import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "login"
  | "logout"
  | "user.create"
  | "user.update"
  | "user.inactivate"
  | "user.block"
  | "user.reactivate"
  | "user.delete"
  | "patient.create"
  | "patient.update"
  | "patient.inactivate"
  | "patient.reactivate"
  | "patient.delete"
  | "appointment.create"
  | "appointment.update"
  | "appointment.reschedule"
  | "appointment.cancel"
  | "appointment.complete"
  | "appointment.miss"
  | "appointment.delete"
  | "access.denied"
  | "record.create"
  | "record.update"
  | "record.release"
  | "evolution.create"
  | "evolution.rectify"
  | "evolution.cancel"
  | "odontogram.create"
  | "odontogram.dentition.change"
  | "tooth.update"
  | "face.update"
  | "procedure.create"
  | "procedure.update"
  | "procedure.cancel"
  | "procedure.complete"
  | "treatment_plan.create"
  | "treatment_plan.update"
  | "treatment_plan.approve"
  | "treatment_plan.pause"
  | "treatment_plan.complete"
  | "treatment_plan.cancel"
  | "treatment_step.create"
  | "treatment_step.complete"
  | "treatment_step.cancel"
  | "financial.create"
  | "financial.payment"
  | "financial.partial_payment"
  | "financial.cancel"
  | "financial.refund"
  | "attachment.upload"
  | "attachment.release"
  | "attachment.deactivate"
  | "attachment.download"
  | "report.export"
  | "record.export"
  | "patient.portal.view"
  | "clinic_settings.update"
  | "clinic_settings.logo_upload"
  | "clinic_settings.logo_remove"
  | "message_template.create"
  | "message_template.update"
  | "message_template.delete"
  | "budget.create"
  | "budget.update"
  | "budget.issue"
  | "budget.accept"
  | "budget.reject"
  | "budget.cancel"
  | "budget.download"
  | "receipt.create"
  | "receipt.download"
  | "whatsapp.prepare"
  | "appointment.confirm"
  | "appointment.confirm.refuse"
  | "appointment.confirm.no_response"
  | "reminder.create"
  | "reminder.prepare"
  | "reminder.sent_manual"
  | "reminder.cancel"
  | "reminder.failed"
  | "communication.create"
  | "communication.update"
  | "communication.view"
  | "communication.link"
  | "signature.create"
  | "signature.view"
  | "signature.attach_to_document"
  | "signature.download"
  | "signature.failed"
  | "backup.view"
  | "backup.export"
  | "backup.denied";

export async function logAudit(
  action: AuditAction,
  entity: string,
  entityId: string | null,
  details?: Record<string, unknown>,
) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return;
    let name: string | null = null;
    const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
    name = profile?.name ?? user.email ?? null;
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_name: name,
      action,
      entity,
      entity_id: entityId,
      details: (details ?? null) as never,
    });
  } catch {
    // Silently ignore audit failures (do not block the main flow)
  }
}

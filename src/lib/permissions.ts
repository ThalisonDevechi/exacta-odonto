import { UserRole } from "./types";

interface Permission {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

type Module = "dashboard" | "patients" | "appointments" | "records" | "procedures" | "treatmentPlans" | "financial" | "reports" | "users" | "audit" | "odontogram" | "clinicSettings" | "messageTemplates" | "budgets" | "receipts" | "backupExports";

const permissions: Record<UserRole, Record<Module, Permission>> = {
  admin: {
    dashboard: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    patients: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    appointments: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    records: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    procedures: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    treatmentPlans: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    financial: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    audit: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    odontogram: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    clinicSettings: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    messageTemplates: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    budgets: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    receipts: { canView: true, canCreate: true, canEdit: false, canDelete: true },
    backupExports: { canView: true, canCreate: true, canEdit: false, canDelete: false },
  },
  receptionist: {
    dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    patients: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    appointments: { canView: true, canCreate: true, canEdit: true, canDelete: true },
    records: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    procedures: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    treatmentPlans: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    financial: { canView: true, canCreate: true, canEdit: false, canDelete: false }, // can receive payment but not edit value
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    audit: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    odontogram: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    clinicSettings: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    messageTemplates: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    budgets: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    receipts: { canView: true, canCreate: true, canEdit: false, canDelete: false },
    backupExports: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
  dentist: {
    dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    patients: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    appointments: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    records: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    procedures: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    treatmentPlans: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    financial: { canView: true, canCreate: true, canEdit: true, canDelete: false }, // can define value
    reports: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    audit: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    odontogram: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    clinicSettings: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    messageTemplates: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    budgets: { canView: true, canCreate: true, canEdit: true, canDelete: false },
    receipts: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    backupExports: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
  assistant: {
    dashboard: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    patients: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    appointments: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    records: { canView: true, canCreate: true, canEdit: true, canDelete: false }, // can edit records/observations
    procedures: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    treatmentPlans: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    financial: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    audit: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    odontogram: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    clinicSettings: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    messageTemplates: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    budgets: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    receipts: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    backupExports: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
  patient: {
    dashboard: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    patients: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    appointments: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    records: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    procedures: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    treatmentPlans: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    financial: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    reports: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    users: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    audit: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    odontogram: { canView: true, canCreate: false, canEdit: false, canDelete: false },
    clinicSettings: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    messageTemplates: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    budgets: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    receipts: { canView: false, canCreate: false, canEdit: false, canDelete: false },
    backupExports: { canView: false, canCreate: false, canEdit: false, canDelete: false },
  },
};

export function getPermission(role: UserRole, module: Module): Permission {
  return permissions[role]?.[module] ?? { canView: false, canCreate: false, canEdit: false, canDelete: false };
}

export function canAccess(role: UserRole, module: Module): boolean {
  return getPermission(role, module).canView;
}

// Granular action checks
export function canEditFinancialValue(role: UserRole): boolean {
  return role === "admin" || role === "dentist";
}

export function canReceivePayment(role: UserRole): boolean {
  return role === "admin" || role === "receptionist" || role === "dentist";
}

export function canEditOdontogram(role: UserRole): boolean {
  return role === "admin" || role === "dentist";
}

export function canEditRecord(role: UserRole): boolean {
  return role === "admin" || role === "dentist" || role === "assistant";
}

export function canPrintRecord(role: UserRole): boolean {
  return role === "admin" || role === "dentist";
}

export function canManageProcedures(role: UserRole): boolean {
  return role === "admin" || role === "dentist";
}

export function canManageTreatmentPlans(role: UserRole): boolean {
  return role === "admin" || role === "dentist";
}

export function canCreateFinancialRecord(role: UserRole): boolean {
  return role === "admin" || role === "dentist" || role === "receptionist";
}

export function canEditFinancialOriginalValue(role: UserRole): boolean {
  return role === "admin" || role === "dentist";
}

export function canCancelOrRefundFinancial(role: UserRole): boolean {
  return role === "admin" || role === "dentist";
}

export function canUploadAttachment(role: UserRole): boolean {
  return role === "admin" || role === "dentist" || role === "assistant" || role === "receptionist";
}

export function canManageAttachment(role: UserRole): boolean {
  return role === "admin" || role === "dentist" || role === "assistant";
}

// Phase 5 — granular helpers
export function canManageBudgetValues(role: UserRole): boolean {
  return role === "admin" || role === "dentist";
}

export function canIssueReceipt(role: UserRole): boolean {
  return role === "admin" || role === "receptionist" || role === "dentist";
}

export function canManageClinicSettings(role: UserRole): boolean {
  return role === "admin";
}

export function canManageMessageTemplates(role: UserRole): boolean {
  return role === "admin";
}

export function canConfirmAppointment(role: UserRole): boolean {
  return role === "admin" || role === "receptionist" || role === "dentist";
}

export function canSendWhatsApp(role: UserRole): boolean {
  return role === "admin" || role === "receptionist" || role === "dentist" || role === "assistant";
}

// Phase 5 part 2 — Reminders & Communication
export function canManageReminders(role: UserRole): boolean {
  return role === "admin" || role === "receptionist" || role === "dentist";
}

export function canViewReminders(role: UserRole): boolean {
  return role === "admin" || role === "receptionist" || role === "dentist" || role === "assistant";
}

export function canRegisterCommunication(role: UserRole): boolean {
  return role === "admin" || role === "receptionist" || role === "dentist";
}

export function canViewCommunication(role: UserRole): boolean {
  return role === "admin" || role === "receptionist" || role === "dentist" || role === "assistant";
}

// Phase 5 part 2 — Digital signatures
export function canViewSignatures(role: UserRole): boolean {
  return role === "admin" || role === "receptionist" || role === "dentist" || role === "assistant";
}

/**
 * Whether the role may collect (create) a signature for a given document type.
 */
export function canCollectSignature(
  role: UserRole,
  documentType: "budget" | "receipt" | "treatment_plan" | "consent",
): boolean {
  if (role === "admin") return true;
  if (role === "dentist") return true;
  if (role === "receptionist") return documentType === "budget" || documentType === "receipt";
  return false;
}

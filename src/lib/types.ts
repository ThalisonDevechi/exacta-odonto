export type UserRole = "admin" | "receptionist" | "dentist" | "assistant" | "patient";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: "active" | "inactive";
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  name: string;
  cpf: string;
  rg: string;
  birthDate: string;
  gender: "M" | "F" | "O";
  phone: string;
  email: string;
  address: string;
  guardianName: string;
  notes: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface Dentist {
  id: string;
  userId: string;
  name: string;
  specialty: string;
  cro: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
}

export type AppointmentStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "missed" | "rescheduled";

export interface Appointment {
  id: string;
  patientId: string;
  dentistId: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  notes: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  chiefComplaint: string;
  medicalHistory: string;
  allergies: string;
  medications: string;
  diagnosis: string;
  treatmentPlanSummary: string;
  clinicalNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordEvolution {
  id: string;
  recordId: string;
  professionalId: string;
  professionalName: string;
  description: string;
  date: string;
}

export interface Procedure {
  id: string;
  patientId: string;
  dentistId: string;
  appointmentId: string;
  name: string;
  description: string;
  value: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  performedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  title: string;
  description: string;
  estimatedCost: number;
  status: "active" | "paused" | "completed" | "cancelled";
  startDate: string;
  endDate: string;
  steps: TreatmentStep[];
  createdAt: string;
  updatedAt: string;
}

export interface TreatmentStep {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  completedAt?: string;
}

export type PaymentMethod = "cash" | "credit_card" | "debit_card" | "pix" | "transfer" | "insurance";
export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled";

export interface Financial {
  id: string;
  patientId: string;
  appointmentId?: string;
  procedureId?: string;
  description: string;
  value: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paymentDate: string;
  createdAt: string;
  valueDefinedBy?: string; // userId who defined the value
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
}

// ---- Odontogram types ----
export type ToothFace = "vestibular" | "lingual" | "mesial" | "distal" | "oclusal";

export type ToothCondition =
  | "higido"
  | "carie"
  | "restauracao"
  | "ausente"
  | "fratura"
  | "canal"
  | "coroa"
  | "implante"
  | "mobilidade"
  | "pendente";

export interface ToothRecord {
  toothNumber: number;
  condition: ToothCondition;
  faces: ToothFace[];
  plannedProcedure?: string;
  performedProcedure?: string;
  notes?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Odontogram {
  id: string;
  patientId: string;
  teeth: ToothRecord[];
  createdAt: string;
  updatedAt: string;
}

export const TOOTH_CONDITION_LABELS: Record<ToothCondition, string> = {
  higido: "Hígido",
  carie: "Cárie",
  restauracao: "Restauração",
  ausente: "Ausente",
  fratura: "Fratura",
  canal: "Canal Tratado",
  coroa: "Coroa",
  implante: "Implante",
  mobilidade: "Mobilidade",
  pendente: "Tratamento Pendente",
};

export const TOOTH_CONDITION_COLORS: Record<ToothCondition, string> = {
  higido: "hsl(var(--success))",
  carie: "hsl(var(--destructive))",
  restauracao: "hsl(var(--primary))",
  ausente: "hsl(var(--muted-foreground))",
  fratura: "hsl(var(--warning))",
  canal: "#8B5CF6",
  coroa: "#F59E0B",
  implante: "#06B6D4",
  mobilidade: "#EF4444",
  pendente: "#F97316",
};

export const TOOTH_FACE_LABELS: Record<ToothFace, string> = {
  vestibular: "Vestibular",
  lingual: "Lingual/Palatina",
  mesial: "Mesial",
  distal: "Distal",
  oclusal: "Oclusal/Incisal",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  receptionist: "Recepcionista",
  dentist: "Dentista",
  assistant: "Auxiliar",
  patient: "Paciente",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  in_progress: "Em Atendimento",
  completed: "Concluída",
  cancelled: "Cancelada",
  missed: "Faltou",
  rescheduled: "Remarcada",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  credit_card: "Cartão Crédito",
  debit_card: "Cartão Débito",
  pix: "PIX",
  transfer: "Transferência",
  insurance: "Convênio",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Atrasado",
  cancelled: "Cancelado",
};

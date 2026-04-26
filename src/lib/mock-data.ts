import {
  User, Patient, Dentist, Appointment, MedicalRecord, RecordEvolution,
  Procedure, TreatmentPlan, Financial, AuditLog,
} from "./types";

const today = new Date().toISOString().split("T")[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

export const mockUsers: User[] = [
  { id: "u1", name: "Dr. Ricardo Almeida", email: "admin@exactaodonto.com", phone: "(11) 99000-0001", role: "admin", status: "active", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  { id: "u2", name: "Dra. Ana Silva", email: "ana@exactaodonto.com", phone: "(11) 99000-0002", role: "dentist", status: "active", createdAt: "2024-01-05", updatedAt: "2024-01-05" },
  { id: "u3", name: "Dr. Carlos Mendes", email: "carlos@exactaodonto.com", phone: "(11) 99000-0003", role: "dentist", status: "active", createdAt: "2024-01-05", updatedAt: "2024-01-05" },
  { id: "u4", name: "Maria Santos", email: "maria@exactaodonto.com", phone: "(11) 99000-0004", role: "receptionist", status: "active", createdAt: "2024-01-10", updatedAt: "2024-01-10" },
  { id: "u5", name: "Julia Costa", email: "julia@exactaodonto.com", phone: "(11) 99000-0005", role: "assistant", status: "active", createdAt: "2024-02-01", updatedAt: "2024-02-01" },
  { id: "u6", name: "Roberto Lima", email: "roberto@exactaodonto.com", phone: "(11) 99000-0006", role: "patient", status: "active", createdAt: "2024-03-01", updatedAt: "2024-03-01" },
];

export const mockDentists: Dentist[] = [
  { id: "d1", userId: "u2", name: "Dra. Ana Silva", specialty: "Ortodontia", cro: "SP-12345", phone: "(11) 99000-0002", email: "ana@exactaodonto.com", status: "active" },
  { id: "d2", userId: "u3", name: "Dr. Carlos Mendes", specialty: "Endodontia", cro: "SP-67890", phone: "(11) 99000-0003", email: "carlos@exactaodonto.com", status: "active" },
];

export const mockPatients: Patient[] = [
  { id: "p1", name: "João Oliveira", cpf: "123.456.789-00", rg: "12.345.678-9", birthDate: "1985-03-15", gender: "M", phone: "(11) 99123-4567", email: "joao@email.com", address: "Rua das Flores, 123 - São Paulo/SP", guardianName: "", notes: "Paciente colaborativo", status: "active", createdAt: "2024-01-10", updatedAt: "2024-01-10" },
  { id: "p2", name: "Maria Clara Souza", cpf: "987.654.321-00", rg: "98.765.432-1", birthDate: "1992-07-22", gender: "F", phone: "(11) 98765-4321", email: "mariaclara@email.com", address: "Av. Paulista, 456 - São Paulo/SP", guardianName: "", notes: "", status: "active", createdAt: "2024-02-05", updatedAt: "2024-02-05" },
  { id: "p3", name: "Pedro Henrique Lima", cpf: "456.789.123-00", rg: "45.678.912-3", birthDate: "1978-11-03", gender: "M", phone: "(11) 91234-5678", email: "pedro@email.com", address: "Rua Augusta, 789 - São Paulo/SP", guardianName: "", notes: "Paciente ansioso, necessita abordagem cuidadosa", status: "active", createdAt: "2024-01-20", updatedAt: "2024-01-20" },
  { id: "p4", name: "Fernanda Costa", cpf: "321.654.987-00", rg: "32.165.498-7", birthDate: "2000-05-18", gender: "F", phone: "(11) 93456-7890", email: "fernanda@email.com", address: "Rua Oscar Freire, 321 - São Paulo/SP", guardianName: "", notes: "Tratamento ortodôntico em andamento", status: "active", createdAt: "2024-03-01", updatedAt: "2024-03-01" },
  { id: "p5", name: "Roberto Almeida", cpf: "789.123.456-00", rg: "78.912.345-6", birthDate: "1965-09-30", gender: "M", phone: "(11) 94567-8901", email: "roberto@email.com", address: "Rua Consolação, 654 - São Paulo/SP", guardianName: "", notes: "Necessita profilaxia antibiótica antes de procedimentos invasivos", status: "active", createdAt: "2023-11-15", updatedAt: "2023-11-15" },
  { id: "p6", name: "Luciana Ferreira", cpf: "654.321.987-00", rg: "65.432.198-7", birthDate: "2015-02-10", gender: "F", phone: "(11) 95678-9012", email: "luciana.mae@email.com", address: "Rua Bela Vista, 100 - São Paulo/SP", guardianName: "Sandra Ferreira", notes: "Paciente menor de idade", status: "active", createdAt: "2024-04-01", updatedAt: "2024-04-01" },
];

export const mockAppointments: Appointment[] = [
  { id: "a1", patientId: "p1", dentistId: "d1", date: today, time: "08:00", duration: 60, type: "Limpeza e Profilaxia", notes: "", status: "scheduled", createdAt: today, updatedAt: today },
  { id: "a2", patientId: "p3", dentistId: "d1", date: today, time: "09:30", duration: 60, type: "Restauração", notes: "Paciente ansioso", status: "confirmed", createdAt: today, updatedAt: today },
  { id: "a3", patientId: "p2", dentistId: "d1", date: today, time: "11:00", duration: 30, type: "Avaliação Ortodôntica", notes: "", status: "completed", createdAt: today, updatedAt: today },
  { id: "a4", patientId: "p4", dentistId: "d2", date: today, time: "14:00", duration: 60, type: "Manutenção Ortodôntica", notes: "", status: "in_progress", createdAt: today, updatedAt: today },
  { id: "a5", patientId: "p5", dentistId: "d1", date: today, time: "15:30", duration: 60, type: "Extração", notes: "Paciente desmarcou", status: "cancelled", createdAt: today, updatedAt: today },
  { id: "a6", patientId: "p1", dentistId: "d2", date: yesterday, time: "10:00", duration: 60, type: "Canal", notes: "", status: "completed", createdAt: yesterday, updatedAt: yesterday },
  { id: "a7", patientId: "p6", dentistId: "d1", date: today, time: "16:30", duration: 30, type: "Avaliação Infantil", notes: "", status: "missed", createdAt: today, updatedAt: today },
];

export const mockRecords: MedicalRecord[] = [
  { id: "r1", patientId: "p1", chiefComplaint: "Dor ao mastigar", medicalHistory: "Hipertensão controlada", allergies: "Penicilina", medications: "Losartana 50mg", diagnosis: "Pulpite irreversível dente 14", treatmentPlanSummary: "Tratamento endodôntico + restauração", clinicalNotes: "Paciente refere dor intensa há 3 dias", createdAt: "2024-01-10", updatedAt: today },
  { id: "r2", patientId: "p3", chiefComplaint: "Cárie no molar inferior", medicalHistory: "Diabetes Tipo 2", allergies: "Látex, Dipirona", medications: "Metformina 850mg", diagnosis: "Cárie profunda dente 36", treatmentPlanSummary: "Restauração em resina composta", clinicalNotes: "Verificar glicemia antes do procedimento", createdAt: "2024-02-20", updatedAt: today },
  { id: "r3", patientId: "p2", chiefComplaint: "Desalinhamento dos dentes", medicalHistory: "Sem comorbidades", allergies: "Nenhuma", medications: "Nenhum", diagnosis: "Má oclusão Classe II", treatmentPlanSummary: "Aparelho fixo por 24 meses", clinicalNotes: "Moldagem realizada", createdAt: today, updatedAt: today },
  { id: "r4", patientId: "p5", chiefComplaint: "Dor no dente 48", medicalHistory: "Cardiopatia", allergies: "Ibuprofeno", medications: "AAS 100mg, Atenolol 25mg", diagnosis: "Pericoronarite", treatmentPlanSummary: "Extração do terceiro molar", clinicalNotes: "Profilaxia antibiótica obrigatória", createdAt: "2023-12-01", updatedAt: today },
];

export const mockEvolutions: RecordEvolution[] = [
  { id: "e1", recordId: "r1", professionalId: "d2", professionalName: "Dr. Carlos Mendes", description: "Realizado tratamento endodôntico do dente 14. Paciente tolerou bem o procedimento. Prescritos analgésicos para controle da dor pós-operatória.", date: yesterday },
  { id: "e2", recordId: "r1", professionalId: "d2", professionalName: "Dr. Carlos Mendes", description: "Retorno para avaliação. Paciente sem queixas. Dente assintomático. Restauração definitiva agendada.", date: today },
  { id: "e3", recordId: "r3", professionalId: "d1", professionalName: "Dra. Ana Silva", description: "Realizada moldagem para confecção do aparelho ortodôntico. Orientações sobre higiene bucal fornecidas.", date: today },
];

export const mockProcedures: Procedure[] = [
  { id: "proc1", patientId: "p1", dentistId: "d2", appointmentId: "a6", name: "Tratamento de Canal", description: "Tratamento endodôntico dente 14", value: 800, status: "completed", performedAt: yesterday, createdAt: yesterday, updatedAt: yesterday },
  { id: "proc2", patientId: "p3", dentistId: "d1", appointmentId: "a2", name: "Restauração em Resina", description: "Restauração direta dente 36", value: 350, status: "pending", performedAt: today, createdAt: today, updatedAt: today },
  { id: "proc3", patientId: "p2", dentistId: "d1", appointmentId: "a3", name: "Moldagem Ortodôntica", description: "Moldagem para aparelho fixo", value: 200, status: "completed", performedAt: today, createdAt: today, updatedAt: today },
  { id: "proc4", patientId: "p4", dentistId: "d2", appointmentId: "a4", name: "Manutenção Ortodôntica", description: "Troca de elásticos e ajustes", value: 150, status: "in_progress", performedAt: today, createdAt: today, updatedAt: today },
  { id: "proc5", patientId: "p5", dentistId: "d1", appointmentId: "a5", name: "Extração Dente 48", description: "Extração do terceiro molar inferior", value: 500, status: "cancelled", performedAt: today, createdAt: today, updatedAt: today },
];

export const mockTreatmentPlans: TreatmentPlan[] = [
  {
    id: "tp1", patientId: "p2", title: "Tratamento Ortodôntico Completo", description: "Correção de má oclusão Classe II com aparelho fixo metálico", estimatedCost: 5500, status: "active", startDate: "2024-03-01", endDate: "2026-03-01",
    steps: [
      { id: "s1", name: "Documentação ortodôntica", description: "Radiografias e fotos", completed: true, completedAt: "2024-03-01" },
      { id: "s2", name: "Moldagem", description: "Moldagem superior e inferior", completed: true, completedAt: today },
      { id: "s3", name: "Instalação do aparelho superior", description: "Colagem de braquetes superiores", completed: false },
      { id: "s4", name: "Instalação do aparelho inferior", description: "Colagem de braquetes inferiores", completed: false },
      { id: "s5", name: "Manutenções mensais", description: "Ajustes e trocas de fio", completed: false },
      { id: "s6", name: "Remoção e contenção", description: "Remoção do aparelho e instalação de contenção", completed: false },
    ],
    createdAt: "2024-03-01", updatedAt: today,
  },
  {
    id: "tp2", patientId: "p1", title: "Reabilitação Dente 14", description: "Tratamento endodôntico seguido de restauração definitiva", estimatedCost: 1200, status: "active", startDate: yesterday, endDate: "2024-06-01",
    steps: [
      { id: "s7", name: "Tratamento de canal", description: "Endodontia completa", completed: true, completedAt: yesterday },
      { id: "s8", name: "Restauração provisória", description: "Restauração temporária pós-canal", completed: true, completedAt: yesterday },
      { id: "s9", name: "Restauração definitiva", description: "Restauração em resina composta", completed: false },
    ],
    createdAt: yesterday, updatedAt: today,
  },
];

export const mockFinancials: Financial[] = [
  { id: "f1", patientId: "p1", appointmentId: "a6", procedureId: "proc1", description: "Tratamento de Canal - Dente 14", value: 800, paymentMethod: "credit_card", status: "paid", paymentDate: yesterday, createdAt: yesterday },
  { id: "f2", patientId: "p2", appointmentId: "a3", procedureId: "proc3", description: "Moldagem Ortodôntica", value: 200, paymentMethod: "pix", status: "paid", paymentDate: today, createdAt: today },
  { id: "f3", patientId: "p3", appointmentId: "a2", procedureId: "proc2", description: "Restauração em Resina - Dente 36", value: 350, paymentMethod: "cash", status: "pending", paymentDate: "", createdAt: today },
  { id: "f4", patientId: "p4", appointmentId: "a4", procedureId: "proc4", description: "Manutenção Ortodôntica Mensal", value: 150, paymentMethod: "debit_card", status: "pending", paymentDate: "", createdAt: today },
  { id: "f5", patientId: "p5", procedureId: "proc5", description: "Extração Dente 48 (cancelada)", value: 500, paymentMethod: "pix", status: "cancelled", paymentDate: "", createdAt: today },
  { id: "f6", patientId: "p1", description: "Consulta avaliação - Janeiro", value: 120, paymentMethod: "cash", status: "paid", paymentDate: "2024-01-10", createdAt: "2024-01-10" },
];

export const mockAuditLogs: AuditLog[] = [
  { id: "log1", userId: "u1", userName: "Dr. Ricardo Almeida", action: "LOGIN", entity: "auth", entityId: "u1", details: "Login realizado com sucesso", createdAt: `${today}T08:00:00` },
  { id: "log2", userId: "u4", userName: "Maria Santos", action: "CREATE", entity: "appointment", entityId: "a1", details: "Consulta agendada para João Oliveira", createdAt: `${today}T08:05:00` },
  { id: "log3", userId: "u2", userName: "Dra. Ana Silva", action: "UPDATE", entity: "record", entityId: "r3", details: "Prontuário atualizado - Maria Clara Souza", createdAt: `${today}T11:30:00` },
  { id: "log4", userId: "u4", userName: "Maria Santos", action: "UPDATE", entity: "appointment", entityId: "a5", details: "Consulta cancelada - Roberto Almeida", createdAt: `${today}T12:00:00` },
  { id: "log5", userId: "u3", userName: "Dr. Carlos Mendes", action: "CREATE", entity: "procedure", entityId: "proc1", details: "Procedimento registrado - Canal dente 14", createdAt: `${yesterday}T10:30:00` },
];

// Helper functions
export function getPatientName(id: string): string {
  return mockPatients.find(p => p.id === id)?.name ?? "Desconhecido";
}

export function getDentistName(id: string): string {
  return mockDentists.find(d => d.id === id)?.name ?? "Desconhecido";
}

export function getUserName(id: string): string {
  return mockUsers.find(u => u.id === id)?.name ?? "Desconhecido";
}

export function getAge(birthDate: string): number {
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatDate(date: string): string {
  if (!date) return "—";
  return new Date(date + "T00:00:00").toLocaleDateString("pt-BR");
}

export function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

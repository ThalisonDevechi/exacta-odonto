import React, { createContext, useContext, useState, useCallback } from "react";
import {
  Patient, Dentist, Appointment, AppointmentStatus, MedicalRecord, RecordEvolution,
  Procedure, TreatmentPlan, Financial, AuditLog, User, Odontogram, ToothRecord,
} from "./types";
import {
  mockPatients, mockDentists, mockAppointments, mockRecords, mockEvolutions,
  mockProcedures, mockTreatmentPlans, mockFinancials, mockAuditLogs, mockUsers,
} from "./mock-data";

interface DataContextType {
  users: User[];
  patients: Patient[];
  dentists: Dentist[];
  appointments: Appointment[];
  records: MedicalRecord[];
  evolutions: RecordEvolution[];
  procedures: Procedure[];
  treatmentPlans: TreatmentPlan[];
  financials: Financial[];
  auditLogs: AuditLog[];
  odontograms: Odontogram[];
  addPatient: (p: Omit<Patient, "id" | "createdAt" | "updatedAt">) => void;
  updatePatient: (id: string, p: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  addAppointment: (a: Omit<Appointment, "id" | "createdAt" | "updatedAt">) => void;
  updateAppointment: (id: string, a: Partial<Appointment>) => void;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  deleteAppointment: (id: string) => void;
  addRecord: (r: Omit<MedicalRecord, "id" | "createdAt" | "updatedAt">) => void;
  updateRecord: (id: string, r: Partial<MedicalRecord>) => void;
  addEvolution: (e: Omit<RecordEvolution, "id">) => void;
  addProcedure: (p: Omit<Procedure, "id" | "createdAt" | "updatedAt">) => void;
  updateProcedure: (id: string, p: Partial<Procedure>) => void;
  deleteProcedure: (id: string) => void;
  addTreatmentPlan: (tp: Omit<TreatmentPlan, "id" | "createdAt" | "updatedAt">) => void;
  updateTreatmentPlan: (id: string, tp: Partial<TreatmentPlan>) => void;
  addFinancial: (f: Omit<Financial, "id" | "createdAt">) => void;
  updateFinancial: (id: string, f: Partial<Financial>) => void;
  addUser: (u: Omit<User, "id" | "createdAt" | "updatedAt">) => void;
  updateUser: (id: string, u: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addAuditLog: (log: Omit<AuditLog, "id" | "createdAt">) => void;
  addOdontogram: (o: Omit<Odontogram, "id" | "createdAt" | "updatedAt">) => void;
  updateOdontogram: (id: string, o: Partial<Odontogram>) => void;
}

const DataContext = createContext<DataContextType | null>(null);

function genId(prefix: string) { return `${prefix}${Date.now()}`; }
function now() { return new Date().toISOString().split("T")[0]; }
function nowISO() { return new Date().toISOString(); }

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [dentists] = useState<Dentist[]>(mockDentists);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [records, setRecords] = useState<MedicalRecord[]>(mockRecords);
  const [evolutions, setEvolutions] = useState<RecordEvolution[]>(mockEvolutions);
  const [procedures, setProcedures] = useState<Procedure[]>(mockProcedures);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>(mockTreatmentPlans);
  const [financials, setFinancials] = useState<Financial[]>(mockFinancials);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(mockAuditLogs);
  const [odontograms, setOdontograms] = useState<Odontogram[]>([]);

  const addAuditLog = useCallback((log: Omit<AuditLog, "id" | "createdAt">) => {
    setAuditLogs(prev => [{ ...log, id: genId("log"), createdAt: nowISO() }, ...prev]);
  }, []);

  const addPatient = (p: Omit<Patient, "id" | "createdAt" | "updatedAt">) =>
    setPatients(prev => [...prev, { ...p, id: genId("p"), createdAt: now(), updatedAt: now() }]);
  const updatePatient = (id: string, data: Partial<Patient>) =>
    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...data, updatedAt: now() } : p));
  const deletePatient = (id: string) =>
    setPatients(prev => prev.map(p => p.id === id ? { ...p, status: "inactive" } : p));

  const addAppointment = (a: Omit<Appointment, "id" | "createdAt" | "updatedAt">) =>
    setAppointments(prev => [...prev, { ...a, id: genId("a"), createdAt: now(), updatedAt: now() }]);
  const updateAppointment = (id: string, a: Partial<Appointment>) =>
    setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, ...a, updatedAt: now() } : apt));
  const updateAppointmentStatus = (id: string, status: AppointmentStatus) =>
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status, updatedAt: now() } : a));
  const deleteAppointment = (id: string) =>
    setAppointments(prev => prev.filter(a => a.id !== id));

  const addRecord = (r: Omit<MedicalRecord, "id" | "createdAt" | "updatedAt">) =>
    setRecords(prev => [...prev, { ...r, id: genId("r"), createdAt: now(), updatedAt: now() }]);
  const updateRecord = (id: string, r: Partial<MedicalRecord>) =>
    setRecords(prev => prev.map(rec => rec.id === id ? { ...rec, ...r, updatedAt: now() } : rec));
  const addEvolution = (e: Omit<RecordEvolution, "id">) =>
    setEvolutions(prev => [...prev, { ...e, id: genId("e") }]);

  const addProcedure = (p: Omit<Procedure, "id" | "createdAt" | "updatedAt">) =>
    setProcedures(prev => [...prev, { ...p, id: genId("proc"), createdAt: now(), updatedAt: now() }]);
  const updateProcedure = (id: string, p: Partial<Procedure>) =>
    setProcedures(prev => prev.map(proc => proc.id === id ? { ...proc, ...p, updatedAt: now() } : proc));
  const deleteProcedure = (id: string) =>
    setProcedures(prev => prev.filter(p => p.id !== id));

  const addTreatmentPlan = (tp: Omit<TreatmentPlan, "id" | "createdAt" | "updatedAt">) =>
    setTreatmentPlans(prev => [...prev, { ...tp, id: genId("tp"), createdAt: now(), updatedAt: now() }]);
  const updateTreatmentPlan = (id: string, tp: Partial<TreatmentPlan>) =>
    setTreatmentPlans(prev => prev.map(t => t.id === id ? { ...t, ...tp, updatedAt: now() } : t));

  const addFinancial = (f: Omit<Financial, "id" | "createdAt">) =>
    setFinancials(prev => [...prev, { ...f, id: genId("f"), createdAt: now() }]);
  const updateFinancial = (id: string, f: Partial<Financial>) =>
    setFinancials(prev => prev.map(fin => fin.id === id ? { ...fin, ...f } : fin));

  const addUser = (u: Omit<User, "id" | "createdAt" | "updatedAt">) =>
    setUsers(prev => [...prev, { ...u, id: genId("u"), createdAt: now(), updatedAt: now() }]);
  const updateUser = (id: string, u: Partial<User>) =>
    setUsers(prev => prev.map(usr => usr.id === id ? { ...usr, ...u, updatedAt: now() } : usr));
  const deleteUser = (id: string) =>
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: "inactive" } : u));

  const addOdontogram = (o: Omit<Odontogram, "id" | "createdAt" | "updatedAt">) =>
    setOdontograms(prev => [...prev, { ...o, id: genId("odon"), createdAt: now(), updatedAt: now() }]);
  const updateOdontogram = (id: string, o: Partial<Odontogram>) =>
    setOdontograms(prev => prev.map(od => od.id === id ? { ...od, ...o, updatedAt: now() } : od));

  return (
    <DataContext.Provider value={{
      users, patients, dentists, appointments, records, evolutions, procedures,
      treatmentPlans, financials, auditLogs, odontograms,
      addPatient, updatePatient, deletePatient,
      addAppointment, updateAppointment, updateAppointmentStatus, deleteAppointment,
      addRecord, updateRecord, addEvolution,
      addProcedure, updateProcedure, deleteProcedure,
      addTreatmentPlan, updateTreatmentPlan,
      addFinancial, updateFinancial,
      addUser, updateUser, deleteUser,
      addAuditLog,
      addOdontogram, updateOdontogram,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

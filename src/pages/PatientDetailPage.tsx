import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { PersistentOdontogram } from "@/components/PersistentOdontogram";
import { ClinicalEvolutionsList } from "@/components/ClinicalEvolutionsList";
import { AttachmentManager } from "@/components/AttachmentManager";
import { ProceduresTab } from "@/components/patient-tabs/ProceduresTab";
import { TreatmentPlansTab } from "@/components/patient-tabs/TreatmentPlansTab";
import { FinancialTab } from "@/components/patient-tabs/FinancialTab";
import { PatientBudgetsTab } from "@/components/patient-tabs/PatientBudgetsTab";
import { PatientReceiptsTab } from "@/components/patient-tabs/PatientReceiptsTab";
import { CommunicationTimeline } from "@/components/CommunicationTimeline";
import { usePatient } from "@/hooks/usePatients";
import { useAppointments } from "@/hooks/useAppointments";
import { useMedicalRecord } from "@/hooks/useMedicalRecord";
import { useAuth } from "@/lib/auth-context";
import { canEditRecord, getPermission, canUsePatientWhatsAppHeader, canViewCommunication } from "@/lib/permissions";
import { isValidWhatsAppPhone } from "@/services/whatsappService";
import { calculateAge } from "@/lib/cpf";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { WhatsAppMessageModal } from "@/components/WhatsAppMessageModal";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import { ArrowLeft, Calendar, FileText, Phone, Mail, MapPin, User, Smile, Loader2, Save, Stethoscope, ClipboardList, DollarSign, Paperclip, MessageCircle, MessageSquare, Receipt as ReceiptIcon } from "lucide-react";
import { toast } from "sonner";

function formatDateBR(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // CORREÇÃO: Pegar os params da url para definir a aba aberta
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "cadastro";

  const { user } = useAuth();
  const { patient, loading } = usePatient(id);
  const { appointments } = useAppointments();
  const { record, upsertRecord, ensureRecord, setReleased } = useMedicalRecord(id);
  const { settings: clinic } = useClinicSettings();
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  // Mantemos isPatientActive caso você já use as verificações do código anterior
  const isPatientActive = patient?.status === "active";

  const canEditChart = user ? (canEditRecord(user.role) && isPatientActive) : false;
  const canViewClinical = user && (user.role === "admin" || user.role === "dentist" || user.role === "assistant");
  const canViewFinancial = user ? getPermission(user.role, "financial").canView : false;
  const canViewProcedures = user ? getPermission(user.role, "procedures").canView : false;
  const canViewPlans = user ? getPermission(user.role, "treatmentPlans").canView : false;
  const canViewBudgets = user && (user.role === "admin" || user.role === "dentist" || user.role === "receptionist" || user.role === "assistant");
  const canViewReceipts = user && (user.role === "admin" || user.role === "dentist" || user.role === "receptionist");
  const hasValidWhatsAppPhone = isValidWhatsAppPhone(patient?.phone);
  const canWhatsApp = user ? canUsePatientWhatsAppHeader(user.role) : false;
  const canOpenWhatsApp = Boolean(canWhatsApp && isPatientActive && hasValidWhatsAppPhone);
  const canViewComm = user ? canViewCommunication(user.role) : false;

  const [recordForm, setRecordForm] = useState({
    chief_complaint: "", medical_history: "", allergies: "",
    medications: "", diagnosis: "", treatment_plan_summary: "", clinical_notes: "",
  });
  const [savingRecord, setSavingRecord] = useState(false);

  // Trocar aba e atualizar URL
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  useEffect(() => {
    if (id && !record && canEditChart) {
      ensureRecord(user?.id).catch(() => { /* ignore */ });
    }
  }, [id, record, canEditChart, ensureRecord, user?.id]);

  useEffect(() => {
    if (record) {
      setRecordForm({
        chief_complaint: record.chief_complaint ?? "",
        medical_history: record.medical_history ?? "",
        allergies: record.allergies ?? "",
        medications: record.medications ?? "",
        diagnosis: record.diagnosis ?? "",
        treatment_plan_summary: record.treatment_plan_summary ?? "",
        clinical_notes: record.clinical_notes ?? "",
      });
    }
  }, [record]);

  const patientAppts = useMemo(
    () => appointments.filter(a => a.patient_id === id).slice().sort((a, b) => b.date.localeCompare(a.date)),
    [appointments, id],
  );

  if (loading) {
    return <AppLayout><div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-64 w-full" /></div></AppLayout>;
  }
  if (!patient) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Paciente não encontrado.</p>
          <Button variant="outline" onClick={() => navigate("/pacientes")} className="mt-4">Voltar</Button>
        </div>
      </AppLayout>
    );
  }

  const saveRecord = async () => {
    setSavingRecord(true);
    try {
      await upsertRecord(recordForm, user?.id);
      toast.success("Prontuário salvo!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar prontuário.");
    } finally {
      setSavingRecord(false);
    }
  };

  const fullAddress = [patient.address, patient.address_number, patient.neighborhood, patient.city, patient.state]
    .filter(Boolean).join(", ");

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" aria-label="Voltar para pacientes" title="Voltar para pacientes" onClick={() => navigate("/pacientes")}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">{patient.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {calculateAge(patient.birth_date)} anos · CPF: {patient.cpf ?? "não informado"}
            </p>
          </div>
          <StatusBadge
            status={patient.status === "active" ? "active" : "inactive"}
            label={patient.status === "active" ? "Ativo" : patient.status === "archived" ? "Arquivado" : "Inativo"}
          />
          {canWhatsApp && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!canOpenWhatsApp) {
                  toast.error(!isPatientActive ? "Paciente inativo." : "Paciente sem telefone válido para WhatsApp.");
                  return;
                }
                setWhatsappOpen(true);
              }}
              className="gap-1.5"
              disabled={!canOpenWhatsApp}
              title={!isPatientActive ? "Paciente inativo" : hasValidWhatsAppPhone ? "Enviar WhatsApp" : "Paciente sem telefone válido"}
            >
              <MessageCircle className="h-4 w-4 text-success" />
              WhatsApp
            </Button>
          )}
        </div>

        {!isPatientActive && (
          <div className="bg-warning/10 border border-warning text-warning-foreground px-4 py-2 rounded-md text-sm mb-4">
            <strong>Aviso:</strong> Este paciente está inativo. Edições no prontuário, financeiro e procedimentos estão bloqueadas. Apenas consultas podem ser visualizadas/gerenciadas.
          </div>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="cadastro"><User className="h-3.5 w-3.5 mr-1.5" />Cadastro</TabsTrigger>
            {canViewClinical && <TabsTrigger value="prontuario"><FileText className="h-3.5 w-3.5 mr-1.5" />Prontuário</TabsTrigger>}
            {canViewClinical && <TabsTrigger value="evolucoes"><Stethoscope className="h-3.5 w-3.5 mr-1.5" />Evoluções</TabsTrigger>}
            <TabsTrigger value="odontograma"><Smile className="h-3.5 w-3.5 mr-1.5" />Odontograma</TabsTrigger>
            <TabsTrigger value="consultas"><Calendar className="h-3.5 w-3.5 mr-1.5" />Consultas</TabsTrigger>
            {canViewProcedures && <TabsTrigger value="procedimentos"><ClipboardList className="h-3.5 w-3.5 mr-1.5" />Procedimentos</TabsTrigger>}
            {canViewPlans && <TabsTrigger value="planos"><Stethoscope className="h-3.5 w-3.5 mr-1.5" />Plano Tratamento</TabsTrigger>}
            {canViewFinancial && <TabsTrigger value="financeiro"><DollarSign className="h-3.5 w-3.5 mr-1.5" />Financeiro</TabsTrigger>}
            {canViewBudgets && <TabsTrigger value="orcamentos"><FileText className="h-3.5 w-3.5 mr-1.5" />Orçamentos</TabsTrigger>}
            {canViewReceipts && <TabsTrigger value="recibos"><ReceiptIcon className="h-3.5 w-3.5 mr-1.5" />Recibos</TabsTrigger>}
            {canViewComm && <TabsTrigger value="comunicacao"><MessageSquare className="h-3.5 w-3.5 mr-1.5" />Comunicação</TabsTrigger>}
            <TabsTrigger value="anexos"><Paperclip className="h-3.5 w-3.5 mr-1.5" />Anexos</TabsTrigger>
          </TabsList>

          <TabsContent value="cadastro" className="space-y-4">
            <div className="rounded-xl bg-surface shadow-card p-5 space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Informações</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                {patient.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" />{patient.phone}</p>}
                {patient.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{patient.email}</span></p>}
                {fullAddress && <p className="flex items-start gap-2 sm:col-span-2"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{fullAddress}</span></p>}
                <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 shrink-0" />Nasc: {formatDateBR(patient.birth_date)}</p>
              </div>
              {patient.guardian_name && (
                <div className="pt-3 border-t border-border space-y-1 text-sm text-muted-foreground">
                  <p className="text-xs font-semibold text-foreground">Responsável</p>
                  <p>{patient.guardian_name} {patient.guardian_relationship && `(${patient.guardian_relationship})`}</p>
                  {patient.guardian_phone && <p className="text-xs">{patient.guardian_phone}</p>}
                </div>
              )}
              {patient.notes && <p className="text-sm italic pt-3 border-t border-border">"{patient.notes}"</p>}
            </div>
          </TabsContent>

          {canViewClinical && (
            <TabsContent value="prontuario" className="space-y-4">
              <div className="rounded-xl bg-surface shadow-card p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Prontuário Clínico
                  </h2>
                  <div className="flex items-center gap-3">
                    {record && canEditChart && (
                      <label className="flex items-center gap-2 text-xs">
                        <Switch checked={record.released_to_patient ?? false} onCheckedChange={v => setReleased(v).catch(e => toast.error(e?.message))} />
                        Liberar p/ paciente
                      </label>
                    )}
                    {canEditChart && (
                      <Button size="sm" onClick={saveRecord} disabled={savingRecord}>
                        {savingRecord ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Salvando</> : <><Save className="h-3.5 w-3.5 mr-1.5" />Salvar</>}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Queixa principal</Label>
                    <Textarea rows={2} value={recordForm.chief_complaint} onChange={e => setRecordForm({ ...recordForm, chief_complaint: e.target.value })} disabled={!canEditChart} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Histórico médico</Label>
                    <Textarea rows={3} value={recordForm.medical_history} onChange={e => setRecordForm({ ...recordForm, medical_history: e.target.value })} disabled={!canEditChart} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Alergias</Label>
                    <Textarea rows={3} value={recordForm.allergies} onChange={e => setRecordForm({ ...recordForm, allergies: e.target.value })} disabled={!canEditChart} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Medicamentos em uso</Label>
                    <Textarea rows={3} value={recordForm.medications} onChange={e => setRecordForm({ ...recordForm, medications: e.target.value })} disabled={!canEditChart} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Diagnóstico</Label>
                    <Textarea rows={3} value={recordForm.diagnosis} onChange={e => setRecordForm({ ...recordForm, diagnosis: e.target.value })} disabled={!canEditChart} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Resumo do plano de tratamento</Label>
                    <Textarea rows={2} value={recordForm.treatment_plan_summary} onChange={e => setRecordForm({ ...recordForm, treatment_plan_summary: e.target.value })} disabled={!canEditChart} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Observações clínicas</Label>
                    <Textarea rows={3} value={recordForm.clinical_notes} onChange={e => setRecordForm({ ...recordForm, clinical_notes: e.target.value })} disabled={!canEditChart} />
                  </div>
                  {record?.updated_at && (
                    <p className="text-[11px] text-muted-foreground sm:col-span-2">
                      Última atualização: {new Date(record.updated_at).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          )}

          {canViewClinical && (
            <TabsContent value="evolucoes">
              <div className="rounded-xl bg-surface shadow-card p-5">
                <ClinicalEvolutionsList patientId={patient.id} medicalRecordId={record?.id ?? null} isPatientActive={isPatientActive} />
              </div>
            </TabsContent>
          )}

          <TabsContent value="odontograma">
            <div className="rounded-xl bg-surface shadow-card p-5">
              <PersistentOdontogram patientId={patient.id} patientName={patient.name} birthDate={patient.birth_date} isPatientActive={isPatientActive} />
            </div>
          </TabsContent>

          <TabsContent value="consultas">
            <div className="rounded-xl bg-surface shadow-card p-5">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Calendar className="h-4 w-4 text-primary" /> Consultas</h2>
              {patientAppts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma consulta agendada.</p>
              ) : patientAppts.map(apt => (
                <div key={apt.id} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
                  <div className="min-w-[90px]">
                    <p className="text-sm font-medium">{formatDateBR(apt.date)}</p>
                    <p className="text-xs text-muted-foreground">{apt.start_time?.slice(0, 5)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{apt.appointment_type ?? "Consulta"}</p>
                    <p className="text-xs text-muted-foreground truncate">{apt.dentists?.name ?? "—"}</p>
                  </div>
                  <StatusBadge status={apt.status} label={APPOINTMENT_STATUS_LABELS[apt.status]} />
                </div>
              ))}
            </div>
          </TabsContent>

          {canViewProcedures && (
            <TabsContent value="procedimentos">
              <div className="rounded-xl bg-surface shadow-card p-5">
                <ProceduresTab patientId={patient.id} isPatientActive={isPatientActive} />
              </div>
            </TabsContent>
          )}

          {canViewPlans && (
            <TabsContent value="planos">
              <div className="rounded-xl bg-surface shadow-card p-5">
                <TreatmentPlansTab patientId={patient.id} isPatientActive={isPatientActive} />
              </div>
            </TabsContent>
          )}

          {canViewFinancial && (
            <TabsContent value="financeiro">
              <div className="rounded-xl bg-surface shadow-card p-5">
                <FinancialTab patientId={patient.id} isPatientActive={isPatientActive} />
              </div>
            </TabsContent>
          )}

          {canViewBudgets && (
            <TabsContent value="orcamentos">
              <div className="rounded-xl bg-surface shadow-card p-5">
                <PatientBudgetsTab patientId={patient.id} patientName={patient.name} patientPhone={patient.phone} isPatientActive={isPatientActive} />
              </div>
            </TabsContent>
          )}

          {canViewReceipts && (
            <TabsContent value="recibos">
              <div className="rounded-xl bg-surface shadow-card p-5">
                <PatientReceiptsTab patientId={patient.id} patientName={patient.name} isPatientActive={isPatientActive} />
              </div>
            </TabsContent>
          )}

          {canViewComm && (
            <TabsContent value="comunicacao">
              <div className="rounded-xl bg-surface shadow-card p-5">
                <CommunicationTimeline patientId={patient.id} isPatientActive={isPatientActive} />
              </div>
            </TabsContent>
          )}

          <TabsContent value="anexos">
            <div className="rounded-xl bg-surface shadow-card p-5">
              <AttachmentManager patientId={patient.id} medicalRecordId={record?.id ?? null} isPatientActive={isPatientActive} />
            </div>
          </TabsContent>
        </Tabs>

        {canWhatsApp && (
          <WhatsAppMessageModal
            open={whatsappOpen}
            onClose={() => setWhatsappOpen(false)}
            phone={patient.phone}
            patientId={patient.id}
            communicationType="atendimento_manual"
            vars={{
              nome_paciente: patient.name,
              nome_clinica: clinic?.clinic_name ?? "",
              whatsapp_clinica: clinic?.whatsapp ?? "",
            }}
            defaultMessage={`Olá ${patient.name}, tudo bem?`}
            context="patient_detail.header"
            entity="patients"
            entityId={patient.id}
            title="Enviar WhatsApp ao paciente"
          />
        )}
      </div>
    </AppLayout>
  );
}

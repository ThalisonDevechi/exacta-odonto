import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/types";
import { PLAN_STATUS_LABELS, STEP_STATUS_LABELS, type PlanRow, type StepRow } from "@/hooks/useTreatmentPlans";
import { ATTACHMENT_CATEGORY_LABELS, type AttachmentRow } from "@/hooks/useAttachments";
import { User, Calendar, FileText, Stethoscope, ClipboardList, Paperclip, Phone, Mail, Download } from "lucide-react";
import { toast } from "sonner";

type AppointmentRow = {
  id: string; date: string; start_time: string; status: keyof typeof APPOINTMENT_STATUS_LABELS;
  appointment_type: string | null; dentists?: { name: string } | null;
};

type EvolutionRow = {
  id: string; description: string; created_at: string; professional_name: string | null;
};

type RecordRow = {
  id: string; chief_complaint: string | null; medical_history: string | null;
  allergies: string | null; medications: string | null; diagnosis: string | null;
  treatment_plan_summary: string | null; clinical_notes: string | null;
  released_to_patient: boolean; updated_at: string;
};

function formatDateBR(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function formatDateTimeBR(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export default function MyPanelPage() {
  const { user } = useAuth();
  const [patient, setPatient] = useState<{ id: string; name: string; cpf: string | null; phone: string | null; email: string | null; birth_date: string } | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [record, setRecord] = useState<RecordRow | null>(null);
  const [evolutions, setEvolutions] = useState<EvolutionRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from("patients")
        .select("id,name,cpf,phone,email,birth_date")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!p) { setLoading(false); return; }
      setPatient(p);

      const [aRes, rRes, eRes, plRes, atRes] = await Promise.all([
        supabase.from("appointments")
          .select("id,date,start_time,status,appointment_type,dentists(name)")
          .eq("patient_id", p.id).order("date", { ascending: false }),
        supabase.from("medical_records")
          .select("id,chief_complaint,medical_history,allergies,medications,diagnosis,treatment_plan_summary,clinical_notes,released_to_patient,updated_at")
          .eq("patient_id", p.id).maybeSingle(),
        supabase.from("clinical_evolutions")
          .select("id,description,created_at,professional_name")
          .eq("patient_id", p.id).eq("released_to_patient", true)
          .eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("treatment_plans")
          .select("*, patients(name), dentists(name)")
          .eq("patient_id", p.id).order("created_at", { ascending: false }),
        supabase.from("attachments")
          .select("*")
          .eq("patient_id", p.id).eq("released_to_patient", true).eq("active", true)
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setAppointments((aRes.data ?? []) as AppointmentRow[]);
      setRecord(rRes.data?.released_to_patient ? (rRes.data as RecordRow) : null);
      setEvolutions((eRes.data ?? []) as EvolutionRow[]);
      const planRows = (plRes.data ?? []) as PlanRow[];
      setPlans(planRows);
      if (planRows.length) {
        const { data: stepData } = await supabase
          .from("treatment_plan_steps").select("*")
          .in("treatment_plan_id", planRows.map(pl => pl.id))
          .order("order_index", { ascending: true });
        if (!cancelled) setSteps((stepData ?? []) as StepRow[]);
      }
      setAttachments((atRes.data ?? []) as AttachmentRow[]);
      setLoading(false);
      logAudit("patient.portal.view", "patient", p.id).catch(() => {});
    })();
    return () => { cancelled = true; };
  }, [user]);

  const stepsByPlan = useMemo(() => {
    const map = new Map<string, StepRow[]>();
    steps.forEach(s => {
      const arr = map.get(s.treatment_plan_id) ?? [];
      arr.push(s);
      map.set(s.treatment_plan_id, arr);
    });
    return map;
  }, [steps]);

  const downloadAttachment = async (att: AttachmentRow) => {
    try {
      const { data, error } = await supabase.storage
        .from("patient-attachments")
        .createSignedUrl(att.file_path, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
      await logAudit("attachment.download", "attachments", att.id, { released: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao baixar anexo.");
    }
  };

  if (loading) {
    return <AppLayout><div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-64 w-full" /></div></AppLayout>;
  }

  if (!patient) {
    return (
      <AppLayout>
        <div className="rounded-xl bg-surface shadow-card p-8">
          <EmptyState
            title="Nenhum cadastro de paciente vinculado"
            description="Entre em contato com a clínica para vincular seu cadastro."
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Meu Painel" description="Acompanhe seus dados, consultas e histórico clínico liberado." />

        <Tabs defaultValue="perfil" className="w-full">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="perfil"><User className="h-3.5 w-3.5 mr-1.5" />Meu Perfil</TabsTrigger>
            <TabsTrigger value="consultas"><Calendar className="h-3.5 w-3.5 mr-1.5" />Minhas Consultas</TabsTrigger>
            <TabsTrigger value="prontuario"><FileText className="h-3.5 w-3.5 mr-1.5" />Meu Prontuário</TabsTrigger>
            <TabsTrigger value="evolucoes"><Stethoscope className="h-3.5 w-3.5 mr-1.5" />Minhas Evoluções</TabsTrigger>
            <TabsTrigger value="planos"><ClipboardList className="h-3.5 w-3.5 mr-1.5" />Meus Planos</TabsTrigger>
            <TabsTrigger value="anexos"><Paperclip className="h-3.5 w-3.5 mr-1.5" />Meus Anexos</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil">
            <div className="rounded-xl bg-surface shadow-card p-5 space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4 text-primary" />Informações Pessoais</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <p><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{patient.name}</span></p>
                <p><span className="text-muted-foreground">CPF:</span> <span className="font-medium">{patient.cpf ?? "—"}</span></p>
                <p><span className="text-muted-foreground">Nascimento:</span> <span className="font-medium">{formatDateBR(patient.birth_date)}</span></p>
                {patient.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{patient.phone}</p>}
                {patient.email && <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{patient.email}</p>}
              </div>
              <p className="text-xs text-muted-foreground pt-3 border-t border-border">
                Para alterar suas informações cadastrais, entre em contato com a clínica.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="consultas">
            <div className="rounded-xl bg-surface shadow-card p-5">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Calendar className="h-4 w-4 text-primary" />Minhas Consultas</h2>
              {appointments.length === 0 ? (
                <EmptyState title="Sem consultas" description="Você ainda não possui consultas agendadas." />
              ) : appointments.map(a => (
                <div key={a.id} className="flex items-center gap-4 py-2 border-b border-border last:border-0">
                  <div className="min-w-[90px]">
                    <p className="text-sm font-medium">{formatDateBR(a.date)}</p>
                    <p className="text-xs text-muted-foreground">{a.start_time?.slice(0, 5)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{a.appointment_type ?? "Consulta"}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.dentists?.name ?? "—"}</p>
                  </div>
                  <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABELS[a.status]} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="prontuario">
            <div className="rounded-xl bg-surface shadow-card p-5">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><FileText className="h-4 w-4 text-primary" />Meu Prontuário</h2>
              {!record ? (
                <EmptyState
                  title="Prontuário não liberado"
                  description="Seu prontuário ainda não foi liberado para visualização. Solicite à clínica."
                />
              ) : (
                <div className="space-y-3 text-sm">
                  {record.chief_complaint && <Field label="Queixa principal" value={record.chief_complaint} />}
                  {record.medical_history && <Field label="Histórico médico" value={record.medical_history} />}
                  {record.allergies && <Field label="Alergias" value={record.allergies} />}
                  {record.medications && <Field label="Medicamentos em uso" value={record.medications} />}
                  {record.diagnosis && <Field label="Diagnóstico" value={record.diagnosis} />}
                  {record.treatment_plan_summary && <Field label="Plano de tratamento (resumo)" value={record.treatment_plan_summary} />}
                  {record.clinical_notes && <Field label="Observações clínicas" value={record.clinical_notes} />}
                  <p className="text-[11px] text-muted-foreground pt-3 border-t border-border">
                    Última atualização: {formatDateTimeBR(record.updated_at)}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="evolucoes">
            <div className="rounded-xl bg-surface shadow-card p-5">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Stethoscope className="h-4 w-4 text-primary" />Minhas Evoluções Clínicas</h2>
              {evolutions.length === 0 ? (
                <EmptyState title="Sem evoluções liberadas" description="Nenhuma evolução clínica foi liberada para você ainda." />
              ) : evolutions.map(e => (
                <div key={e.id} className="py-3 border-b border-border last:border-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-muted-foreground">{formatDateTimeBR(e.created_at)}</p>
                    <p className="text-xs font-medium">{e.professional_name ?? "Profissional"}</p>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{e.description}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="planos">
            <div className="rounded-xl bg-surface shadow-card p-5 space-y-4">
              <h2 className="text-sm font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" />Meus Planos de Tratamento</h2>
              {plans.length === 0 ? (
                <EmptyState title="Sem planos" description="Nenhum plano de tratamento registrado." />
              ) : plans.map(plan => {
                const planSteps = stepsByPlan.get(plan.id) ?? [];
                const completed = planSteps.filter(s => s.status === "concluida").length;
                const pct = planSteps.length ? Math.round((completed / planSteps.length) * 100) : 0;
                return (
                  <div key={plan.id} className="rounded-lg border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <p className="text-sm font-medium">{plan.title}</p>
                      <StatusBadge status={plan.status} label={PLAN_STATUS_LABELS[plan.status]} />
                    </div>
                    {plan.description && <p className="text-xs text-muted-foreground">{plan.description}</p>}
                    {planSteps.length > 0 && (
                      <>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{completed} de {planSteps.length} etapas concluídas ({pct}%)</p>
                        <ul className="text-xs space-y-1 mt-2">
                          {planSteps.map(s => (
                            <li key={s.id} className="flex items-center justify-between">
                              <span>{s.title}</span>
                              <span className="text-muted-foreground">{STEP_STATUS_LABELS[s.status]}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="anexos">
            <div className="rounded-xl bg-surface shadow-card p-5">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-4"><Paperclip className="h-4 w-4 text-primary" />Meus Anexos Liberados</h2>
              {attachments.length === 0 ? (
                <EmptyState title="Sem anexos liberados" description="Nenhum anexo foi liberado para você." />
              ) : (
                <div className="space-y-2">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{att.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ATTACHMENT_CATEGORY_LABELS[att.category]} · {formatDateBR(att.created_at)}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => downloadAttachment(att)}>
                        <Download className="h-3.5 w-3.5 mr-1.5" />Baixar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap mt-0.5">{value}</p>
    </div>
  );
}

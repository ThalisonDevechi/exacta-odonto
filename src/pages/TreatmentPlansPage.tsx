import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useTreatmentPlans, PLAN_STATUS_LABELS, STEP_STATUS_LABELS, type PlanStatus } from "@/hooks/useTreatmentPlans";
import { usePatients } from "@/hooks/usePatients";
import { useDentists } from "@/hooks/useDentists";
import { useAuth } from "@/lib/auth-context";
import { canManageTreatmentPlans } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ClipboardList, CheckCircle2, Circle, Edit, Plus, Pause, Play, XCircle, Clock, FileText } from "lucide-react";
import { DocumentSignatureSection } from "@/components/DocumentSignatureSection";

function formatBR(d?: string | null) { if (!d) return "—"; const [y,m,day]=d.split("-"); return `${day}/${m}/${y}`; }
function fmt(v: number) { return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v ?? 0); }

const STATUS_BADGE: Record<PlanStatus, string> = {
  rascunho: "bg-muted text-muted-foreground",
  apresentado: "bg-primary/10 text-primary",
  aprovado: "bg-success/10 text-success",
  em_andamento: "bg-warning/10 text-warning",
  pausado: "bg-muted text-muted-foreground",
  concluido: "bg-success/15 text-success",
  cancelado: "bg-destructive/10 text-destructive",
};

export default function TreatmentPlansPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user ? canManageTreatmentPlans(user.role) : false;
  const canCreateBudget = user?.role === "admin" || user?.role === "dentist";
  const { plans, steps, loading, addPlan, updatePlan, changeStatus, addStep, completeStep, cancelStep } = useTreatmentPlans();
  const { patients } = usePatients();
  const { dentists } = useDentists();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stepOpen, setStepOpen] = useState<string | null>(null);
  const [newStep, setNewStep] = useState({ title: "", description: "" });
  const [cancelOpen, setCancelOpen] = useState<{ kind: "plan" | "step"; id: string } | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const [form, setForm] = useState({
    patient_id: "", dentist_id: "", title: "", description: "",
    estimated_value: 0, final_value: "" as string | number,
    status: "rascunho" as PlanStatus, start_date: "", end_date: "",
  });

  const stepsByPlan = useMemo(() => {
    const map = new Map<string, typeof steps>();
    steps.forEach(s => { const arr = map.get(s.treatment_plan_id) ?? []; arr.push(s); map.set(s.treatment_plan_id, arr); });
    return map;
  }, [steps]);

  const openNew = () => {
    if (!canManage) { toast.error("Sem permissão."); return; }
    setEditingId(null);
    setForm({ patient_id: "", dentist_id: "", title: "", description: "", estimated_value: 0, final_value: "", status: "rascunho", start_date: "", end_date: "" });
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    const p = plans.find(x => x.id === id); if (!p) return;
    setEditingId(id);
    setForm({
      patient_id: p.patient_id, dentist_id: p.dentist_id ?? "",
      title: p.title, description: p.description ?? "",
      estimated_value: Number(p.estimated_value) ?? 0,
      final_value: p.final_value != null ? Number(p.final_value) : "",
      status: p.status, start_date: p.start_date ?? "", end_date: p.end_date ?? "",
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.patient_id || !form.title) { toast.error("Paciente e título obrigatórios."); return; }
    const payload = {
      patient_id: form.patient_id,
      dentist_id: form.dentist_id || null,
      title: form.title, description: form.description || null,
      estimated_value: form.estimated_value,
      final_value: form.final_value === "" ? null : Number(form.final_value),
      status: form.status,
      start_date: form.start_date || null, end_date: form.end_date || null,
      created_by: user?.id ?? null, updated_by: user?.id ?? null,
    };
    try {
      if (editingId) { await updatePlan(editingId, payload); toast.success("Plano atualizado!"); }
      else { await addPlan(payload); toast.success("Plano criado!"); }
      setFormOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao salvar."); }
  };

  const handleStatus = async (id: string, status: PlanStatus) => {
    if (status === "cancelado") { setCancelOpen({ kind: "plan", id }); return; }
    try { await changeStatus(id, status); toast.success("Status atualizado."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  const submitCancel = async () => {
    if (!cancelOpen) return;
    try {
      if (cancelOpen.kind === "plan") await changeStatus(cancelOpen.id, "cancelado", cancelReason);
      else await cancelStep(cancelOpen.id, cancelReason);
      toast.success("Cancelado.");
      setCancelOpen(null); setCancelReason("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  const handleAddStep = async () => {
    if (!stepOpen) return;
    if (!newStep.title.trim()) { toast.error("Título da etapa obrigatório."); return; }
    const planSteps = stepsByPlan.get(stepOpen) ?? [];
    try {
      await addStep({ treatment_plan_id: stepOpen, title: newStep.title, description: newStep.description || null, order_index: planSteps.length });
      toast.success("Etapa adicionada!"); setStepOpen(null); setNewStep({ title: "", description: "" });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Planos de Tratamento" description={`${plans.length} planos`}
          actionLabel={canManage ? "Novo Plano" : undefined} onAction={canManage ? openNew : undefined} />

        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-12">Carregando...</div>
        ) : plans.length === 0 ? (
          <EmptyState title="Nenhum plano" description="Crie um plano de tratamento." icon={ClipboardList} />
        ) : (
          <div className="space-y-4">
            {plans.map(plan => {
              const planSteps = stepsByPlan.get(plan.id) ?? [];
              const completed = planSteps.filter(s => s.status === "concluida").length;
              const progress = planSteps.length ? Math.round((completed / planSteps.length) * 100) : 0;
              const value = plan.final_value != null ? Number(plan.final_value) : Number(plan.estimated_value);
              return (
                <div key={plan.id} className="rounded-xl bg-surface shadow-card p-5 space-y-4">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-base font-semibold">{plan.title}</h3>
                      <p className="text-sm text-muted-foreground">{plan.patients?.name ?? "—"} · {fmt(value)}</p>
                      {plan.start_date && <p className="text-xs text-muted-foreground mt-0.5">{formatBR(plan.start_date)} — {plan.end_date ? formatBR(plan.end_date) : "em aberto"}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_BADGE[plan.status]}>{PLAN_STATUS_LABELS[plan.status]}</Badge>
                      {canManage && plan.status !== "concluido" && plan.status !== "cancelado" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(plan.id)}><Edit className="h-3.5 w-3.5" /></Button>
                      )}
                    </div>
                  </div>
                  {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}

                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Progresso</span><span>{completed}/{planSteps.length} · {progress}%</span></div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
                  </div>

                  <div className="space-y-1.5">
                    {planSteps.map(step => (
                      <div key={step.id} className="flex items-center gap-3 py-1.5 hover:bg-muted/30 rounded px-2 group">
                        {step.status === "concluida" ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                          : step.status === "cancelada" ? <XCircle className="h-4 w-4 text-destructive shrink-0" />
                          : step.status === "em_andamento" ? <Clock className="h-4 w-4 text-warning shrink-0" />
                          : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm ${step.status === "concluida" ? "line-through text-muted-foreground" : step.status === "cancelada" ? "line-through text-destructive/60" : "text-foreground"}`}>{step.title}</span>
                          {step.description && <p className="text-xs text-muted-foreground truncate">{step.description}</p>}
                          {step.cancelled_reason && <p className="text-xs text-destructive">Motivo: {step.cancelled_reason}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground">{STEP_STATUS_LABELS[step.status]}</span>
                        {canManage && step.status === "pendente" && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 text-xs opacity-0 group-hover:opacity-100" onClick={() => completeStep(step.id).then(()=>toast.success("Etapa concluída.")).catch(e=>toast.error(e.message))}>Concluir</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive opacity-0 group-hover:opacity-100" onClick={() => setCancelOpen({ kind: "step", id: step.id })}>Cancelar</Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {canManage && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setStepOpen(plan.id); setNewStep({ title: "", description: "" }); }}>
                        <Plus className="h-3 w-3" /> Etapa
                      </Button>
                      {plan.status === "rascunho" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatus(plan.id, "apresentado")}>Apresentar</Button>}
                      {plan.status === "apresentado" && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleStatus(plan.id, "aprovado")}><CheckCircle2 className="h-3 w-3" />Aprovar</Button>}
                      {plan.status === "aprovado" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatus(plan.id, "em_andamento")}>Iniciar</Button>}
                      {plan.status === "em_andamento" && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleStatus(plan.id, "pausado")}><Pause className="h-3 w-3" />Pausar</Button>}
                      {plan.status === "pausado" && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleStatus(plan.id, "em_andamento")}><Play className="h-3 w-3" />Retomar</Button>}
                      {plan.status !== "concluido" && plan.status !== "cancelado" && plan.status !== "rascunho" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleStatus(plan.id, "concluido")}><CheckCircle2 className="h-3 w-3" />Concluir</Button>
                      )}
                      {plan.status !== "concluido" && plan.status !== "cancelado" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive gap-1" onClick={() => setCancelOpen({ kind: "plan", id: plan.id })}><XCircle className="h-3 w-3" />Cancelar plano</Button>
                      )}
                      {canCreateBudget && plan.status !== "cancelado" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate(`/orcamentos?planId=${plan.id}`)} title="Gerar orçamento a partir deste plano">
                          <FileText className="h-3 w-3" /> Gerar orçamento
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t border-border">
                    <DocumentSignatureSection
                      documentType="treatment_plan"
                      documentId={plan.id}
                      documentTitle={`Plano: ${plan.title}`}
                      patientId={plan.patient_id}
                      canCollect={plan.status === "aprovado" || plan.status === "em_andamento" || plan.status === "concluido"}
                      defaultSignerName={plan.patients?.name ?? undefined}
                      compact
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Plan form */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Editar Plano" : "Novo Plano"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Paciente *</Label>
                  <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Dentista</Label>
                  <Select value={form.dentist_id || "none"} onValueChange={v => setForm({ ...form, dentist_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">—</SelectItem>{dentists.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Título *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Valor estimado (R$)</Label><Input type="number" min={0} step="0.01" value={form.estimated_value} onChange={e => setForm({ ...form, estimated_value: +e.target.value })} /></div>
                <div className="space-y-2"><Label>Valor final (R$)</Label><Input type="number" min={0} step="0.01" value={form.final_value} onChange={e => setForm({ ...form, final_value: e.target.value })} placeholder="Opcional" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Início</Label><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Fim</Label><Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
                <Button onClick={save}>{editingId ? "Salvar" : "Criar"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Step add */}
        <Dialog open={!!stepOpen} onOpenChange={() => setStepOpen(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Etapa</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5"><Label>Título *</Label><Input value={newStep.title} onChange={e => setNewStep({ ...newStep, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Descrição</Label><Input value={newStep.description} onChange={e => setNewStep({ ...newStep, description: e.target.value })} /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStepOpen(null)}>Cancelar</Button>
                <Button onClick={handleAddStep}>Adicionar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel plan/step */}
        <Dialog open={!!cancelOpen} onOpenChange={() => { setCancelOpen(null); setCancelReason(""); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Cancelar {cancelOpen?.kind === "plan" ? "Plano" : "Etapa"}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <Label>Motivo *</Label>
              <Textarea rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setCancelOpen(null); setCancelReason(""); }}>Voltar</Button>
                <Button variant="destructive" onClick={submitCancel}>Confirmar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

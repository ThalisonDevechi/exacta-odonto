import { useState } from "react";
import { useTreatmentPlans, PLAN_STATUS_LABELS, STEP_STATUS_LABELS, type PlanStatus } from "@/hooks/useTreatmentPlans";
import { useDentists } from "@/hooks/useDentists";
import { useAuth } from "@/lib/auth-context";
import { canManageTreatmentPlans } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, CheckCircle2, XCircle, Stethoscope, Loader2 } from "lucide-react";
import { toast } from "sonner";

const fmtMoney = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

interface Props {
  patientId: string;
  isPatientActive: boolean; // NOVO
}

export function TreatmentPlansTab({ patientId, isPatientActive }: Props) {
  const { user } = useAuth();
  // ATUALIZADO
  const canEdit = user ? (canManageTreatmentPlans(user.role) && isPatientActive) : false;
  const { plans, steps, loading, addPlan, changeStatus, addStep, completeStep, cancelStep } = useTreatmentPlans(patientId);
  const { dentists } = useDentists();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", dentist_id: "", estimated_value: "0" });
  const [stepForms, setStepForms] = useState<Record<string, { title: string; description: string }>>({});

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Título é obrigatório.");
    setSaving(true);
    try {
      await addPlan({
        patient_id: patientId, dentist_id: form.dentist_id || null,
        title: form.title.trim(), description: form.description.trim() || null,
        estimated_value: Number(form.estimated_value), created_by: user?.id ?? null,
      });
      toast.success("Plano criado.");
      setForm({ title: "", description: "", dentist_id: "", estimated_value: "0" });
      setOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
    finally { setSaving(false); }
  };

  const onChangeStatus = async (id: string, status: PlanStatus) => {
    try {
      let reason: string | undefined;
      if (status === "cancelado") {
        reason = window.prompt("Motivo do cancelamento:") ?? "";
        if (!reason) return;
      }
      await changeStatus(id, status, reason);
      toast.success("Status atualizado.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  const onAddStep = async (planId: string) => {
    const f = stepForms[planId];
    if (!f?.title?.trim()) return toast.error("Título da etapa é obrigatório.");
    const planSteps = steps.filter(s => s.treatment_plan_id === planId);
    try {
      await addStep({
        treatment_plan_id: planId, title: f.title.trim(),
        description: f.description?.trim() || null, order_index: planSteps.length,
      });
      setStepForms(p => ({ ...p, [planId]: { title: "", description: "" } }));
      toast.success("Etapa adicionada.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  const onCancelStep = async (id: string) => {
    const reason = window.prompt("Motivo do cancelamento:");
    if (!reason) return;
    try { await cancelStep(id, reason); toast.success("Etapa cancelada."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" /> Planos de tratamento</h2>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo plano</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo plano de tratamento</DialogTitle><DialogDescription>Crie um plano vinculado ao paciente.</DialogDescription></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Título *</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Descrição</Label>
                  <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dentista</Label>
                    <Select value={form.dentist_id} onValueChange={v => setForm({ ...form, dentist_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{dentists.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor estimado (R$)</Label>
                    <Input type="number" min="0" step="0.01" value={form.estimated_value} onChange={e => setForm({ ...form, estimated_value: e.target.value })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nenhum plano cadastrado.</p>
      ) : plans.map(plan => {
        const planSteps = steps.filter(s => s.treatment_plan_id === plan.id);
        const completed = planSteps.filter(s => s.status === "concluida").length;
        const total = planSteps.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return (
          <div key={plan.id} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{plan.title}</p>
                {plan.description && <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {plan.dentists?.name ?? "—"} · Estimado: {fmtMoney(Number(plan.estimated_value))}
                </p>
              </div>
              <StatusBadge status={plan.status} label={PLAN_STATUS_LABELS[plan.status]} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span>Progresso</span><span>{completed}/{total} ({progress}%)</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {canEdit && (
              <div className="flex flex-wrap gap-2 text-xs">
                {plan.status === "rascunho" && <Button size="sm" variant="outline" onClick={() => onChangeStatus(plan.id, "apresentado")}>Apresentar</Button>}
                {plan.status === "apresentado" && <Button size="sm" variant="outline" onClick={() => onChangeStatus(plan.id, "aprovado")}>Aprovar</Button>}
                {plan.status === "aprovado" && <Button size="sm" variant="outline" onClick={() => onChangeStatus(plan.id, "em_andamento")}>Iniciar</Button>}
                {plan.status === "em_andamento" && <Button size="sm" variant="outline" onClick={() => onChangeStatus(plan.id, "pausado")}>Pausar</Button>}
                {plan.status === "pausado" && <Button size="sm" variant="outline" onClick={() => onChangeStatus(plan.id, "em_andamento")}>Retomar</Button>}
                {(plan.status === "em_andamento" || plan.status === "aprovado") && <Button size="sm" variant="outline" onClick={() => onChangeStatus(plan.id, "concluido")}>Concluir</Button>}
                {plan.status !== "cancelado" && plan.status !== "concluido" && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onChangeStatus(plan.id, "cancelado")}>Cancelar</Button>}
              </div>
            )}

            <div className="space-y-1.5 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground">Etapas</p>
              {planSteps.length === 0 && <p className="text-xs text-muted-foreground italic">Sem etapas.</p>}
              {planSteps.map(s => (
                <div key={s.id} className="flex items-center gap-2 text-xs py-1">
                  <span className="flex-1 min-w-0 truncate">{s.title}</span>
                  <StatusBadge status={s.status} label={STEP_STATUS_LABELS[s.status]} />
                  {canEdit && s.status !== "concluida" && s.status !== "cancelada" && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Concluir" title="Concluir"
                        onClick={() => completeStep(s.id).then(() => toast.success("Etapa concluída.")).catch(e => toast.error(e.message))}>
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" aria-label="Cancelar" title="Cancelar" onClick={() => onCancelStep(s.id)}>
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
              {canEdit && plan.status !== "cancelado" && plan.status !== "concluido" && (
                <div className="flex gap-2 pt-2">
                  <Input className="h-8 text-xs" placeholder="Nova etapa..."
                    value={stepForms[plan.id]?.title ?? ""}
                    onChange={e => setStepForms(p => ({ ...p, [plan.id]: { title: e.target.value, description: p[plan.id]?.description ?? "" } }))} />
                  <Button size="sm" onClick={() => onAddStep(plan.id)}>Adicionar</Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

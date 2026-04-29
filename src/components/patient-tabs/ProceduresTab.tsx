import { useState } from "react";
import { useProcedures, PROCEDURE_STATUS_LABELS } from "@/hooks/useProcedures";
import { useDentists } from "@/hooks/useDentists";
import { useAuth } from "@/lib/auth-context";
import { canManageProcedures } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, CheckCircle2, XCircle, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";

const fmtMoney = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

interface Props {
  patientId: string;
  isPatientActive: boolean; // NOVO: Prop para bloquear a aba
}

export function ProceduresTab({ patientId, isPatientActive }: Props) {
  const { user } = useAuth();
  // ATUALIZADO: Cruza permissão do sistema com o status do paciente
  const canEdit = user ? (canManageProcedures(user.role) && isPatientActive) : false;
  const { procedures, loading, addProcedure, completeProcedure, cancelProcedure } = useProcedures(patientId);
  const { dentists } = useDentists();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", value: "0", dentist_id: "",
    tooth_number: "", tooth_face: "", planned_date: "",
  });

  const reset = () => setForm({ name: "", description: "", value: "0", dentist_id: "", tooth_number: "", tooth_face: "", planned_date: "" });

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Nome do procedimento é obrigatório.");
    if (!form.dentist_id) return toast.error("Dentista é obrigatório.");
    if (Number(form.value) < 0) return toast.error("Valor não pode ser negativo.");
    setSaving(true);
    try {
      await addProcedure({
        patient_id: patientId, dentist_id: form.dentist_id, name: form.name.trim(),
        description: form.description.trim() || null, value: Number(form.value),
        tooth_number: form.tooth_number ? Number(form.tooth_number) : null,
        tooth_face: form.tooth_face.trim() || null,
        planned_date: form.planned_date || null, created_by: user?.id ?? null,
      });
      toast.success("Procedimento criado.");
      reset(); setOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
    finally { setSaving(false); }
  };

  const onCancel = async (id: string) => {
    const reason = window.prompt("Motivo do cancelamento:");
    if (!reason) return;
    try { await cancelProcedure(id, reason); toast.success("Cancelado."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> Procedimentos</h2>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo procedimento</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo procedimento</DialogTitle>
                <DialogDescription>Vincule um procedimento clínico ao paciente.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Descrição</Label>
                  <Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dentista *</Label>
                    <Select value={form.dentist_id} onValueChange={v => setForm({ ...form, dentist_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{dentists.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input type="number" min="0" step="0.01" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dente (FDI)</Label>
                    <Input type="number" value={form.tooth_number} onChange={e => setForm({ ...form, tooth_number: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Face</Label>
                    <Input value={form.tooth_face} placeholder="oclusal, mesial..." onChange={e => setForm({ ...form, tooth_face: e.target.value })} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">Data planejada</Label>
                    <Input type="date" value={form.planned_date} onChange={e => setForm({ ...form, planned_date: e.target.value })} />
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
      ) : procedures.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nenhum procedimento registrado.</p>
      ) : (
        <div className="space-y-2">
          {procedures.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.dentists?.name ?? "—"}
                  {p.tooth_number ? ` · Dente ${p.tooth_number}` : ""}
                  {p.tooth_face ? ` (${p.tooth_face})` : ""}
                  {" · "}{fmtMoney(Number(p.value))}
                </p>
              </div>
              <StatusBadge status={p.status} label={PROCEDURE_STATUS_LABELS[p.status]} />
              {canEdit && p.status !== "realizado" && p.status !== "cancelado" && (
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Marcar realizado" title="Marcar realizado"
                    onClick={() => completeProcedure(p.id).then(() => toast.success("Procedimento realizado.")).catch(e => toast.error(e.message))}>
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Cancelar" title="Cancelar" onClick={() => onCancel(p.id)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

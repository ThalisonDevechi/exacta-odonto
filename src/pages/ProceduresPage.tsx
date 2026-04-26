import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useProcedures, PROCEDURE_STATUS_LABELS, type ProcedureStatus } from "@/hooks/useProcedures";
import { usePatients } from "@/hooks/usePatients";
import { useDentists } from "@/hooks/useDentists";
import { useAuth } from "@/lib/auth-context";
import { canManageProcedures } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Stethoscope, Search, Edit, CheckCircle2, XCircle } from "lucide-react";

const STATUS_VARIANT: Record<ProcedureStatus, string> = {
  planejado: "bg-muted text-muted-foreground",
  autorizado: "bg-primary/10 text-primary",
  em_execucao: "bg-warning/10 text-warning",
  realizado: "bg-success/10 text-success",
  cancelado: "bg-destructive/10 text-destructive",
};

function formatBR(d?: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);
}

export default function ProceduresPage() {
  const { user } = useAuth();
  const canManage = user ? canManageProcedures(user.role) : false;
  const { procedures, loading, addProcedure, updateProcedure, completeProcedure, cancelProcedure } = useProcedures();
  const { patients } = usePatients();
  const { dentists } = useDentists();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [form, setForm] = useState({
    patient_id: "", dentist_id: "", appointment_id: "", treatment_plan_id: "",
    tooth_number: "" as string | number, tooth_face: "",
    name: "", description: "", value: 0, status: "planejado" as ProcedureStatus,
    planned_date: "", performed_date: "",
  });

  const filtered = useMemo(() => procedures.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return p.name?.toLowerCase().includes(s) || p.patients?.name?.toLowerCase().includes(s);
  }), [procedures, search, statusFilter]);

  const resetForm = () => setForm({
    patient_id: "", dentist_id: "", appointment_id: "", treatment_plan_id: "",
    tooth_number: "", tooth_face: "", name: "", description: "",
    value: 0, status: "planejado", planned_date: "", performed_date: "",
  });

  const openNew = () => {
    if (!canManage) { toast.error("Sem permissão para criar procedimento."); return; }
    setEditingId(null); resetForm(); setFormOpen(true);
  };
  const openEdit = (id: string) => {
    if (!canManage) { toast.error("Sem permissão para editar."); return; }
    const p = procedures.find(x => x.id === id); if (!p) return;
    setEditingId(id);
    setForm({
      patient_id: p.patient_id, dentist_id: p.dentist_id,
      appointment_id: p.appointment_id ?? "", treatment_plan_id: p.treatment_plan_id ?? "",
      tooth_number: p.tooth_number ?? "", tooth_face: p.tooth_face ?? "",
      name: p.name, description: p.description ?? "",
      value: Number(p.value) ?? 0, status: p.status,
      planned_date: p.planned_date ?? "", performed_date: p.performed_date ?? "",
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.patient_id || !form.dentist_id || !form.name) {
      toast.error("Paciente, dentista e nome são obrigatórios."); return;
    }
    if (form.value < 0) { toast.error("Valor não pode ser negativo."); return; }
    const payload = {
      patient_id: form.patient_id,
      dentist_id: form.dentist_id,
      appointment_id: form.appointment_id || null,
      treatment_plan_id: form.treatment_plan_id || null,
      tooth_number: form.tooth_number === "" ? null : Number(form.tooth_number),
      tooth_face: form.tooth_face || null,
      name: form.name,
      description: form.description || null,
      value: form.value,
      status: form.status,
      planned_date: form.planned_date || null,
      performed_date: form.performed_date || null,
      created_by: user?.id ?? null,
      updated_by: user?.id ?? null,
    };
    try {
      if (editingId) {
        await updateProcedure(editingId, payload);
        toast.success("Procedimento atualizado!");
      } else {
        await addProcedure(payload);
        toast.success("Procedimento criado!");
      }
      setFormOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao salvar."); }
  };

  const handleComplete = async (id: string) => {
    try { await completeProcedure(id); toast.success("Marcado como realizado."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    try { await cancelProcedure(cancelId, cancelReason); toast.success("Procedimento cancelado."); setCancelId(null); setCancelReason(""); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Procedimentos" description="Procedimentos clínicos vinculados ao Supabase"
          actionLabel={canManage ? "Novo Procedimento" : undefined} onAction={canManage ? openNew : undefined}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56 h-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(PROCEDURE_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </PageHeader>

        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-12">Carregando...</div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhum procedimento" description="Crie um procedimento para começar." icon={Stethoscope} />
        ) : (
          <div className="rounded-xl bg-surface shadow-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Procedimento</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="hidden md:table-cell">Dentista</TableHead>
                  <TableHead className="hidden sm:table-cell">Dente</TableHead>
                  <TableHead className="hidden sm:table-cell">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBR(p.performed_date ?? p.planned_date)}</p>
                    </TableCell>
                    <TableCell className="text-sm">{p.patients?.name ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.dentists?.name ?? "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{p.tooth_number ?? "—"}{p.tooth_face ? ` (${p.tooth_face})` : ""}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm font-medium">{formatCurrency(Number(p.value))}</TableCell>
                    <TableCell><Badge className={STATUS_VARIANT[p.status]}>{PROCEDURE_STATUS_LABELS[p.status]}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canManage && p.status !== "realizado" && p.status !== "cancelado" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p.id)} title="Editar"><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => handleComplete(p.id)} title="Marcar como realizado"><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setCancelId(p.id)} title="Cancelar"><XCircle className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Editar Procedimento" : "Novo Procedimento"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Nome do Procedimento *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Paciente *</Label>
                  <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dentista *</Label>
                  <Select value={form.dentist_id} onValueChange={v => setForm({ ...form, dentist_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{dentists.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Nº Dente</Label><Input type="number" value={form.tooth_number} onChange={e => setForm({ ...form, tooth_number: e.target.value })} placeholder="Ex: 16" /></div>
                <div className="space-y-2"><Label>Face</Label>
                  <Select value={form.tooth_face || "none"} onValueChange={v => setForm({ ...form, tooth_face: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {["vestibular","lingual","palatina","mesial","distal","oclusal","incisal","cervical","raiz"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" min={0} step="0.01" value={form.value} onChange={e => setForm({ ...form, value: +e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as ProcedureStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PROCEDURE_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Data Planejada</Label><Input type="date" value={form.planned_date} onChange={e => setForm({ ...form, planned_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Data Realização</Label><Input type="date" value={form.performed_date} onChange={e => setForm({ ...form, performed_date: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
                <Button onClick={save}>{editingId ? "Salvar" : "Criar"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Cancelar Procedimento</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <Label>Motivo do cancelamento *</Label>
              <Textarea rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCancelId(null)}>Voltar</Button>
                <Button variant="destructive" onClick={handleCancel}>Confirmar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

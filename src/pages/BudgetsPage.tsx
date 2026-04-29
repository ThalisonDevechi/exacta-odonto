import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { useBudgets } from "@/hooks/useBudgets";
import { usePatients } from "@/hooks/usePatients";
import { useDentists } from "@/hooks/useDentists";
import { useTreatmentPlans } from "@/hooks/useTreatmentPlans";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import { BUDGET_STATUS_LABELS, type BudgetStatus, type BudgetWithItems } from "@/services/budgetService";
import { logAudit } from "@/lib/audit";
import { generateBudgetPdf, downloadPdf } from "@/lib/pdf-documents";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download, FileText, Trash2, Send, CheckCircle2, XCircle, Ban, Eye } from "lucide-react";
import { toast } from "sonner";
import { DocumentSignatureSection } from "@/components/DocumentSignatureSection";
import { documentSignatureService } from "@/services/documentSignatureService";

const STATUS_BADGE: Record<BudgetStatus, string> = {
  rascunho: "bg-muted text-muted-foreground",
  emitido: "bg-primary/10 text-primary",
  aceito: "bg-success/10 text-success",
  recusado: "bg-destructive/10 text-destructive",
  vencido: "bg-warning/10 text-warning",
  cancelado: "bg-muted text-muted-foreground line-through",
};

function fmt(v: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0); }
function formatBR(d?: string | null) { if (!d) return "—"; const [y,m,day] = d.split("-"); return `${day}/${m}/${y}`; }

interface ItemForm { description: string; quantity: number; unit_value: number; tooth_number: string }

export default function BudgetsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isDentist = user?.role === "dentist";
  const isReceptionist = user?.role === "receptionist";
  const canCreate = isAdmin || isDentist;
  const canChangeValues = isAdmin || isDentist;
  const canView = isAdmin || isDentist || isReceptionist || user?.role === "assistant";

  const { budgets, loading, create, update, issue, accept, reject, cancel, remove } = useBudgets();
  const { patients } = usePatients();
  const { dentists } = useDentists();
  const { plans, steps } = useTreatmentPlans();
  const { settings } = useClinicSettings();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [dentistFilter, setDentistFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<BudgetWithItems | null>(null);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    patient_id: "", dentist_id: "", treatment_plan_id: "", title: "", description: "",
    discount_value: 0, validity_days: 30, notes: "",
  });
  const [items, setItems] = useState<ItemForm[]>([]);

  const filtered = useMemo(() => budgets.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (patientFilter !== "all" && b.patient_id !== patientFilter) return false;
    if (dentistFilter !== "all" && b.dentist_id !== dentistFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return b.title.toLowerCase().includes(s) || (b.budget_number ?? "").toLowerCase().includes(s) || (b.patients?.name ?? "").toLowerCase().includes(s);
  }), [budgets, search, statusFilter, patientFilter, dentistFilter]);

  // Auto-open form prefilled from a treatment plan via ?planId=...
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const planId = searchParams.get("planId");
    if (!planId || !plans.length || !canCreate) return;
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    setEditingId(null);
    setForm({
      patient_id: plan.patient_id,
      dentist_id: plan.dentist_id ?? "",
      treatment_plan_id: planId,
      title: `Orçamento – ${plan.title}`,
      description: "",
      discount_value: 0,
      validity_days: settings?.default_budget_validity_days ?? 30,
      notes: "",
    });
    const planSteps = steps.filter((s) => s.treatment_plan_id === planId);
    const stepValue = planSteps.length > 0
      ? Number(plan.estimated_value) / planSteps.length
      : Number(plan.estimated_value);
    setItems(
      planSteps.length > 0
        ? planSteps.map((s) => ({ description: s.title, quantity: 1, unit_value: stepValue, tooth_number: "" }))
        : [{ description: plan.title, quantity: 1, unit_value: Number(plan.estimated_value), tooth_number: "" }],
    );
    setFormOpen(true);
    searchParams.delete("planId");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, steps, searchParams, canCreate, settings?.default_budget_validity_days]);

  if (!canView) return <Navigate to="/acesso-negado" replace />;

  const subtotal = items.reduce((s, i) => s + (Number(i.unit_value) || 0) * (Number(i.quantity) || 0), 0);
  const total = Math.max(0, subtotal - (Number(form.discount_value) || 0));

  const openNew = () => {
    if (!canCreate) { toast.error("Sem permissão."); return; }
    setEditingId(null);
    setForm({
      patient_id: "", dentist_id: "", treatment_plan_id: "",
      title: "", description: "", discount_value: 0,
      validity_days: settings?.default_budget_validity_days ?? 30, notes: "",
    });
    setItems([]);
    setFormOpen(true);
  };

  const openEdit = (b: BudgetWithItems) => {
    if (!canChangeValues) { toast.error("Sem permissão para alterar valores."); return; }
    if (b.status !== "rascunho") { toast.error("Apenas rascunho pode ser editado."); return; }
    setEditingId(b.id);
    setForm({
      patient_id: b.patient_id, dentist_id: b.dentist_id ?? "",
      treatment_plan_id: b.treatment_plan_id ?? "",
      title: b.title, description: b.description ?? "",
      discount_value: Number(b.discount_value),
      validity_days: settings?.default_budget_validity_days ?? 30,
      notes: b.notes ?? "",
    });
    setItems(b.items.map((it) => ({
      description: it.description, quantity: Number(it.quantity),
      unit_value: Number(it.unit_value), tooth_number: it.tooth_number?.toString() ?? "",
    })));
    setFormOpen(true);
  };

  const importFromPlan = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const planSteps = steps.filter((s) => s.treatment_plan_id === planId);
    const stepValue = planSteps.length > 0 ? Number(plan.estimated_value) / planSteps.length : Number(plan.estimated_value);
    const newItems: ItemForm[] = planSteps.length > 0
      ? planSteps.map((s) => ({ description: s.title, quantity: 1, unit_value: stepValue, tooth_number: "" }))
      : [{ description: plan.title, quantity: 1, unit_value: Number(plan.estimated_value), tooth_number: "" }];
    setItems(newItems);
    setForm((f) => ({
      ...f, patient_id: plan.patient_id, dentist_id: plan.dentist_id ?? "",
      treatment_plan_id: planId, title: f.title || `Orçamento – ${plan.title}`,
    }));
  };

  const addItem = () => setItems((p) => [...p, { description: "", quantity: 1, unit_value: 0, tooth_number: "" }]);
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, key: keyof ItemForm, value: string | number) =>
    setItems((p) => p.map((it, idx) => idx === i ? { ...it, [key]: value } : it));

  const save = async (issueAfter = false) => {
    if (!form.patient_id || !form.title.trim()) { toast.error("Paciente e título são obrigatórios."); return; }
    if (items.length === 0) { toast.error("Adicione ao menos um item."); return; }
    if (items.some((i) => !i.description.trim())) { toast.error("Itens precisam de descrição."); return; }

    const validity = form.validity_days > 0
      ? new Date(Date.now() + form.validity_days * 86400000).toISOString().split("T")[0]
      : null;

    const payload = {
      patient_id: form.patient_id,
      dentist_id: form.dentist_id || null,
      treatment_plan_id: form.treatment_plan_id || null,
      title: form.title.trim(), description: form.description || null,
      discount_value: Number(form.discount_value) || 0,
      notes: form.notes || null,
      validity_date: validity,
      status: (issueAfter ? "emitido" : "rascunho") as BudgetStatus,
      created_by: user?.id ?? null,
    };
    const itemPayload = items.map((it, idx) => ({
      description: it.description.trim(),
      quantity: Number(it.quantity) || 1,
      unit_value: Number(it.unit_value) || 0,
      tooth_number: it.tooth_number ? Number(it.tooth_number) : null,
      order_index: idx,
    }));

    try {
      if (editingId) {
        await update(editingId, payload, itemPayload);
        toast.success("Orçamento atualizado.");
      } else {
        await create(payload, itemPayload);
        toast.success(issueAfter ? "Orçamento emitido." : "Rascunho salvo.");
      }
      setFormOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    }
  };

  const handleIssue = async (id: string) => { try { await issue(id); toast.success("Orçamento emitido."); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); } };
  const handleAccept = async (id: string) => { try { await accept(id); toast.success("Orçamento aceito."); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); } };
  const handleReject = async (id: string) => { try { await reject(id); toast.success("Orçamento recusado."); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); } };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) { toast.error("Motivo é obrigatório."); return; }
    try { await cancel(cancelTarget, cancelReason); toast.success("Orçamento cancelado."); setCancelTarget(null); setCancelReason(""); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  const handleDelete = async (b: BudgetWithItems) => {
    if (b.status === "aceito") { toast.error("Orçamento aceito não pode ser excluído."); return; }
    if (!confirm("Excluir este orçamento?")) return;
    try { await remove(b.id); toast.success("Orçamento excluído."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  const handleDownloadPdf = async (b: BudgetWithItems) => {
    try {
      if (!b.patients) { toast.error("Paciente do orçamento não encontrado."); return; }
      // Try to fetch signature (gracefully ignored on error)
      let signature = null as Awaited<ReturnType<typeof documentSignatureService.getSignatureByDocument>> | null;
      try {
        signature = await documentSignatureService.getSignatureByDocument("budget", b.id);
      } catch { signature = null; }
      const doc = await generateBudgetPdf({
        number: b.budget_number,
        title: b.title,
        description: b.description,
        status: b.status,
        validityDate: b.validity_date,
        notes: b.notes,
        subtotal: Number(b.subtotal),
        discount: Number(b.discount_value),
        total: Number(b.total_value),
        patient: { name: b.patients.name, cpf: b.patients.cpf, phone: b.patients.phone },
        dentist: b.dentists ? { name: b.dentists.name, cro: b.dentists.cro } : null,
        items: b.items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          unit_value: Number(it.unit_value),
          total_value: Number(it.total_value),
          tooth_number: it.tooth_number,
        })),
        createdAt: b.created_at,
      }, settings ?? null, signature ? {
        signerName: signature.signer_name,
        signerDocument: signature.signer_document,
        signedAt: signature.signed_at,
        imageUrl: signature.signature_image_url,
      } : null);
      downloadPdf(doc, `${b.budget_number ?? "orcamento"}.pdf`);
      await logAudit("budget.download", "treatment_budgets", b.id);
      if (signature) await logAudit("signature.download", "treatment_budgets", b.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF.");
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Orçamentos" description="Gerar orçamentos a partir de planos de tratamento ou itens livres">
        {canCreate && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1.5" /> Novo orçamento</Button>}
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 mb-4">
        <Input placeholder="Buscar por número, título ou paciente..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(Object.keys(BUDGET_STATUS_LABELS) as BudgetStatus[]).map((s) => <SelectItem key={s} value={s}>{BUDGET_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={patientFilter} onValueChange={setPatientFilter}>
          <SelectTrigger><SelectValue placeholder="Paciente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os pacientes</SelectItem>
            {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dentistFilter} onValueChange={setDentistFilter}>
          <SelectTrigger><SelectValue placeholder="Dentista" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os dentistas</SelectItem>
            {dentists.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum orçamento" description="Crie o primeiro orçamento para iniciar." />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.budget_number ?? "—"}</TableCell>
                  <TableCell>{b.patients?.name ?? "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{b.title}</TableCell>
                  <TableCell>{formatBR(b.validity_date)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(Number(b.total_value))}</TableCell>
                  <TableCell><Badge className={STATUS_BADGE[b.status]}>{BUDGET_STATUS_LABELS[b.status]}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewing(b)} aria-label="Ver detalhes" title="Ver detalhes"><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDownloadPdf(b)} aria-label="Baixar PDF" title="Baixar PDF"><Download className="h-4 w-4" /></Button>
                      {b.status === "rascunho" && canChangeValues && (
                        <Button size="sm" variant="ghost" onClick={() => openEdit(b)} aria-label="Editar" title="Editar">Editar</Button>
                      )}
                      {b.status === "rascunho" && canCreate && (
                        <Button size="sm" variant="ghost" onClick={() => handleIssue(b.id)} aria-label="Emitir" title="Emitir"><Send className="h-4 w-4 text-primary" /></Button>
                      )}
                      {b.status === "emitido" && canCreate && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => handleAccept(b.id)} aria-label="Aceitar" title="Aceitar"><CheckCircle2 className="h-4 w-4 text-success" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleReject(b.id)} aria-label="Recusar" title="Recusar"><XCircle className="h-4 w-4 text-destructive" /></Button>
                        </>
                      )}
                      {b.status !== "aceito" && b.status !== "cancelado" && canCreate && (
                        <Button size="sm" variant="ghost" onClick={() => setCancelTarget(b.id)} aria-label="Cancelar" title="Cancelar"><Ban className="h-4 w-4" /></Button>
                      )}
                      {isAdmin && b.status !== "aceito" && (
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(b)} aria-label="Excluir" title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar orçamento" : "Novo orçamento"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Paciente *</Label>
                <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Dentista</Label>
                <Select value={form.dentist_id} onValueChange={(v) => setForm({ ...form, dentist_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{dentists.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Importar de plano de tratamento</Label>
                <Select value={form.treatment_plan_id} onValueChange={(v) => { setForm({ ...form, treatment_plan_id: v }); importFromPlan(v); }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar plano (opcional)" /></SelectTrigger>
                  <SelectContent>
                    {plans
                      .filter((p) => !form.patient_id || p.patient_id === form.patient_id)
                      .map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Descrição</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Validade (dias)</Label>
                <Input type="number" min={0} value={form.validity_days} onChange={(e) => setForm({ ...form, validity_days: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Desconto (R$)</Label>
                <Input type="number" min={0} step={0.01} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" />Adicionar item</Button>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhum item. Importe de um plano ou adicione manualmente.</p>
              ) : (
                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end border border-border rounded-md p-2">
                      <div className="col-span-5 space-y-1">
                        <Label className="text-xs">Descrição</Label>
                        <Input value={it.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Dente</Label>
                        <Input value={it.tooth_number} onChange={(e) => updateItem(idx, "tooth_number", e.target.value)} />
                      </div>
                      <div className="col-span-1 space-y-1">
                        <Label className="text-xs">Qtd</Label>
                        <Input type="number" min={1} value={it.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Valor unit.</Label>
                        <Input type="number" min={0} step={0.01} value={it.unit_value} onChange={(e) => updateItem(idx, "unit_value", Number(e.target.value))} />
                      </div>
                      <div className="col-span-1 text-right text-sm font-medium">{fmt((Number(it.unit_value) || 0) * (Number(it.quantity) || 0))}</div>
                      <div className="col-span-1 text-right">
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeItem(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end text-sm space-x-6 pt-1">
                <span>Subtotal: <strong>{fmt(subtotal)}</strong></span>
                <span>Desconto: <strong>{fmt(Number(form.discount_value) || 0)}</strong></span>
                <span>Total: <strong className="text-primary">{fmt(total)}</strong></span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button variant="outline" onClick={() => save(false)}>Salvar rascunho</Button>
            <Button onClick={() => save(true)}><Send className="h-4 w-4 mr-1.5" /> Salvar e emitir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewing?.budget_number ?? "Orçamento"}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Paciente:</span> <strong>{viewing.patients?.name ?? "—"}</strong></div>
                <div><span className="text-muted-foreground">Dentista:</span> <strong>{viewing.dentists?.name ?? "—"}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={STATUS_BADGE[viewing.status]}>{BUDGET_STATUS_LABELS[viewing.status]}</Badge></div>
                <div><span className="text-muted-foreground">Validade:</span> {formatBR(viewing.validity_date)}</div>
              </div>
              <div className="font-medium">{viewing.title}</div>
              {viewing.description && <p className="text-muted-foreground">{viewing.description}</p>}
              <div className="rounded border border-border overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Dente</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Unit</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {viewing.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>{it.description}</TableCell>
                        <TableCell>{it.tooth_number ?? "—"}</TableCell>
                        <TableCell className="text-right">{it.quantity}</TableCell>
                        <TableCell className="text-right">{fmt(Number(it.unit_value))}</TableCell>
                        <TableCell className="text-right">{fmt(Number(it.total_value))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-6">
                <span>Subtotal: <strong>{fmt(Number(viewing.subtotal))}</strong></span>
                <span>Desconto: <strong>{fmt(Number(viewing.discount_value))}</strong></span>
                <span>Total: <strong className="text-primary">{fmt(Number(viewing.total_value))}</strong></span>
              </div>
              {viewing.notes && <div><span className="text-muted-foreground">Observações:</span> {viewing.notes}</div>}
              {viewing.cancelled_reason && <div className="text-destructive">Cancelado: {viewing.cancelled_reason}</div>}
              <div className="pt-3 border-t border-border">
                <DocumentSignatureSection
                  documentType="budget"
                  documentId={viewing.id}
                  documentTitle={`Orçamento ${viewing.budget_number ?? ""}`.trim()}
                  patientId={viewing.patient_id}
                  canCollect={viewing.status === "emitido" || viewing.status === "aceito"}
                  defaultSignerName={viewing.patients?.name ?? undefined}
                  defaultSignerDocument={viewing.patients?.cpf ?? undefined}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleDownloadPdf(viewing)}><Download className="h-4 w-4 mr-1.5" /> Baixar PDF</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(v) => { if (!v) { setCancelTarget(null); setCancelReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cancelar orçamento</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelReason(""); }}>Voltar</Button>
            <Button variant="destructive" onClick={handleCancel}>Cancelar orçamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

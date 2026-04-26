import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { KPICard } from "@/components/KPICard";
import { useFinancialRecords, FINANCIAL_STATUS_LABELS, PAYMENT_METHOD_LABELS_V2, type FinancialStatus, type PaymentMethodEnum } from "@/hooks/useFinancialRecords";
import { usePatients } from "@/hooks/usePatients";
import { useReceipts } from "@/hooks/useReceipts";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import { useAuth } from "@/lib/auth-context";
import { canCreateFinancialRecord, canEditFinancialOriginalValue, canCancelOrRefundFinancial, canReceivePayment, canIssueReceipt, canSendWhatsApp } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { WhatsAppMessageModal } from "@/components/WhatsAppMessageModal";
import { generateReceiptPdf, downloadPdf } from "@/lib/pdf-documents";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { DollarSign, Search, Edit, CreditCard, XCircle, Undo2, AlertTriangle, Receipt, MessageCircle, Download } from "lucide-react";

const STATUS_VARIANT: Record<FinancialStatus, string> = {
  pendente: "bg-muted text-muted-foreground",
  pago: "bg-success/10 text-success",
  parcial: "bg-warning/10 text-warning",
  atrasado: "bg-destructive/10 text-destructive",
  cancelado: "bg-muted text-muted-foreground line-through",
  estornado: "bg-muted text-muted-foreground",
};

function fmt(v: number) { return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v ?? 0); }
function formatBR(d?: string | null) { if (!d) return "—"; const [y,m,day]=d.split("-"); return `${day}/${m}/${y}`; }

export default function FinancialPage() {
  const { user } = useAuth();
  const canCreate = user ? canCreateFinancialRecord(user.role) : false;
  const canEditValue = user ? canEditFinancialOriginalValue(user.role) : false;
  const canReceive = user ? canReceivePayment(user.role) : false;
  const canCancelRefund = user ? canCancelOrRefundFinancial(user.role) : false;
  const canReceipt = user ? canIssueReceipt(user.role) : false;
  const canWhats = user ? canSendWhatsApp(user.role) : false;

  const { records, loading, addRecord, updateRecord, registerPayment, cancelRecord, refundRecord } = useFinancialRecords();
  const { patients } = usePatients();
  const { receipts, create: createReceipt } = useReceipts();
  const { settings } = useClinicSettings();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<PaymentMethodEnum>("pix");
  const [cancelOpen, setCancelOpen] = useState<{ id: string; kind: "cancel" | "refund" } | null>(null);
  const [reason, setReason] = useState("");
  const [whatsTarget, setWhatsTarget] = useState<{ recordId: string; patientId: string; patientName: string; phone: string | null; remaining: number } | null>(null);

  const [form, setForm] = useState({
    patient_id: "", description: "",
    original_value: 0, discount_value: 0,
    payment_method: "pix" as PaymentMethodEnum, due_date: "",
  });

  const filtered = useMemo(() => records.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (methodFilter !== "all" && r.payment_method !== methodFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return r.description.toLowerCase().includes(s) || r.patients?.name?.toLowerCase().includes(s);
  }), [records, search, statusFilter, methodFilter]);

  const summary = useMemo(() => {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    let received = 0, pending = 0, overdue = 0, partial = 0, pendingCount = 0;
    records.forEach(r => {
      const final = Number(r.final_value), paid = Number(r.paid_value), remaining = Number(r.remaining_value);
      if (r.status === "pago" && r.payment_date && new Date(r.payment_date) >= monthStart) received += paid;
      if (r.status === "pendente") { pending += final; pendingCount += 1; }
      if (r.status === "atrasado") overdue += remaining;
      if (r.status === "parcial") partial += remaining;
    });
    return { received, pending, overdue, partial, pendingCount };
  }, [records]);

  // Receipts indexed by financial_record_id (latest first per record)
  const receiptsByRecord = useMemo(() => {
    const map = new Map<string, typeof receipts>();
    receipts.forEach((r) => {
      const arr = map.get(r.financial_record_id) ?? [];
      arr.push(r);
      map.set(r.financial_record_id, arr);
    });
    return map;
  }, [receipts]);

  const fmtMoneyForVar = (v: number) => fmt(v);

  const handleGenerateReceipt = async (recordId: string) => {
    const r = records.find((x) => x.id === recordId);
    if (!r) return;
    const paid = Number(r.paid_value);
    if (paid <= 0) { toast.error("Não há valor pago para este lançamento."); return; }
    if (r.status === "cancelado" || r.status === "estornado") { toast.error("Lançamento não pode gerar recibo."); return; }
    try {
      await createReceipt({
        financial_record_id: r.id,
        patient_id: r.patient_id,
        amount: paid,
        payment_method: r.payment_method,
        payment_date: r.payment_date ?? new Date().toISOString().slice(0, 10),
        description: r.description,
        notes: null,
        issued_by: user?.id ?? null,
      });
      toast.success("Recibo gerado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar recibo.");
    }
  };

  const handleDownloadReceipt = async (recordId: string) => {
    const list = receiptsByRecord.get(recordId);
    const last = list?.[0];
    if (!last) { toast.error("Nenhum recibo encontrado."); return; }
    try {
      const doc = await generateReceiptPdf({
        number: last.receipt_number,
        amount: Number(last.amount),
        paymentMethod: last.payment_method ? PAYMENT_METHOD_LABELS_V2[last.payment_method as PaymentMethodEnum] : null,
        paymentDate: last.payment_date,
        description: last.description,
        notes: last.notes,
        patient: { name: last.patients?.name ?? "—", cpf: last.patients?.cpf ?? null },
        issuedByName: null,
        createdAt: last.created_at,
      }, settings ?? null);
      downloadPdf(doc, `${last.receipt_number ?? "recibo"}.pdf`);
      await logAudit("receipt.download", "payment_receipts", last.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF.");
    }
  };

  const openWhats = (recordId: string) => {
    const r = records.find((x) => x.id === recordId);
    if (!r) return;
    setWhatsTarget({
      recordId: r.id,
      patientId: r.patient_id,
      patientName: r.patients?.name ?? "Paciente",
      phone: r.patients?.phone ?? null,
      remaining: Number(r.remaining_value),
    });
  };

  const openNew = () => {
    if (!canCreate) { toast.error("Sem permissão."); return; }
    setEditingId(null);
    setForm({ patient_id: "", description: "", original_value: 0, discount_value: 0, payment_method: "pix", due_date: "" });
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    const r = records.find(x => x.id === id); if (!r) return;
    setEditingId(id);
    setForm({
      patient_id: r.patient_id, description: r.description,
      original_value: Number(r.original_value), discount_value: Number(r.discount_value),
      payment_method: (r.payment_method ?? "pix") as PaymentMethodEnum,
      due_date: r.due_date ?? "",
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.patient_id || !form.description) { toast.error("Paciente e descrição obrigatórios."); return; }
    if (form.original_value < 0) { toast.error("Valor não pode ser negativo."); return; }
    if (form.discount_value > form.original_value) { toast.error("Desconto não pode exceder o valor."); return; }
    const payload = {
      patient_id: form.patient_id,
      description: form.description,
      original_value: form.original_value,
      discount_value: form.discount_value,
      final_value: 0, // recalculado no hook
      paid_value: 0,
      remaining_value: 0,
      payment_method: form.payment_method,
      due_date: form.due_date || null,
      created_by: user?.id ?? null, updated_by: user?.id ?? null,
    };
    try {
      if (editingId) {
        if (!canEditValue) { toast.error("Sem permissão para alterar valor original."); return; }
        await updateRecord(editingId, payload); toast.success("Lançamento atualizado!");
      } else { await addRecord(payload); toast.success("Lançamento criado!"); }
      setFormOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  const openPay = (id: string) => {
    const r = records.find(x => x.id === id); if (!r) return;
    setPayOpen(id);
    setPayAmount(Number(r.remaining_value));
    setPayMethod((r.payment_method ?? "pix") as PaymentMethodEnum);
  };

  const handlePay = async () => {
    if (!payOpen) return;
    try { await registerPayment(payOpen, payAmount, payMethod, user?.id); toast.success("Pagamento registrado!"); setPayOpen(null); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  const submitReason = async () => {
    if (!cancelOpen) return;
    try {
      if (cancelOpen.kind === "cancel") await cancelRecord(cancelOpen.id, reason);
      else await refundRecord(cancelOpen.id, reason);
      toast.success("Operação concluída.");
      setCancelOpen(null); setReason("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Financeiro" description="Lançamentos e pagamentos da clínica"
          actionLabel={canCreate ? "Novo Lançamento" : undefined} onAction={canCreate ? openNew : undefined} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Recebido no mês" value={fmt(summary.received)} icon={DollarSign} trendUp />
          <KPICard title="Pendente" value={fmt(summary.pending)} icon={DollarSign} />
          <KPICard title="Atrasado" value={fmt(summary.overdue)} icon={AlertTriangle} />
          <KPICard title="Parcial em aberto" value={fmt(summary.partial)} icon={DollarSign} />
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56 h-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(FINANCIAL_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Forma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas formas</SelectItem>
              {Object.entries(PAYMENT_METHOD_LABELS_V2).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-12">Carregando...</div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhum lançamento" icon={DollarSign} />
        ) : (
          <div className="rounded-xl bg-surface shadow-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="hidden sm:table-cell">Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="hidden sm:table-cell">Restante</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{r.description}</p>
                      <p className="text-xs text-muted-foreground">{r.payment_method ? PAYMENT_METHOD_LABELS_V2[r.payment_method as PaymentMethodEnum] : "—"}</p>
                    </TableCell>
                    <TableCell className="text-sm">{r.patients?.name ?? "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatBR(r.due_date)}</TableCell>
                    <TableCell className="font-medium">{fmt(Number(r.final_value))}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{fmt(Number(r.remaining_value))}</TableCell>
                    <TableCell><Badge className={STATUS_VARIANT[r.status]}>{FINANCIAL_STATUS_LABELS[r.status]}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canEditValue && r.status !== "pago" && r.status !== "cancelado" && r.status !== "estornado" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r.id)} title="Editar"><Edit className="h-3.5 w-3.5" /></Button>
                        )}
                        {canReceive && (r.status === "pendente" || r.status === "parcial" || r.status === "atrasado") && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => openPay(r.id)} title="Receber"><CreditCard className="h-3.5 w-3.5" /></Button>
                        )}
                        {canCancelRefund && (r.status === "pendente" || r.status === "parcial" || r.status === "atrasado") && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setCancelOpen({ id: r.id, kind: "cancel" }); setReason(""); }} title="Cancelar"><XCircle className="h-3.5 w-3.5" /></Button>
                        )}
                        {canCancelRefund && r.status === "pago" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-warning" onClick={() => { setCancelOpen({ id: r.id, kind: "refund" }); setReason(""); }} title="Estornar"><Undo2 className="h-3.5 w-3.5" /></Button>
                        )}
                        {canReceipt && Number(r.paid_value) > 0 && r.status !== "cancelado" && r.status !== "estornado" && !receiptsByRecord.get(r.id)?.length && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleGenerateReceipt(r.id)} title="Gerar recibo"><Receipt className="h-3.5 w-3.5" /></Button>
                        )}
                        {(receiptsByRecord.get(r.id)?.length ?? 0) > 0 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadReceipt(r.id)} title="Baixar recibo PDF"><Download className="h-3.5 w-3.5" /></Button>
                        )}
                        {canWhats && (r.status === "pendente" || r.status === "parcial" || r.status === "atrasado") && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => openWhats(r.id)} title="Enviar cobrança por WhatsApp"><MessageCircle className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Form */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Paciente *</Label>
                <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{patients.filter(p => p.status === "active").map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Descrição *</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Valor Original (R$) *</Label><Input type="number" min={0} step="0.01" value={form.original_value} onChange={e => setForm({ ...form, original_value: +e.target.value })} disabled={!canEditValue && !!editingId} /></div>
                <div className="space-y-2"><Label>Desconto (R$)</Label><Input type="number" min={0} step="0.01" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: +e.target.value })} disabled={!canEditValue && !!editingId} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Forma Padrão</Label>
                  <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v as PaymentMethodEnum })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PAYMENT_METHOD_LABELS_V2).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <p className="text-xs text-muted-foreground">Valor final: {fmt(Math.max(0, form.original_value - form.discount_value))}</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
                <Button onClick={save}>{editingId ? "Salvar" : "Criar"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Pay */}
        <Dialog open={!!payOpen} onOpenChange={() => setPayOpen(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Receber Pagamento</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              {payOpen && (() => {
                const r = records.find(x => x.id === payOpen);
                return r && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="font-medium">{r.description}</p>
                    <p className="text-xs text-muted-foreground">Total: {fmt(Number(r.final_value))} · Pago: {fmt(Number(r.paid_value))} · Restante: {fmt(Number(r.remaining_value))}</p>
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Valor (R$)</Label><Input type="number" min={0.01} step="0.01" value={payAmount} onChange={e => setPayAmount(+e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Forma</Label>
                  <Select value={payMethod} onValueChange={v => setPayMethod(v as PaymentMethodEnum)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PAYMENT_METHOD_LABELS_V2).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPayOpen(null)}>Cancelar</Button>
                <Button onClick={handlePay}>Confirmar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel/refund reason */}
        <Dialog open={!!cancelOpen} onOpenChange={() => { setCancelOpen(null); setReason(""); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{cancelOpen?.kind === "refund" ? "Estornar Pagamento" : "Cancelar Lançamento"}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <Label>Motivo *</Label>
              <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setCancelOpen(null); setReason(""); }}>Voltar</Button>
                <Button variant="destructive" onClick={submitReason}>Confirmar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {whatsTarget && (
          <WhatsAppMessageModal
            open={!!whatsTarget}
            onClose={() => setWhatsTarget(null)}
            phone={whatsTarget.phone}
            entity="financial_records"
            entityId={whatsTarget.recordId}
            context="financeiro.cobranca"
            patientId={whatsTarget.patientId}
            financialRecordId={whatsTarget.recordId}
            communicationType="cobranca"
            templateTypes={["cobranca", "outro"]}
            vars={{
              nome_paciente: whatsTarget.patientName,
              nome_clinica: settings?.clinic_name ?? "",
              valor_pendente: fmtMoneyForVar(whatsTarget.remaining),
              whatsapp_clinica: settings?.whatsapp ?? "",
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}

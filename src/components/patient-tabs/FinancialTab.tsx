import { useState } from "react";
import { useFinancialRecords, FINANCIAL_STATUS_LABELS, PAYMENT_METHOD_LABELS_V2, type PaymentMethodEnum } from "@/hooks/useFinancialRecords";
import { useAuth } from "@/lib/auth-context";
import {
  canCreateFinancialRecord, canEditFinancialOriginalValue, canReceivePayment, canCancelOrRefundFinancial,
} from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus, DollarSign, CreditCard, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

const fmtMoney = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

interface Props {
  patientId: string;
  isPatientActive: boolean; // NOVO
}

export function FinancialTab({ patientId, isPatientActive }: Props) {
  const { user } = useAuth();
  
  // ATUALIZADO: Cruzando a permissão do user com o isPatientActive
  const canCreate = user ? (canCreateFinancialRecord(user.role) && isPatientActive) : false;
  const canEditValue = user ? (canEditFinancialOriginalValue(user.role) && isPatientActive) : false;
  const canPay = user ? (canReceivePayment(user.role) && isPatientActive) : false;
  const canCancel = user ? (canCancelOrRefundFinancial(user.role) && isPatientActive) : false;

  const { records, loading, addRecord, registerPayment, cancelRecord, refundRecord } = useFinancialRecords(patientId);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    description: "", original_value: "0", discount_value: "0", due_date: "",
  });

  const [payOpen, setPayOpen] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("0");
  const [payMethod, setPayMethod] = useState<PaymentMethodEnum>("dinheiro");
  const [paying, setPaying] = useState(false);

  const submit = async () => {
    if (!form.description.trim()) return toast.error("Descrição é obrigatória.");
    const original = Number(form.original_value);
    if (original < 0) return toast.error("Valor não pode ser negativo.");
    setSaving(true);
    try {
      await addRecord({
        patient_id: patientId, description: form.description.trim(),
        original_value: original,
        discount_value: canEditValue ? Number(form.discount_value) : 0,
        due_date: form.due_date || null, created_by: user?.id ?? null,
      });
      toast.success("Lançamento criado.");
      setForm({ description: "", original_value: "0", discount_value: "0", due_date: "" });
      setOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
    finally { setSaving(false); }
  };

  const submitPayment = async () => {
    if (!payOpen) return;
    const amount = Number(payAmount);
    if (amount <= 0) return toast.error("Valor deve ser maior que zero.");
    setPaying(true);
    try {
      await registerPayment(payOpen, amount, payMethod, user?.id);
      toast.success("Pagamento registrado.");
      setPayOpen(null); setPayAmount("0");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
    finally { setPaying(false); }
  };

  const onCancel = async (id: string) => {
    const reason = window.prompt("Motivo do cancelamento:");
    if (!reason) return;
    try { await cancelRecord(id, reason); toast.success("Lançamento cancelado."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  const onRefund = async (id: string) => {
    const reason = window.prompt("Motivo do estorno:");
    if (!reason) return;
    try { await refundRecord(id, reason); toast.success("Estornado."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  const total = records.reduce((s, r) => s + Number(r.final_value), 0);
  const paid = records.reduce((s, r) => s + Number(r.paid_value), 0);
  const remaining = records.reduce((s, r) => s + Number(r.remaining_value), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Financeiro</h2>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Nova cobrança</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova cobrança</DialogTitle><DialogDescription>Crie um lançamento financeiro para o paciente.</DialogDescription></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Descrição *</Label>
                  <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor original (R$) *</Label>
                    <Input type="number" min="0" step="0.01" value={form.original_value} onChange={e => setForm({ ...form, original_value: e.target.value })} disabled={!canEditValue} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Desconto (R$)</Label>
                    <Input type="number" min="0" step="0.01" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })} disabled={!canEditValue} />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">Vencimento</Label>
                    <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                </div>
                {!canEditValue && <p className="text-[11px] text-muted-foreground">Você não tem permissão para alterar valor original.</p>}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit} disabled={saving}>{saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-sm font-semibold">{fmtMoney(total)}</p></div>
        <div className="rounded-lg bg-success/10 p-3"><p className="text-xs text-muted-foreground">Recebido</p><p className="text-sm font-semibold text-success">{fmtMoney(paid)}</p></div>
        <div className="rounded-lg bg-warning/10 p-3"><p className="text-xs text-muted-foreground">A receber</p><p className="text-sm font-semibold text-warning">{fmtMoney(remaining)}</p></div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nenhum lançamento financeiro.</p>
      ) : (
        <div className="space-y-2">
          {records.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.description}</p>
                <p className="text-xs text-muted-foreground">
                  Final: {fmtMoney(Number(r.final_value))} · Pago: {fmtMoney(Number(r.paid_value))} · Resta: {fmtMoney(Number(r.remaining_value))}
                  {r.due_date && ` · Vence: ${new Date(r.due_date).toLocaleDateString("pt-BR")}`}
                </p>
              </div>
              <StatusBadge status={r.status} label={FINANCIAL_STATUS_LABELS[r.status]} />
              {canPay && r.status !== "pago" && r.status !== "cancelado" && r.status !== "estornado" && (
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Registrar pagamento" title="Registrar pagamento" onClick={() => { setPayOpen(r.id); setPayAmount(String(r.remaining_value)); }}>
                  <CreditCard className="h-4 w-4 text-primary" />
                </Button>
              )}
              {canCancel && r.status !== "pago" && r.status !== "cancelado" && r.status !== "estornado" && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Cancelar" title="Cancelar" onClick={() => onCancel(r.id)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
              {canCancel && (r.status === "pago" || r.status === "parcial") && (
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Estornar" title="Estornar" onClick={() => onRefund(r.id)}>
                  <RotateCcw className="h-4 w-4 text-warning" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!payOpen} onOpenChange={v => !v && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar pagamento</DialogTitle><DialogDescription>Informe valor e forma de pagamento.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$)</Label>
              <Input type="number" min="0" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Forma de pagamento</Label>
              <Select value={payMethod} onValueChange={v => setPayMethod(v as PaymentMethodEnum)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PAYMENT_METHOD_LABELS_V2).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayOpen(null)}>Cancelar</Button>
            <Button onClick={submitPayment} disabled={paying}>{paying && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

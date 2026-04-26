import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { canIssueReceipt, getPermission } from "@/lib/permissions";
import { useReceipts } from "@/hooks/useReceipts";
import { useFinancialRecords, PAYMENT_METHOD_LABELS_V2, type PaymentMethodEnum } from "@/hooks/useFinancialRecords";
import { usePatients } from "@/hooks/usePatients";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import { logAudit } from "@/lib/audit";
import { generateReceiptPdf, downloadPdf } from "@/lib/pdf-documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Download, Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import { DocumentSignatureSection } from "@/components/DocumentSignatureSection";
import { documentSignatureService } from "@/services/documentSignatureService";

function fmt(v: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0); }
function formatBR(d?: string | null) { if (!d) return "—"; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; }

export default function ReceiptsPage() {
  const { user } = useAuth();
  const canView = user ? getPermission(user.role, "receipts").canView : false;
  const canIssue = user ? canIssueReceipt(user.role) : false;

  const { receipts, loading, create } = useReceipts();
  const { records } = useFinancialRecords();
  const { patients } = usePatients();
  const { settings } = useClinicSettings();

  const [search, setSearch] = useState("");
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [viewing, setViewing] = useState<typeof receipts[number] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    financial_record_id: "",
    amount: 0,
    payment_method: "pix" as PaymentMethodEnum,
    payment_date: new Date().toISOString().slice(0, 10),
    description: "",
    notes: "",
  });

  const filtered = useMemo(() => receipts.filter((r) => {
    if (patientFilter !== "all" && r.patient_id !== patientFilter) return false;
    if (methodFilter !== "all" && r.payment_method !== methodFilter) return false;
    const date = r.payment_date ?? r.created_at?.slice(0, 10);
    if (from && date < from) return false;
    if (to && date > to) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (r.receipt_number ?? "").toLowerCase().includes(s) ||
      (r.patients?.name ?? "").toLowerCase().includes(s) ||
      (r.description ?? "").toLowerCase().includes(s)
    );
  }), [receipts, search, patientFilter, methodFilter, from, to]);

  // Eligible payments = paid or partial financial records (have actual paid amount)
  const eligibleRecords = useMemo(
    () => records.filter((r) => Number(r.paid_value) > 0 && r.status !== "estornado" && r.status !== "cancelado"),
    [records],
  );

  if (!canView) return <Navigate to="/acesso-negado" replace />;

  const openNew = () => {
    if (!canIssue) { toast.error("Sem permissão para emitir recibos."); return; }
    setForm({
      financial_record_id: "",
      amount: 0,
      payment_method: "pix",
      payment_date: new Date().toISOString().slice(0, 10),
      description: "",
      notes: "",
    });
    setFormOpen(true);
  };

  const handleSelectFinancial = (id: string) => {
    const r = records.find((x) => x.id === id);
    if (!r) return;
    setForm((f) => ({
      ...f,
      financial_record_id: id,
      amount: Number(r.paid_value),
      payment_method: (r.payment_method ?? "pix") as PaymentMethodEnum,
      payment_date: r.payment_date ?? new Date().toISOString().slice(0, 10),
      description: r.description,
    }));
  };

  const handleSave = async () => {
    if (!form.financial_record_id) { toast.error("Selecione um pagamento."); return; }
    if (form.amount <= 0) { toast.error("Valor deve ser maior que zero."); return; }
    const fin = records.find((x) => x.id === form.financial_record_id);
    if (!fin) { toast.error("Pagamento não encontrado."); return; }
    try {
      await create({
        financial_record_id: fin.id,
        patient_id: fin.patient_id,
        amount: form.amount,
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        description: form.description || fin.description,
        notes: form.notes || null,
        issued_by: user?.id ?? null,
      });
      toast.success("Recibo gerado.");
      setFormOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar recibo.");
    }
  };

  const handleDownload = async (r: typeof receipts[number]) => {
    try {
      if (!r.patients) { toast.error("Paciente não encontrado."); return; }
      let signature = null as Awaited<ReturnType<typeof documentSignatureService.getSignatureByDocument>> | null;
      try {
        signature = await documentSignatureService.getSignatureByDocument("receipt", r.id);
      } catch { signature = null; }
      const doc = await generateReceiptPdf({
        number: r.receipt_number,
        amount: Number(r.amount),
        paymentMethod: r.payment_method ? PAYMENT_METHOD_LABELS_V2[r.payment_method as PaymentMethodEnum] : null,
        paymentDate: r.payment_date,
        description: r.description,
        notes: r.notes,
        patient: { name: r.patients.name, cpf: r.patients.cpf },
        issuedByName: null,
        createdAt: r.created_at,
      }, settings ?? null, signature ? {
        signerName: signature.signer_name,
        signerDocument: signature.signer_document,
        signedAt: signature.signed_at,
        imageUrl: signature.signature_image_url,
      } : null);
      downloadPdf(doc, `${r.receipt_number ?? "recibo"}.pdf`);
      await logAudit("receipt.download", "payment_receipts", r.id);
      if (signature) await logAudit("signature.download", "payment_receipts", r.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF.");
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Recibos" description="Gestão de recibos de pagamentos">
        {canIssue && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1.5" /> Novo recibo</Button>}
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4 mb-4">
        <Input placeholder="Buscar por número, paciente, descrição..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={patientFilter} onValueChange={setPatientFilter}>
          <SelectTrigger><SelectValue placeholder="Paciente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os pacientes</SelectItem>
            {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger><SelectValue placeholder="Forma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas formas</SelectItem>
            {Object.entries(PAYMENT_METHOD_LABELS_V2).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="Nenhum recibo" description="Gere um recibo a partir de um pagamento registrado." />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.receipt_number ?? "—"}</TableCell>
                  <TableCell>{r.patients?.name ?? "—"}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{r.description ?? "—"}</TableCell>
                  <TableCell>{r.payment_method ? PAYMENT_METHOD_LABELS_V2[r.payment_method as PaymentMethodEnum] : "—"}</TableCell>
                  <TableCell>{formatBR(r.payment_date)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(Number(r.amount))}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewing(r)} title="Ver"><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDownload(r)} title="Baixar PDF"><Download className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* New receipt dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo recibo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Pagamento *</Label>
              <Select value={form.financial_record_id} onValueChange={handleSelectFinancial}>
                <SelectTrigger><SelectValue placeholder="Selecionar pagamento registrado" /></SelectTrigger>
                <SelectContent>
                  {eligibleRecords.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum pagamento registrado</div>
                  ) : eligibleRecords.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.patients?.name ?? "—"} — {r.description} — {fmt(Number(r.paid_value))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input type="number" min={0.01} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Forma</Label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v as PaymentMethodEnum })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS_V2).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data do pagamento</Label>
                <Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Gerar recibo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{viewing?.receipt_number ?? "Recibo"}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Paciente:</span> <strong>{viewing.patients?.name ?? "—"}</strong></div>
              <div><span className="text-muted-foreground">Descrição:</span> {viewing.description ?? "—"}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Valor:</span> <strong>{fmt(Number(viewing.amount))}</strong></div>
                <div><span className="text-muted-foreground">Forma:</span> {viewing.payment_method ? PAYMENT_METHOD_LABELS_V2[viewing.payment_method as PaymentMethodEnum] : "—"}</div>
                <div><span className="text-muted-foreground">Data:</span> {formatBR(viewing.payment_date)}</div>
                <div><span className="text-muted-foreground">Emitido em:</span> {new Date(viewing.created_at).toLocaleDateString("pt-BR")}</div>
              </div>
              {viewing.notes && <div className="pt-2 border-t border-border"><span className="text-muted-foreground">Observações:</span> {viewing.notes}</div>}
              <div className="pt-3 border-t border-border">
                <DocumentSignatureSection
                  documentType="receipt"
                  documentId={viewing.id}
                  documentTitle={`Recibo ${viewing.receipt_number ?? ""}`.trim()}
                  patientId={viewing.patient_id}
                  defaultSignerName={viewing.patients?.name ?? undefined}
                  defaultSignerDocument={viewing.patients?.cpf ?? undefined}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleDownload(viewing)}><Download className="h-4 w-4 mr-1.5" /> Baixar PDF</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

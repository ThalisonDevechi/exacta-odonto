import { useState } from "react";
import { useBudgets } from "@/hooks/useBudgets";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import { useAuth } from "@/lib/auth-context";
import { canSendWhatsApp } from "@/lib/permissions";
import { BUDGET_STATUS_LABELS, type BudgetStatus, type BudgetWithItems } from "@/services/budgetService";
import { generateBudgetPdf, downloadPdf } from "@/lib/pdf-documents";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { WhatsAppMessageModal } from "@/components/WhatsAppMessageModal";
import { EmptyState } from "@/components/EmptyState";
import { Download, Eye, Send, CheckCircle2, XCircle, Ban, FileText, MessageCircle } from "lucide-react";
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
function formatBR(d?: string | null) { if (!d) return "—"; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; }

interface Props {
  patientId: string;
  patientName: string;
  patientPhone: string | null | undefined;
  isPatientActive: boolean; // NOVO
}

export function PatientBudgetsTab({ patientId, patientName, patientPhone, isPatientActive }: Props) {
  const { user } = useAuth();
  const { budgets, loading, issue, accept, reject, cancel } = useBudgets(patientId);
  const { settings } = useClinicSettings();

  const isAdmin = user?.role === "admin";
  const isDentist = user?.role === "dentist";
  // ATUALIZADO: Cruza permissões do user com a ativação do paciente
  const canManage = (isAdmin || isDentist) && isPatientActive;
  const canWhatsApp = user ? canSendWhatsApp(user.role) : false;

  const [viewing, setViewing] = useState<BudgetWithItems | null>(null);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [whatsappBudget, setWhatsappBudget] = useState<BudgetWithItems | null>(null);

  const handleDownload = async (b: BudgetWithItems) => {
    try {
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
        patient: { name: b.patients?.name ?? patientName, cpf: b.patients?.cpf, phone: b.patients?.phone },
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

  const handleIssue = async (id: string) => {
    try { await issue(id); toast.success("Orçamento emitido."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };
  const handleAccept = async (id: string) => {
    try { await accept(id); toast.success("Orçamento aceito."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };
  const handleReject = async (id: string) => {
    try { await reject(id); toast.success("Orçamento recusado."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };
  const handleCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) { toast.error("Motivo é obrigatório."); return; }
    try {
      await cancel(cancelTarget, cancelReason);
      toast.success("Orçamento cancelado.");
      setCancelTarget(null);
      setCancelReason("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando orçamentos...</p>;
  if (budgets.length === 0) {
    return <EmptyState icon={FileText} title="Nenhum orçamento" description="Este paciente ainda não tem orçamentos." />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">Desconto</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.budget_number ?? "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate">{b.title}</TableCell>
                <TableCell>{formatBR(b.validity_date)}</TableCell>
                <TableCell className="text-right">{fmt(Number(b.subtotal))}</TableCell>
                <TableCell className="text-right">{fmt(Number(b.discount_value))}</TableCell>
                <TableCell className="text-right font-medium">{fmt(Number(b.total_value))}</TableCell>
                <TableCell><Badge className={STATUS_BADGE[b.status]}>{BUDGET_STATUS_LABELS[b.status]}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewing(b)} title="Ver detalhes"><Eye className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDownload(b)} title="Baixar PDF"><Download className="h-4 w-4" /></Button>
                    {canWhatsApp && (
                      <Button size="sm" variant="ghost" onClick={() => setWhatsappBudget(b)} title="Enviar WhatsApp">
                        <MessageCircle className="h-4 w-4 text-success" />
                      </Button>
                    )}
                    {canManage && b.status === "rascunho" && (
                      <Button size="sm" variant="ghost" onClick={() => handleIssue(b.id)} title="Emitir"><Send className="h-4 w-4 text-primary" /></Button>
                    )}
                    {canManage && b.status === "emitido" && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => handleAccept(b.id)} title="Aceitar"><CheckCircle2 className="h-4 w-4 text-success" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleReject(b.id)} title="Recusar"><XCircle className="h-4 w-4 text-destructive" /></Button>
                      </>
                    )}
                    {canManage && b.status !== "aceito" && b.status !== "cancelado" && (
                      <Button size="sm" variant="ghost" onClick={() => setCancelTarget(b.id)} title="Cancelar"><Ban className="h-4 w-4" /></Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Detalhes */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Orçamento {viewing?.budget_number ?? ""}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <p><span className="font-semibold">Título:</span> {viewing.title}</p>
              {viewing.description && <p className="text-muted-foreground">{viewing.description}</p>}
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-center">Qtd</TableHead><TableHead className="text-right">Unit.</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {viewing.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>{it.description}</TableCell>
                        <TableCell className="text-center">{it.quantity}</TableCell>
                        <TableCell className="text-right">{fmt(Number(it.unit_value))}</TableCell>
                        <TableCell className="text-right">{fmt(Number(it.total_value))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-6 text-sm">
                <span>Subtotal: <strong>{fmt(Number(viewing.subtotal))}</strong></span>
                <span>Desconto: <strong>{fmt(Number(viewing.discount_value))}</strong></span>
                <span className="text-base">Total: <strong>{fmt(Number(viewing.total_value))}</strong></span>
              </div>
              <div className="pt-3 border-t border-border">
                {/* Nota: se quiser bloquear assinaturas em inativos, isPatientActive também pode ser passado aqui ou usado no canCollect */}
                <DocumentSignatureSection
                  documentType="budget"
                  documentId={viewing.id}
                  documentTitle={`Orçamento ${viewing.budget_number ?? ""}`.trim()}
                  patientId={patientId}
                  canCollect={(viewing.status === "emitido" || viewing.status === "aceito") && isPatientActive}
                  defaultSignerName={patientName}
                  defaultSignerDocument={viewing.patients?.cpf ?? undefined}
                />
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewing(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancelar */}
      <Dialog open={!!cancelTarget} onOpenChange={(v) => !v && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar orçamento</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Motivo do cancelamento *</Label>
            <Textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Voltar</Button>
            <Button variant="destructive" onClick={handleCancel}>Cancelar orçamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp */}
      {whatsappBudget && (
        <WhatsAppMessageModal
          open={!!whatsappBudget}
          onClose={() => setWhatsappBudget(null)}
          phone={patientPhone ?? null}
          templateTypes={["orcamento", "outro"]}
          vars={{
            nome_paciente: patientName,
            nome_clinica: settings?.clinic_name ?? "",
            whatsapp_clinica: settings?.whatsapp ?? "",
            valor_pendente: fmt(Number(whatsappBudget.total_value)),
          }}
          defaultMessage={`Olá ${patientName}, segue o orçamento ${whatsappBudget.budget_number ?? ""} no valor de ${fmt(Number(whatsappBudget.total_value))}.`}
          context="patient_detail.budget"
          entity="treatment_budgets"
          entityId={whatsappBudget.id}
          title="Enviar orçamento por WhatsApp"
        />
      )}
    </div>
  );
}

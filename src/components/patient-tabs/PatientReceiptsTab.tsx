import { useReceipts } from "@/hooks/useReceipts";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import { generateReceiptPdf, downloadPdf } from "@/lib/pdf-documents";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { Download, Receipt as ReceiptIcon } from "lucide-react";
import { toast } from "sonner";
import { DocumentSignatureSection } from "@/components/DocumentSignatureSection";
import { documentSignatureService } from "@/services/documentSignatureService";
import type { ReceiptWithRelations } from "@/services/receiptService";

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro", pix: "PIX", cartao_credito: "Cartão crédito",
  cartao_debito: "Cartão débito", boleto: "Boleto", transferencia: "Transferência",
  convenio: "Convênio", outro: "Outro",
};

function fmt(v: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0); }
function formatBR(d?: string | null) { if (!d) return "—"; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; }

interface Props {
  patientId: string;
  patientName: string;
  isPatientActive: boolean; // NOVO
}

export function PatientReceiptsTab({ patientId, patientName, isPatientActive }: Props) {
  const { receipts, loading } = useReceipts({ patientId });
  const { settings } = useClinicSettings();

  const handleDownload = async (r: ReceiptWithRelations) => {
    try {
      let signature = null as Awaited<ReturnType<typeof documentSignatureService.getSignatureByDocument>> | null;
      try {
        signature = await documentSignatureService.getSignatureByDocument("receipt", r.id);
      } catch { signature = null; }
      const doc = await generateReceiptPdf({
        number: r.receipt_number,
        amount: Number(r.amount),
        paymentMethod: r.payment_method ? (PAYMENT_LABELS[r.payment_method] ?? r.payment_method) : null,
        paymentDate: r.payment_date,
        description: r.description,
        notes: r.notes,
        patient: { name: r.patients?.name ?? patientName, cpf: r.patients?.cpf },
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

  if (loading) return <p className="text-sm text-muted-foreground">Carregando recibos...</p>;
  if (receipts.length === 0) {
    return <EmptyState icon={ReceiptIcon} title="Nenhum recibo" description="Este paciente ainda não tem recibos emitidos." />;
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Data pagamento</TableHead>
            <TableHead>Forma</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Assinatura</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receipts.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.receipt_number ?? "—"}</TableCell>
              <TableCell>{formatBR(r.payment_date)}</TableCell>
              <TableCell>{r.payment_method ? (PAYMENT_LABELS[r.payment_method] ?? r.payment_method) : "—"}</TableCell>
              <TableCell className="max-w-[260px] truncate">{r.description ?? "—"}</TableCell>
              <TableCell className="text-right font-medium">{fmt(Number(r.amount))}</TableCell>
              <TableCell>
                <DocumentSignatureSection
                  documentType="receipt"
                  documentId={r.id}
                  documentTitle={`Recibo ${r.receipt_number ?? ""}`.trim()}
                  patientId={r.patient_id}
                  defaultSignerName={r.patients?.name ?? patientName}
                  defaultSignerDocument={r.patients?.cpf ?? undefined}
                  canCollect={isPatientActive} // ATUALIZADO: Bloqueia nova coleta se inativo
                  compact
                />
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" onClick={() => handleDownload(r)} title="Baixar PDF">
                  <Download className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

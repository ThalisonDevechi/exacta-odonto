import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSignature } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { canCollectSignature, canViewSignatures } from "@/lib/permissions";
import { useDocumentSignature } from "@/hooks/useDocumentSignatures";
import { DocumentSignatureBadge } from "@/components/DocumentSignatureBadge";
import { SignaturePreview } from "@/components/SignaturePreview";
import { SignaturePadModal } from "@/components/SignaturePadModal";
import type { DocumentSignatureType } from "@/services/documentSignatureService";

interface DocumentSignatureSectionProps {
  documentType: DocumentSignatureType;
  documentId: string;
  documentTitle: string;
  patientId: string;
  /** When false, the "Coletar assinatura" button is hidden (e.g. cancelled/draft documents). */
  canCollect?: boolean;
  defaultSignerName?: string;
  defaultSignerDocument?: string;
  /** Compact mode: show only badge + small button (used inline in tables). */
  compact?: boolean;
  onSigned?: () => void;
}

export function DocumentSignatureSection({
  documentType,
  documentId,
  documentTitle,
  patientId,
  canCollect = true,
  defaultSignerName,
  defaultSignerDocument,
  compact = false,
  onSigned,
}: DocumentSignatureSectionProps) {
  const { user } = useAuth();
  const userRole = user?.role;
  const { signature, createSignature, loading } = useDocumentSignature(documentType, documentId);
  const [open, setOpen] = useState(false);

  if (!userRole || !canViewSignatures(userRole)) return null;

  const allowedToCollect =
    canCollect && !signature && canCollectSignature(userRole, documentType);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <DocumentSignatureBadge signed={!!signature} />
        {allowedToCollect && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={loading}>
            <FileSignature className="mr-1 h-3 w-3" />
            Coletar
          </Button>
        )}
        <SignaturePadModal
          open={open}
          onOpenChange={setOpen}
          documentType={documentType}
          documentTitle={documentTitle}
          defaultSignerName={defaultSignerName}
          defaultSignerDocument={defaultSignerDocument}
          onSubmit={async (input) => {
            await createSignature({ patientId, ...input });
            onSigned?.();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <DocumentSignatureBadge signed={!!signature} />
        {allowedToCollect && (
          <Button size="sm" onClick={() => setOpen(true)} disabled={loading}>
            <FileSignature className="mr-1 h-4 w-4" />
            Coletar assinatura
          </Button>
        )}
      </div>
      {signature && <SignaturePreview signature={signature} />}
      <SignaturePadModal
        open={open}
        onOpenChange={setOpen}
        documentType={documentType}
        documentTitle={documentTitle}
        defaultSignerName={defaultSignerName}
        defaultSignerDocument={defaultSignerDocument}
        onSubmit={async (input) => {
          await createSignature({ patientId, ...input });
          onSigned?.();
        }}
      />
    </div>
  );
}

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eraser } from "lucide-react";
import type { DocumentSignatureType } from "@/services/documentSignatureService";

interface SignaturePadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentSignatureType;
  documentTitle: string;
  defaultSignerName?: string;
  defaultSignerDocument?: string;
  onSubmit: (input: {
    signerName: string;
    signerDocument: string;
    acceptedTerms: boolean;
    signatureDataUrl: string;
  }) => Promise<void>;
}

const TYPE_LABEL: Record<DocumentSignatureType, string> = {
  budget: "Orçamento",
  receipt: "Recibo",
  treatment_plan: "Plano de Tratamento",
  consent: "Termo de Consentimento",
};

export function SignaturePadModal({
  open,
  onOpenChange,
  documentType,
  documentTitle,
  defaultSignerName = "",
  defaultSignerDocument = "",
  onSubmit,
}: SignaturePadModalProps) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signerDocument, setSignerDocument] = useState(defaultSignerDocument);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleClear = () => {
    sigRef.current?.clear();
  };

  const reset = () => {
    sigRef.current?.clear();
    setSignerName(defaultSignerName);
    setSignerDocument(defaultSignerDocument);
    setAcceptedTerms(false);
  };

  const handleClose = (next: boolean) => {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!signerName.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe o nome do assinante.", variant: "destructive" });
      return;
    }
    if (!signerDocument.trim()) {
      toast({ title: "Documento obrigatório", description: "Informe o CPF/documento do assinante.", variant: "destructive" });
      return;
    }
    if (!acceptedTerms) {
      toast({ title: "Aceite obrigatório", description: "Você precisa aceitar os termos.", variant: "destructive" });
      return;
    }
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast({ title: "Assinatura vazia", description: "Desenhe a assinatura antes de salvar.", variant: "destructive" });
      return;
    }
    const dataUrl = sigRef.current.getCanvas().toDataURL("image/png");
    setSubmitting(true);
    try {
      await onSubmit({
        signerName: signerName.trim(),
        signerDocument: signerDocument.trim(),
        acceptedTerms,
        signatureDataUrl: dataUrl,
      });
      reset();
      onOpenChange(false);
    } catch {
      // toast already shown by hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Coletar assinatura — {TYPE_LABEL[documentType]}</DialogTitle>
          <DialogDescription>{documentTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="signer-name">Nome do assinante *</Label>
              <Input
                id="signer-name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                maxLength={120}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signer-doc">CPF/Documento *</Label>
              <Input
                id="signer-doc"
                value={signerDocument}
                onChange={(e) => setSignerDocument(e.target.value)}
                maxLength={32}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Assinatura *</Label>
            <div className="rounded-md border bg-muted/20">
              <SignatureCanvas
                ref={sigRef}
                penColor="hsl(var(--foreground))"
                canvasProps={{
                  className: "w-full h-40 rounded-md touch-none",
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Use o mouse, dedo ou caneta para assinar.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={submitting}
              >
                <Eraser className="mr-1 h-3 w-3" />
                Limpar
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="accept-terms"
              checked={acceptedTerms}
              onCheckedChange={(v) => setAcceptedTerms(v === true)}
              disabled={submitting}
            />
            <Label htmlFor="accept-terms" className="cursor-pointer text-sm font-normal leading-snug">
              Declaro que li e estou de acordo com o conteúdo deste documento e autorizo seu
              registro e arquivamento no sistema.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useCallback, useEffect, useState } from "react";
import {
  documentSignatureService,
  type DocumentSignature,
  type DocumentSignatureType,
} from "@/services/documentSignatureService";
import { logAudit } from "@/lib/audit";
import { toast } from "@/hooks/use-toast";

export function useDocumentSignature(
  documentType: DocumentSignatureType,
  documentId: string | null,
) {
  const [signature, setSignature] = useState<DocumentSignature | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!documentId) {
      setSignature(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const sig = await documentSignatureService.getSignatureByDocument(documentType, documentId);
      setSignature(sig);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar assinatura";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [documentType, documentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createSignature = useCallback(
    async (input: {
      patientId: string;
      signerName: string;
      signerDocument: string;
      acceptedTerms: boolean;
      signatureDataUrl: string;
    }) => {
      if (!documentId) throw new Error("Documento inválido.");
      try {
        const created = await documentSignatureService.createSignature({
          documentType,
          documentId,
          ...input,
        });
        setSignature(created);
        await logAudit("signature.create", documentType, documentId, {
          signature_id: created.id,
          signer_name: created.signer_name,
        });
        await logAudit("signature.attach_to_document", documentType, documentId, {
          signature_id: created.id,
        });
        toast({ title: "Assinatura registrada", description: "Documento assinado com sucesso." });
        return created;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao registrar assinatura";
        await logAudit("signature.failed", documentType, documentId, { reason: msg });
        toast({ title: "Erro", description: msg, variant: "destructive" });
        throw err;
      }
    },
    [documentType, documentId],
  );

  return { signature, loading, error, refresh, createSignature };
}

export function usePatientSignatures(patientId: string | null) {
  const [signatures, setSignatures] = useState<DocumentSignature[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!patientId) {
      setSignatures([]);
      return;
    }
    setLoading(true);
    try {
      const list = await documentSignatureService.listSignaturesByPatient(patientId);
      setSignatures(list);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { signatures, loading, refresh };
}

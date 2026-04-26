import { useEffect, useState } from "react";
import {
  documentSignatureService,
  type DocumentSignature,
} from "@/services/documentSignatureService";

interface SignaturePreviewProps {
  signature: DocumentSignature;
  className?: string;
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function SignaturePreview({ signature, className }: SignaturePreviewProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(signature.signature_image_url ?? null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Always refresh the signed URL — the stored URL may have expired.
    void documentSignatureService.refreshSignedUrl(signature).then((url) => {
      if (!cancelled) setImgUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [signature]);

  return (
    <div className={`rounded-md border bg-muted/30 p-4 ${className ?? ""}`}>
      <div className="mb-3 flex h-24 items-center justify-center rounded border bg-background">
        {imgUrl && !imgFailed ? (
          <img
            src={imgUrl}
            alt={`Assinatura de ${signature.signer_name}`}
            className="max-h-full max-w-full object-contain"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="text-xs text-muted-foreground">Assinatura registrada no sistema.</span>
        )}
      </div>
      <div className="space-y-1 text-sm">
        <div>
          <span className="font-medium">Assinante:</span> {signature.signer_name}
        </div>
        <div>
          <span className="font-medium">Documento:</span> {signature.signer_document}
        </div>
        <div className="text-muted-foreground">
          Assinado em {fmtDateTime(signature.signed_at)}
        </div>
      </div>
    </div>
  );
}

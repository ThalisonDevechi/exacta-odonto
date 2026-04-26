import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DocumentSignatureType = Database["public"]["Enums"]["document_signature_type"];
export type DocumentSignature = Database["public"]["Tables"]["document_signatures"]["Row"];

const BUCKET = "document-signatures";

interface CreateSignatureInput {
  documentType: DocumentSignatureType;
  documentId: string;
  patientId: string;
  signerName: string;
  signerDocument: string;
  acceptedTerms: boolean;
  signatureDataUrl: string; // base64 PNG ("data:image/png;base64,...")
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export const documentSignatureService = {
  async uploadSignatureImage(
    documentType: DocumentSignatureType,
    documentId: string,
    dataUrl: string,
  ): Promise<{ path: string; url: string | null }> {
    const blob = dataUrlToBlob(dataUrl);
    const path = `${documentType}/${documentId}/${Date.now()}.png`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: "image/png",
      upsert: false,
    });
    if (error) throw error;
    const url = await this.getSignatureImageUrl(path);
    return { path, url };
  },

  async getSignatureImageUrl(path: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 dias
    if (error) return null;
    return data?.signedUrl ?? null;
  },

  async createSignature(input: CreateSignatureInput): Promise<DocumentSignature> {
    if (!input.signerName.trim()) throw new Error("Nome do assinante é obrigatório.");
    if (!input.signerDocument.trim()) throw new Error("Documento do assinante é obrigatório.");
    if (!input.acceptedTerms) throw new Error("Aceite dos termos é obrigatório.");
    if (!input.signatureDataUrl) throw new Error("Assinatura não pode estar vazia.");

    const { path, url } = await this.uploadSignatureImage(
      input.documentType,
      input.documentId,
      input.signatureDataUrl,
    );

    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("document_signatures")
      .insert({
        document_type: input.documentType,
        document_id: input.documentId,
        patient_id: input.patientId,
        signer_name: input.signerName.trim(),
        signer_document: input.signerDocument.trim(),
        signature_image_path: path,
        signature_image_url: url,
        accepted_terms: input.acceptedTerms,
        created_by: auth?.user?.id ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSignatureByDocument(
    documentType: DocumentSignatureType,
    documentId: string,
  ): Promise<DocumentSignature | null> {
    const { data, error } = await supabase
      .from("document_signatures")
      .select("*")
      .eq("document_type", documentType)
      .eq("document_id", documentId)
      .order("signed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  async listSignaturesByPatient(patientId: string): Promise<DocumentSignature[]> {
    const { data, error } = await supabase
      .from("document_signatures")
      .select("*")
      .eq("patient_id", patientId)
      .order("signed_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async hasSignature(
    documentType: DocumentSignatureType,
    documentId: string,
  ): Promise<boolean> {
    const sig = await this.getSignatureByDocument(documentType, documentId);
    return !!sig;
  },

  /**
   * Refresh the signed URL (signed URLs expire). Useful before rendering on PDF.
   */
  async refreshSignedUrl(signature: DocumentSignature): Promise<string | null> {
    return this.getSignatureImageUrl(signature.signature_image_path);
  },
};

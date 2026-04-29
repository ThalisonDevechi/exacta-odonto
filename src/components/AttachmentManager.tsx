import { useRef, useState } from "react";
import { useAttachments, ATTACHMENT_CATEGORY_LABELS, type AttachmentCategory } from "@/hooks/useAttachments";
import { useAuth } from "@/lib/auth-context";
import { canUploadAttachment, canManageAttachment } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileText, Image as ImageIcon, Download, Eye, Trash2, Loader2, Paperclip } from "lucide-react";

interface Props {
  patientId: string;
  medicalRecordId?: string | null;
  isPatientActive: boolean; // NOVO
}

export function AttachmentManager({ patientId, medicalRecordId, isPatientActive }: Props) {
  const { user } = useAuth();
  
  // ATUALIZADO: O paciente deve estar ativo
  const canUpload = user ? (canUploadAttachment(user.role) && isPatientActive) : false;
  const canManage = user ? (canManageAttachment(user.role) && isPatientActive) : false;
  
  const { attachments, loading, upload, getSignedUrl, setReleased, deactivate } = useAttachments(patientId);

  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<AttachmentCategory>("documento");
  const [release, setRelease] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      await upload(file, category, { medicalRecordId, releasedToPatient: release, uploadedBy: user?.id });
      toast.success("Anexo enviado!");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erro no upload."); }
    finally { setUploading(false); }
  };

  const openFile = async (path: string) => {
    try { const url = await getSignedUrl(path, 120); window.open(url, "_blank", "noopener"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao abrir."); }
  };

  const downloadFile = async (path: string, name: string) => {
    try {
      const url = await getSignedUrl(path, 120);
      const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Paperclip className="h-4 w-4 text-primary" />Anexos do paciente</h3>
        <span className="text-xs text-muted-foreground">{attachments.length} arquivo(s)</span>
      </div>

      {canUpload && (
        <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <Select value={category} onValueChange={v => setCategory(v as AttachmentCategory)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ATTACHMENT_CATEGORY_LABELS).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Liberar p/ paciente</Label>
              <div className="flex items-center h-9"><Switch checked={release} onCheckedChange={setRelease} /></div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Arquivo (PDF, JPG, PNG · até 15MB)</Label>
              <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" onChange={handleSelect} className="text-xs" disabled={uploading} />
            </div>
          </div>
          {uploading && <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Enviando...</p>}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nenhum anexo enviado.</p>
      ) : (
        <div className="space-y-1.5">
          {attachments.map(a => {
            const isImage = a.file_type.startsWith("image/");
            return (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                {isImage ? <ImageIcon className="h-4 w-4 text-primary shrink-0" /> : <FileText className="h-4 w-4 text-primary shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ATTACHMENT_CATEGORY_LABELS[a.category]} · {a.file_size ? `${Math.round(a.file_size/1024)} KB` : ""} · {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {a.released_to_patient && <Badge className="bg-success/10 text-success">Liberado</Badge>}
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Visualizar" onClick={() => openFile(a.file_path)}><Eye className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Baixar" onClick={() => downloadFile(a.file_path, a.file_name)}><Download className="h-3.5 w-3.5" /></Button>
                {canManage && (
                  <>
                    <div className="flex items-center gap-1 px-1">
                      <Switch checked={a.released_to_patient} onCheckedChange={v => setReleased(a.id, v).then(() => toast.success(v ? "Liberado." : "Bloqueado.")).catch(e => toast.error(e.message))} />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Remover (lógico)" onClick={() => deactivate(a.id).then(() => toast.success("Anexo removido.")).catch(e => toast.error(e.message))}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

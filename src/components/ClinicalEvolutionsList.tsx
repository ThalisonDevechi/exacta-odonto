import { useState } from "react";
import { useClinicalEvolutions } from "@/hooks/useClinicalEvolutions";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Plus, FileEdit, XCircle, Eye, EyeOff, Stethoscope } from "lucide-react";
import { toast } from "sonner";

interface Props {
  patientId: string;
  medicalRecordId: string | null;
  isPatientActive: boolean; // NOVO
}

const STATUS_LABELS = { active: "Ativa", rectified: "Retificada", cancelled: "Cancelada" } as const;

export function ClinicalEvolutionsList({ patientId, medicalRecordId, isPatientActive }: Props) {
  const { user } = useAuth();
  const { evolutions, loading, addEvolution, rectifyEvolution, cancelEvolution, toggleRelease } = useClinicalEvolutions(patientId);

  const [creating, setCreating] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newReleased, setNewReleased] = useState(false);
  const [saving, setSaving] = useState(false);

  const [rectifying, setRectifying] = useState<string | null>(null);
  const [rectifyText, setRectifyText] = useState("");
  const [rectifyReason, setRectifyReason] = useState("");

  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // ATUALIZADO: O paciente deve estar ativo para criar/retificar evoluções
  const isClinical = user && (user.role === "admin" || user.role === "dentist" || user.role === "assistant") && isPatientActive;
  const canRectify = user && (user.role === "admin" || user.role === "dentist") && isPatientActive;

  const handleCreate = async () => {
    if (!newDescription.trim()) { toast.error("Descreva a evolução clínica."); return; }
    if (!medicalRecordId) { toast.error("Prontuário não localizado."); return; }
    if (!user) return;
    setSaving(true);
    try {
      await addEvolution({
        medical_record_id: medicalRecordId,
        professional_id: user.id,
        professional_name: user.name,
        description: newDescription.trim(),
        released_to_patient: newReleased,
      });
      toast.success("Evolução registrada.");
      setCreating(false); setNewDescription(""); setNewReleased(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar evolução.");
    } finally { setSaving(false); }
  };

  const handleRectify = async () => {
    if (!rectifying) return;
    if (!rectifyText.trim() || !rectifyReason.trim()) {
      toast.error("Informe novo texto e motivo da retificação.");
      return;
    }
    try {
      await rectifyEvolution(rectifying, rectifyText.trim(), rectifyReason.trim());
      toast.success("Evolução retificada.");
      setRectifying(null); setRectifyText(""); setRectifyReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao retificar.");
    }
  };

  const handleCancel = async () => {
    if (!cancelling) return;
    if (!cancelReason.trim()) { toast.error("Informe o motivo do cancelamento."); return; }
    try {
      await cancelEvolution(cancelling, cancelReason.trim());
      toast.success("Evolução cancelada.");
      setCancelling(null); setCancelReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao cancelar.");
    }
  };

  if (loading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-primary" /> Evoluções Clínicas
        </h3>
        {isClinical && (
          <Button size="sm" onClick={() => setCreating(true)} disabled={!medicalRecordId}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Nova evolução
          </Button>
        )}
      </div>

      {evolutions.length === 0 ? (
        <EmptyState
          title="Nenhuma evolução registrada"
          description={isClinical ? "Adicione a primeira anotação clínica." : "Ainda não há registros."}
          icon={Stethoscope}
        />
      ) : (
        <div className="space-y-3">
          {evolutions.map(ev => (
            <div key={ev.id} className="rounded-lg border border-border bg-surface p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {new Date(ev.created_at).toLocaleString("pt-BR")} · {ev.professional_name ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ev.status === "active" ? "default" : ev.status === "rectified" ? "secondary" : "destructive"}>
                    {STATUS_LABELS[ev.status]}
                  </Badge>
                  {ev.released_to_patient ? (
                    <Badge variant="outline" className="gap-1"><Eye className="h-3 w-3" /> Liberada</Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-muted-foreground"><EyeOff className="h-3 w-3" /> Restrita</Badge>
                  )}
                </div>
              </div>

              <p className="text-sm whitespace-pre-wrap">{ev.description}</p>

              {ev.status === "rectified" && ev.original_text && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">Ver texto original</summary>
                  <p className="pt-2 italic whitespace-pre-wrap">"{ev.original_text}"</p>
                  {ev.rectification_reason && <p className="pt-1">Motivo: {ev.rectification_reason}</p>}
                </details>
              )}
              {ev.status === "cancelled" && ev.rectification_reason && (
                <p className="text-xs text-muted-foreground italic">Motivo do cancelamento: {ev.rectification_reason}</p>
              )}

              {canRectify && ev.status === "active" && (
                <div className="flex items-center gap-2 pt-2">
                  <Button size="sm" variant="ghost" onClick={() => { setRectifying(ev.id); setRectifyText(ev.description); }}>
                    <FileEdit className="h-3.5 w-3.5 mr-1" /> Retificar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setCancelling(ev.id)}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar
                  </Button>
                  <div className="ml-auto flex items-center gap-2 text-xs">
                    <Switch checked={ev.released_to_patient} onCheckedChange={v => toggleRelease(ev.id, v)} />
                    <span>Liberar p/ paciente</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova evolução clínica</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Descrição clínica</Label>
              <Textarea rows={6} value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Descreva o atendimento, achados, conduta..." />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={newReleased} onCheckedChange={setNewReleased} />
              Liberar visualização para o paciente
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rectify dialog */}
      <Dialog open={!!rectifying} onOpenChange={() => setRectifying(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Retificar evolução</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Novo texto</Label>
              <Textarea rows={5} value={rectifyText} onChange={e => setRectifyText(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo da retificação <span className="text-destructive">*</span></Label>
              <Textarea rows={2} value={rectifyReason} onChange={e => setRectifyReason(e.target.value)} placeholder="Ex: Correção de informação clínica" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRectifying(null)}>Cancelar</Button>
              <Button onClick={handleRectify}>Confirmar retificação</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={!!cancelling} onOpenChange={() => setCancelling(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancelar evolução</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Motivo do cancelamento <span className="text-destructive">*</span></Label>
              <Textarea rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelling(null)}>Voltar</Button>
              <Button variant="destructive" onClick={handleCancel}>Cancelar evolução</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

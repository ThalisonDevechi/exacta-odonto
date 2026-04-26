import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppointmentConfirmation } from "@/hooks/useAppointmentConfirmation";
import {
  CONFIRMATION_STATUS_LABELS, COMMUNICATION_CHANNEL_LABELS,
  type ConfirmationStatus, type CommunicationChannel,
} from "@/services/appointmentConfirmationService";
import { useAuth } from "@/lib/auth-context";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  patientName?: string;
  /** Status the action defaults to. */
  initialStatus?: ConfirmationStatus;
  /** Existing appointment status — used to block invalid transitions. */
  appointmentStatus?: string;
  onSaved?: () => void;
}

export function AppointmentConfirmationModal({
  open, onClose, appointmentId, patientName,
  initialStatus = "confirmada", appointmentStatus, onSaved,
}: Props) {
  const { user } = useAuth();
  const { setStatus } = useAppointmentConfirmation();
  const [status, setStatusValue] = useState<ConfirmationStatus>(initialStatus);
  const [channel, setChannel] = useState<CommunicationChannel>("whatsapp");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStatusValue(initialStatus);
      setChannel("whatsapp");
      setNotes("");
    }
  }, [open, initialStatus]);

  const blocked = appointmentStatus === "cancelled" || appointmentStatus === "completed";

  const handleSave = async () => {
    if (blocked) {
      toast.error("Consulta cancelada/concluída não pode ter confirmação alterada.");
      return;
    }
    setSaving(true);
    try {
      await setStatus({
        appointmentId,
        status,
        channel,
        notes,
        userId: user?.id ?? null,
      });
      toast.success("Status de confirmação atualizado.");
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Confirmação de consulta
          </DialogTitle>
          {patientName && (
            <p className="text-sm text-muted-foreground">Paciente: {patientName}</p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatusValue(v as ConfirmationStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CONFIRMATION_STATUS_LABELS) as ConfirmationStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{CONFIRMATION_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Canal</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as CommunicationChannel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(COMMUNICATION_CHANNEL_LABELS) as CommunicationChannel[]).map((c) => (
                  <SelectItem key={c} value={c}>{COMMUNICATION_CHANNEL_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Observação</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Opcional" />
          </div>

          {blocked && (
            <p className="text-xs text-destructive">
              Esta consulta está {appointmentStatus === "cancelled" ? "cancelada" : "concluída"} e não pode ter confirmação alterada.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || blocked}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

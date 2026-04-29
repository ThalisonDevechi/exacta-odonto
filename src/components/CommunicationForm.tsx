import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCommunicationLogs } from "@/hooks/useCommunicationLogs";
import {
  COMMUNICATION_CHANNEL_LABELS,
  COMMUNICATION_DIRECTION_LABELS,
  COMMUNICATION_STATUS_LABELS,
  COMMUNICATION_TYPE_LABELS,
  type CommunicationChannel,
  type CommunicationDirection,
  type CommunicationStatus,
  type CommunicationType,
} from "@/services/communicationLogService";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  patientId: string;
  appointmentId?: string | null;
  onSaved?: () => void;
}

export function CommunicationForm({ open, onClose, patientId, appointmentId, onSaved }: Props) {
  const { create } = useCommunicationLogs({ patientId });
  const [channel, setChannel] = useState<CommunicationChannel>("whatsapp");
  const [type, setType] = useState<CommunicationType>("atendimento_manual");
  const [direction, setDirection] = useState<CommunicationDirection>("enviada");
  const [status, setStatus] = useState<CommunicationStatus>("registrada");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setChannel("whatsapp");
      setType("atendimento_manual");
      setDirection("enviada");
      setStatus("registrada");
      setMessage("");
    }
  }, [open]);

  const handleSave = async () => {
    if (!message.trim()) {
      toast.error("Mensagem/observação é obrigatória.");
      return;
    }

    setSaving(true);
    try {
      await create({
        patient_id: patientId,
        appointment_id: appointmentId ?? null,
        channel,
        type,
        direction,
        status,
        message: message.trim() || null,
      });
      toast.success("Comunicação registrada.");
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar comunicação.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Registrar comunicação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as CommunicationType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(COMMUNICATION_TYPE_LABELS) as CommunicationType[]).map((t) => (
                    <SelectItem key={t} value={t}>{COMMUNICATION_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Direção</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as CommunicationDirection)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(COMMUNICATION_DIRECTION_LABELS) as CommunicationDirection[]).map((d) => (
                    <SelectItem key={d} value={d}>{COMMUNICATION_DIRECTION_LABELS[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CommunicationStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(COMMUNICATION_STATUS_LABELS) as CommunicationStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{COMMUNICATION_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comm-msg">Mensagem / observação</Label>
            <Textarea
              id="comm-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Resumo do contato..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

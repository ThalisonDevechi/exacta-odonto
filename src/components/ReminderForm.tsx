import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppointmentReminders } from "@/hooks/useAppointmentReminders";
import { useMessageTemplates } from "@/hooks/useMessageTemplates";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import { useAuth } from "@/lib/auth-context";
import {
  REMINDER_TYPE_LABELS,
  type ReminderType,
} from "@/services/appointmentReminderService";
import {
  COMMUNICATION_CHANNEL_LABELS,
  type CommunicationChannel,
} from "@/services/communicationLogService";
import { renderTemplate } from "@/services/messageTemplateService";
import { Bell } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  patientId: string;
  patientName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  dentistName?: string;
  onSaved?: () => void;
}

export function ReminderForm({
  open, onClose, appointmentId, patientId,
  patientName, appointmentDate, appointmentTime, dentistName, onSaved,
}: Props) {
  const { create } = useAppointmentReminders({ kind: "appointment", appointmentId });
  const { templates } = useMessageTemplates(false);
  const { settings } = useClinicSettings();
  const { user } = useAuth();

  const [reminderType, setReminderType] = useState<ReminderType>("vinte_quatro_horas_antes");
  const [channel, setChannel] = useState<CommunicationChannel>("whatsapp");
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const reminderTemplates = useMemo(
    () => templates.filter((t) => t.active && t.type === "lembrete_consulta"),
    [templates],
  );

  const computeDefaultSchedule = (type: ReminderType): string => {
    if (!appointmentDate) return new Date().toISOString().slice(0, 16);
    const base = new Date(`${appointmentDate}T${appointmentTime ?? "09:00"}`);
    if (Number.isNaN(base.getTime())) return new Date().toISOString().slice(0, 16);
    if (type === "vinte_quatro_horas_antes") {
      base.setDate(base.getDate() - 1);
    } else if (type === "no_dia") {
      base.setHours(8, 0, 0, 0);
    }
    return base.toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (open) {
      setReminderType("vinte_quatro_horas_antes");
      setChannel("whatsapp");
      setScheduledFor(computeDefaultSchedule("vinte_quatro_horas_antes"));
      setTemplateId("");
      setMessage("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointmentDate, appointmentTime]);

  const handleTypeChange = (value: ReminderType) => {
    setReminderType(value);
    setScheduledFor(computeDefaultSchedule(value));
  };

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const tpl = reminderTemplates.find((t) => t.id === id);
    if (tpl) {
      setMessage(
        renderTemplate(tpl.body, {
          nome_paciente: patientName,
          nome_clinica: settings?.clinic_name,
          data_consulta: appointmentDate,
          horario_consulta: appointmentTime,
          nome_dentista: dentistName,
          whatsapp_clinica: settings?.whatsapp ?? undefined,
        }),
      );
    }
  };

  const handleSave = async () => {
    if (!scheduledFor) {
      toast.error("Informe data/hora do lembrete.");
      return;
    }
    setSaving(true);
    try {
      await create({
        appointment_id: appointmentId,
        patient_id: patientId,
        reminder_type: reminderType,
        channel,
        scheduled_for: new Date(scheduledFor).toISOString(),
        message: message.trim() || null,
        created_by: user?.id ?? null,
      });
      toast.success("Lembrete criado.");
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar lembrete.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Novo lembrete
          </DialogTitle>
          {patientName && (
            <p className="text-sm text-muted-foreground">Paciente: {patientName}</p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={reminderType} onValueChange={(v) => handleTypeChange(v as ReminderType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(REMINDER_TYPE_LABELS) as ReminderType[]).map((t) => (
                  <SelectItem key={t} value={t}>{REMINDER_TYPE_LABELS[t]}</SelectItem>
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
            <Label htmlFor="scheduled-for">Agendado para</Label>
            <Input
              id="scheduled-for"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </div>

          {reminderTemplates.length > 0 && (
            <div className="space-y-1.5">
              <Label>Modelo (opcional)</Label>
              <Select value={templateId} onValueChange={handleTemplateChange}>
                <SelectTrigger><SelectValue placeholder="Selecionar modelo de lembrete" /></SelectTrigger>
                <SelectContent>
                  {reminderTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reminder-msg">Mensagem (opcional)</Label>
            <Textarea
              id="reminder-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Use o modelo ou escreva manualmente. Pode editar antes de enviar."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>Criar lembrete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMessageTemplates } from "@/hooks/useMessageTemplates";
import { useWhatsAppMessage } from "@/hooks/useWhatsAppMessage";
import { renderTemplate, type TemplateVars, type MessageTemplateType } from "@/services/messageTemplateService";
import { isValidWhatsAppPhone } from "@/services/whatsappService";
import type { CommunicationType } from "@/services/communicationLogService";
import { MessageCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Default phone (can be empty). User can edit before sending. */
  phone?: string | null;
  /** Initial message body (used if no template chosen). */
  defaultMessage?: string;
  /** Variables used to render the chosen template. */
  vars?: TemplateVars;
  /** Restrict template list to certain types. */
  templateTypes?: MessageTemplateType[];
  /** Audit context. */
  context?: string;
  entity?: string;
  entityId?: string | null;
  title?: string;
  /** Patient receiving the message — when provided a communication_log is created automatically. */
  patientId?: string | null;
  appointmentId?: string | null;
  financialRecordId?: string | null;
  budgetId?: string | null;
  receiptId?: string | null;
  communicationType?: CommunicationType;
}

export function WhatsAppMessageModal({
  open, onClose, phone, defaultMessage = "", vars = {},
  templateTypes, context, entity, entityId, title = "Enviar WhatsApp",
  patientId, appointmentId, financialRecordId, budgetId, receiptId, communicationType,
}: Props) {
  const { templates } = useMessageTemplates(false);
  const { send } = useWhatsAppMessage();
  const [phoneState, setPhoneState] = useState(phone ?? "");
  const [templateId, setTemplateId] = useState<string>("");
  const [message, setMessage] = useState(defaultMessage);

  useEffect(() => {
    if (open) {
      setPhoneState(phone ?? "");
      setMessage(defaultMessage);
      setTemplateId("");
    }
  }, [open, phone, defaultMessage]);

  const filteredTemplates = useMemo(() => {
    const whatsappOnly = templates.filter((t) => t.channel === "whatsapp" && t.active);
    if (!templateTypes?.length) return whatsappOnly;
    return whatsappOnly.filter((t) => templateTypes.includes(t.type));
  }, [templates, templateTypes]);

  const handleTemplate = (id: string) => {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) setMessage(renderTemplate(t.body, vars));
  };

  const phoneValid = isValidWhatsAppPhone(phoneState);
  const hasMessage = message.trim().length > 0;
  const canSend = phoneValid && hasMessage;

  const handleSend = async () => {
    if (!phoneValid) {
      toast.error("Informe um telefone válido antes de abrir o WhatsApp.");
      return;
    }
    if (!hasMessage) {
      toast.error("Mensagem não pode ficar vazia.");
      return;
    }
    try {
      await send({
        phone: phoneState,
        message,
        context,
        entity,
        entityId,
        patientId,
        appointmentId,
        financialRecordId,
        budgetId,
        receiptId,
        communicationType,
      });
      toast.success("WhatsApp aberto em nova aba.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao preparar WhatsApp.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-success" /> {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="wa-phone">Telefone</Label>
            <Input
              id="wa-phone"
              value={phoneState}
              onChange={(e) => setPhoneState(e.target.value)}
              placeholder="(11) 99999-9999"
            />
            {!phoneValid && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Telefone inválido para WhatsApp.
              </p>
            )}
          </div>

          {filteredTemplates.length > 0 && (
            <div className="space-y-1.5">
              <Label>Modelo de mensagem</Label>
              <Select value={templateId} onValueChange={handleTemplate}>
                <SelectTrigger><SelectValue placeholder="Selecionar modelo (opcional)" /></SelectTrigger>
                <SelectContent>
                  {filteredTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="wa-msg">Mensagem</Label>
            <Textarea
              id="wa-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="Escreva ou selecione um modelo..."
            />
            <p className="text-xs text-muted-foreground">
              A mensagem abrirá no WhatsApp Web/app para envio manual.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSend} disabled={!canSend} className="bg-success hover:bg-success/90 text-success-foreground">
            <MessageCircle className="h-4 w-4 mr-1.5" /> Abrir WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

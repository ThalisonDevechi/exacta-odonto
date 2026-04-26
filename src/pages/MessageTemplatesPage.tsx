import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/lib/auth-context";
import { useMessageTemplates } from "@/hooks/useMessageTemplates";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import {
  MESSAGE_TYPE_LABELS, MESSAGE_CHANNEL_LABELS,
  type MessageTemplateType, type MessageChannel, renderTemplate,
} from "@/services/messageTemplateService";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Copy, Eye, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const TYPES: MessageTemplateType[] = ["confirmacao_consulta","lembrete_consulta","cobranca","orcamento","recibo","retorno_pos_atendimento","aniversario","outro"];
const CHANNELS: MessageChannel[] = ["whatsapp","email","sms","outro"];
const VARS = [
  "nome_paciente","nome_clinica","data_consulta","horario_consulta",
  "nome_dentista","valor_pendente","link_orcamento","link_recibo","whatsapp_clinica",
];

export default function MessageTemplatesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canView = isAdmin || user?.role === "dentist" || user?.role === "receptionist" || user?.role === "assistant";
  const { templates, loading, create, update, remove } = useMessageTemplates(true);
  const { settings } = useClinicSettings();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", type: "outro" as MessageTemplateType, channel: "whatsapp" as MessageChannel,
    subject: "", body: "", active: true,
  });

  const filtered = useMemo(() => templates.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (channelFilter !== "all" && t.channel !== channelFilter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [templates, search, typeFilter, channelFilter]);

  if (!canView) return <Navigate to="/acesso-negado" replace />;

  const openNew = () => {
    setEditingId(null);
    setForm({ name: "", type: "outro", channel: "whatsapp", subject: "", body: "", active: true });
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setEditingId(id);
    setForm({ name: t.name, type: t.type, channel: t.channel, subject: t.subject ?? "", body: t.body, active: t.active });
    setFormOpen(true);
  };

  const duplicate = async (id: string) => {
    if (!isAdmin) return;
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    try {
      await create({ name: `${t.name} (cópia)`, type: t.type, channel: t.channel, subject: t.subject, body: t.body, active: false, created_by: user?.id ?? null });
      toast.success("Modelo duplicado.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao duplicar."); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    if (!isAdmin) return;
    try { await update(id, { active }); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  const save = async () => {
    if (!isAdmin) return;
    if (!form.name.trim() || !form.body.trim()) { toast.error("Nome e mensagem são obrigatórios."); return; }
    try {
      if (editingId) {
        await update(editingId, { name: form.name.trim(), type: form.type, channel: form.channel, subject: form.subject || null, body: form.body, active: form.active });
        toast.success("Modelo atualizado.");
      } else {
        await create({ name: form.name.trim(), type: form.type, channel: form.channel, subject: form.subject || null, body: form.body, active: form.active, created_by: user?.id ?? null });
        toast.success("Modelo criado.");
      }
      setFormOpen(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao salvar."); }
  };

  const handleRemove = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm("Excluir este modelo?")) return;
    try { await remove(id); toast.success("Modelo removido."); } catch (e) { toast.error(e instanceof Error ? e.message : "Erro."); }
  };

  const previewTemplate = templates.find((t) => t.id === previewId);
  const sampleVars = {
    nome_paciente: "João Silva",
    nome_clinica: settings?.clinic_name ?? "Clínica Exacta",
    data_consulta: "15/05/2026",
    horario_consulta: "14:30",
    nome_dentista: "Dra. Maria Santos",
    valor_pendente: "R$ 350,00",
    link_orcamento: "https://exemplo.com/orcamento",
    link_recibo: "https://exemplo.com/recibo",
    whatsapp_clinica: settings?.whatsapp ?? "(11) 99999-9999",
  };

  return (
    <AppLayout>
      <PageHeader title="Modelos de Mensagem" description="Mensagens pré-definidas para WhatsApp, e-mail e SMS">
        {isAdmin && (
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1.5" /> Novo modelo</Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 mb-4">
        <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {TYPES.map((t) => <SelectItem key={t} value={t}>{MESSAGE_TYPE_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger><SelectValue placeholder="Canal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            {CHANNELS.map((c) => <SelectItem key={c} value={c}>{MESSAGE_CHANNEL_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Nenhum modelo" description="Crie modelos para enviar mensagens mais rápido." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((t) => (
            <Card key={t.id} className={!t.active ? "opacity-60" : ""}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{t.name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Badge variant="secondary">{MESSAGE_TYPE_LABELS[t.type]}</Badge>
                      <Badge variant="outline">{MESSAGE_CHANNEL_LABELS[t.channel]}</Badge>
                      {!t.active && <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>}
                    </div>
                  </div>
                  {isAdmin && (
                    <Switch checked={t.active} onCheckedChange={(v) => toggleActive(t.id, v)} />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{t.body}</p>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <Button size="sm" variant="ghost" onClick={() => setPreviewId(t.id)}><Eye className="h-3.5 w-3.5 mr-1" />Pré-visualizar</Button>
                  {isAdmin && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(t.id)}><Edit className="h-3.5 w-3.5 mr-1" />Editar</Button>
                      <Button size="sm" variant="ghost" onClick={() => duplicate(t.id)}><Copy className="h-3.5 w-3.5 mr-1" />Duplicar</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemove(t.id)}>Excluir</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Editar modelo" : "Novo modelo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5 md:col-span-1">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as MessageTemplateType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{MESSAGE_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as MessageChannel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANNELS.map((c) => <SelectItem key={c} value={c}>{MESSAGE_CHANNEL_LABELS[c]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {form.channel === "email" && (
              <div className="space-y-1.5">
                <Label>Assunto</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Mensagem *</Label>
              <Textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              <div className="text-xs text-muted-foreground">
                Variáveis: {VARS.map((v) => <code key={v} className="mx-0.5 px-1 py-0.5 bg-muted rounded">{`{{${v}}}`}</code>)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewId} onOpenChange={(v) => !v && setPreviewId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Pré-visualização</DialogTitle></DialogHeader>
          {previewTemplate && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">{MESSAGE_TYPE_LABELS[previewTemplate.type]} · {MESSAGE_CHANNEL_LABELS[previewTemplate.channel]}</div>
              {previewTemplate.subject && <p className="font-medium text-sm">Assunto: {previewTemplate.subject}</p>}
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
                {renderTemplate(previewTemplate.body, sampleVars)}
              </div>
              <p className="text-xs text-muted-foreground">Pré-visualização com dados de exemplo.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

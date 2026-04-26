import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAppointments, AppointmentInsert } from "@/hooks/useAppointments";
import { usePatients } from "@/hooks/usePatients";
import { useDentists } from "@/hooks/useDentists";
import { useAuth } from "@/lib/auth-context";
import { logAudit } from "@/lib/audit";
import { Database } from "@/integrations/supabase/types";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Bell, Calendar, ChevronLeft, ChevronRight, Edit, Trash2, Search, Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { AppointmentConfirmationModal } from "@/components/AppointmentConfirmationModal";
import { WhatsAppMessageModal } from "@/components/WhatsAppMessageModal";
import { ReminderForm } from "@/components/ReminderForm";
import { ReminderList } from "@/components/ReminderList";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import { CONFIRMATION_STATUS_LABELS, type ConfirmationStatus } from "@/services/appointmentConfirmationService";
import { canManageReminders, canViewReminders } from "@/lib/permissions";
import { Badge } from "@/components/ui/badge";

type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

const todayISO = () => new Date().toISOString().split("T")[0];

export default function AgendaPage() {
  const { user } = useAuth();
  const { appointments, loading, addAppointment, updateAppointment, deleteAppointment, checkConflict } = useAppointments();
  const { patients } = usePatients();
  const { dentists } = useDentists();
  const { settings } = useClinicSettings();

  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [statusFilter, setStatusFilter] = useState("all");
  const [dentistFilter, setDentistFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmationTarget, setConfirmationTarget] = useState<{ id: string; patientName: string; status: string; initial: ConfirmationStatus } | null>(null);
  const [whatsappTarget, setWhatsappTarget] = useState<{ phone: string | null; patientName: string; date: string; time: string; dentist: string; appointmentId: string; patientId: string } | null>(null);
  const [reminderTarget, setReminderTarget] = useState<{ id: string; patientId: string; patientName: string; phone: string | null; date: string; time: string; dentist: string } | null>(null);
  const [reminderFormOpen, setReminderFormOpen] = useState(false);
  const [form, setForm] = useState({
    patient_id: "", dentist_id: "", date: selectedDate,
    start_time: "08:00", end_time: "08:30",
    appointment_type: "", notes: "",
    status: "scheduled" as AppointmentStatus,
  });

  const canManage = user && (user.role === "admin" || user.role === "receptionist" || user.role === "dentist");
  const canDelete = user?.role === "admin";
  const canManageRem = user ? canManageReminders(user.role) : false;
  const canViewRem = user ? canViewReminders(user.role) : false;

  const filtered = useMemo(() => appointments
    .filter(a => a.date === selectedDate)
    .filter(a => statusFilter === "all" || a.status === statusFilter)
    .filter(a => dentistFilter === "all" || a.dentist_id === dentistFilter)
    .filter(a => !search || (a.patients?.name ?? "").toLowerCase().includes(search.toLowerCase())),
    [appointments, selectedDate, statusFilter, dentistFilter, search]);

  const changeDay = (d: number) => {
    const dt = new Date(selectedDate + "T00:00:00");
    dt.setDate(dt.getDate() + d);
    setSelectedDate(dt.toISOString().split("T")[0]);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ patient_id: "", dentist_id: "", date: selectedDate, start_time: "08:00", end_time: "08:30", appointment_type: "", notes: "", status: "scheduled" });
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    const a = appointments.find(x => x.id === id);
    if (!a) return;
    setEditingId(id);
    setForm({
      patient_id: a.patient_id, dentist_id: a.dentist_id, date: a.date,
      start_time: a.start_time.slice(0, 5), end_time: a.end_time.slice(0, 5),
      appointment_type: a.appointment_type ?? "", notes: a.notes ?? "",
      status: a.status,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.patient_id || !form.dentist_id) { toast.error("Paciente e dentista são obrigatórios."); return; }
    if (!form.appointment_type.trim()) { toast.error("Tipo de atendimento é obrigatório."); return; }
    if (form.end_time <= form.start_time) { toast.error("Horário final deve ser posterior ao inicial."); return; }

    setSaving(true);
    try {
      const conflict = await checkConflict(form.dentist_id, form.date, form.start_time, form.end_time, editingId ?? undefined);
      if (conflict) { toast.error("Conflito de horário para este dentista nesta data."); setSaving(false); return; }

      const payload: AppointmentInsert = {
        patient_id: form.patient_id,
        dentist_id: form.dentist_id,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        appointment_type: form.appointment_type.trim(),
        notes: form.notes.trim() || null,
        status: form.status,
        created_by: user?.id ?? null,
      };
      if (editingId) {
        await updateAppointment(editingId, payload);
        await logAudit("appointment.update", "appointment", editingId, { date: payload.date, type: payload.appointment_type });
        toast.success("Consulta atualizada!");
      } else {
        const created = await addAppointment(payload);
        await logAudit("appointment.create", "appointment", created?.id ?? null, { date: payload.date, type: payload.appointment_type });
        toast.success("Consulta agendada!");
      }
      setFormOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    if (status === "cancelled") {
      setCancelId(id);
      setCancelReason("");
      return;
    }
    try {
      await updateAppointment(id, { status });
      const action = status === "completed" ? "appointment.complete" : status === "missed" ? "appointment.miss" : "appointment.update";
      await logAudit(action, "appointment", id, { status });
      toast.success("Status atualizado.");
    } catch (e) {
      toast.error("Erro ao atualizar status.");
    }
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    if (!cancelReason.trim()) { toast.error("Motivo do cancelamento é obrigatório."); return; }
    try {
      await updateAppointment(cancelId, { status: "cancelled", cancellation_reason: cancelReason.trim() });
      await logAudit("appointment.cancel", "appointment", cancelId, { reason: cancelReason.trim() });
      toast.success("Consulta cancelada.");
      setCancelId(null);
    } catch {
      toast.error("Erro ao cancelar.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAppointment(deleteId);
      await logAudit("appointment.delete", "appointment", deleteId);
      toast.success("Consulta removida.");
    } catch {
      toast.error("Erro ao remover.");
    }
    setDeleteId(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Agenda"
          description="Visualize e gerencie as consultas do dia"
          actionLabel={canManage ? "Nova Consulta" : undefined}
          onAction={canManage ? openNew : undefined}
        />

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button variant="outline" size="icon" onClick={() => changeDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium capitalize">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
            <Button variant="outline" size="icon" onClick={() => changeDay(1)}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(todayISO())}>Hoje</Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-full sm:w-48 h-9" />
            </div>
            <Select value={dentistFilter} onValueChange={setDentistFilter}>
              <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Dentista" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {dentists.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhuma consulta" description="Sem consultas para os filtros selecionados." icon={Calendar} />
        ) : (
          <div className="space-y-3">
            {filtered.map(apt => (
              <div key={apt.id} className="rounded-xl bg-surface shadow-card p-4 hover:shadow-card-hover transition-shadow">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-center min-w-[60px]">
                    <p className="text-sm sm:text-base font-semibold text-foreground">{apt.start_time.slice(0,5)}</p>
                    <p className="text-xs text-muted-foreground">até {apt.end_time.slice(0,5)}</p>
                  </div>
                  <div className="h-10 w-px bg-border hidden sm:block" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{apt.patients?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{apt.appointment_type ?? "Consulta"} · {apt.dentists?.name ?? "—"}</p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <StatusBadge status={apt.status} label={APPOINTMENT_STATUS_LABELS[apt.status]} />
                    {apt.confirmation_status && apt.confirmation_status !== "pendente" && (
                      <Badge variant="outline" className="text-[10px]">
                        {CONFIRMATION_STATUS_LABELS[apt.confirmation_status as ConfirmationStatus]}
                      </Badge>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border sm:mt-2 sm:pt-2 justify-between sm:justify-end flex-wrap">
                    <StatusBadge status={apt.status} label={APPOINTMENT_STATUS_LABELS[apt.status]} className="sm:hidden" />
                    <div className="flex items-center gap-1 flex-wrap">
                      <Select value={apt.status} onValueChange={v => handleStatusChange(apt.id, v as AppointmentStatus)}>
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        title="Confirmação"
                        onClick={() => setConfirmationTarget({
                          id: apt.id,
                          patientName: apt.patients?.name ?? "",
                          status: apt.status,
                          initial: "confirmada",
                        })}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-success"
                        title="WhatsApp"
                        onClick={() => setWhatsappTarget({
                          phone: (apt.patients as { phone?: string | null } | null)?.phone ?? null,
                          patientName: apt.patients?.name ?? "",
                          date: apt.date,
                          time: apt.start_time?.slice(0, 5) ?? "",
                          dentist: apt.dentists?.name ?? "",
                          appointmentId: apt.id,
                          patientId: apt.patient_id,
                        })}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                      {canViewRem && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          title="Lembretes"
                          onClick={() => setReminderTarget({
                            id: apt.id,
                            patientId: apt.patient_id,
                            patientName: apt.patients?.name ?? "",
                            phone: (apt.patients as { phone?: string | null } | null)?.phone ?? null,
                            date: apt.date,
                            time: apt.start_time?.slice(0, 5) ?? "",
                            dentist: apt.dentists?.name ?? "",
                          })}
                        >
                          <Bell className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(apt.id)} title="Editar"><Edit className="h-3.5 w-3.5" /></Button>
                      {canDelete && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(apt.id)} title="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Editar Consulta" : "Nova Consulta"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Paciente *</Label>
                  <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{patients.filter(p => p.status === "active").map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dentista *</Label>
                  <Select value={form.dentist_id} onValueChange={v => setForm({ ...form, dentist_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{dentists.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Data *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Início *</Label><Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
                <div className="space-y-2"><Label>Fim *</Label><Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Tipo de atendimento *</Label><Input value={form.appointment_type} onChange={e => setForm({ ...form, appointment_type: e.target.value })} placeholder="Ex: Limpeza, Restauração, Avaliação..." /></div>
              <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando</> : (editingId ? "Salvar" : "Agendar")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!cancelId} onOpenChange={(o) => !o && setCancelId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Cancelar consulta</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">Informe o motivo do cancelamento. Esta informação ficará registrada no histórico.</p>
              <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Ex: Paciente solicitou remarcação..." rows={3} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCancelId(null)}>Voltar</Button>
                <Button variant="destructive" onClick={confirmCancel}>Confirmar cancelamento</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={() => setDeleteId(null)}
          title="Excluir consulta"
          description="Esta ação remove a consulta permanentemente. Use apenas para corrigir erros de cadastro. Para cancelar, prefira mudar o status."
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          destructive
        />

        {confirmationTarget && (
          <AppointmentConfirmationModal
            open={!!confirmationTarget}
            onClose={() => setConfirmationTarget(null)}
            appointmentId={confirmationTarget.id}
            patientName={confirmationTarget.patientName}
            appointmentStatus={confirmationTarget.status}
            initialStatus={confirmationTarget.initial}
          />
        )}

        {whatsappTarget && (
          <WhatsAppMessageModal
            open={!!whatsappTarget}
            onClose={() => setWhatsappTarget(null)}
            phone={whatsappTarget.phone}
            entity="appointment"
            entityId={whatsappTarget.appointmentId}
            context="agenda"
            patientId={whatsappTarget.patientId}
            appointmentId={whatsappTarget.appointmentId}
            communicationType="confirmacao_consulta"
            templateTypes={["confirmacao_consulta", "lembrete_consulta", "outro"]}
            vars={{
              nome_paciente: whatsappTarget.patientName,
              nome_clinica: settings?.clinic_name ?? "",
              data_consulta: whatsappTarget.date,
              horario_consulta: whatsappTarget.time,
              nome_dentista: whatsappTarget.dentist,
              whatsapp_clinica: settings?.whatsapp ?? "",
            }}
          />
        )}

        {reminderTarget && (
          <Dialog open={!!reminderTarget} onOpenChange={(o) => !o && setReminderTarget(null)}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" /> Lembretes — {reminderTarget.patientName}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {canManageRem && (
                  <Button onClick={() => setReminderFormOpen(true)} className="w-full">
                    <Bell className="h-4 w-4 mr-1.5" /> Novo lembrete
                  </Button>
                )}
                <ReminderList
                  appointmentId={reminderTarget.id}
                  patientName={reminderTarget.patientName}
                  patientPhone={reminderTarget.phone}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {reminderTarget && reminderFormOpen && (
          <ReminderForm
            open={reminderFormOpen}
            onClose={() => setReminderFormOpen(false)}
            appointmentId={reminderTarget.id}
            patientId={reminderTarget.patientId}
            patientName={reminderTarget.patientName}
            appointmentDate={reminderTarget.date}
            appointmentTime={reminderTarget.time}
            dentistName={reminderTarget.dentist}
          />
        )}
      </div>
    </AppLayout>
  );
}

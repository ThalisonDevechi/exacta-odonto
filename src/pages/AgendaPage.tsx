import { useMemo, useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAppointments, AppointmentInsert, AppointmentWithRelations } from "@/hooks/useAppointments";
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
import { Bell, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Edit, Trash2, Search, Loader2, CheckCircle2, MessageCircle, List, LayoutGrid } from "lucide-react";
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

const getMonday = (d: string) => {
  const date = new Date(d + "T12:00:00");
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
  return new Date(date.setDate(diff));
};
const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};
const formatISO = (date: Date) => date.toISOString().split("T")[0];
const getDayName = (date: Date) => date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
const getDayNumber = (date: Date) => date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200",
  confirmed: "bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200",
  in_progress: "bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200",
  completed: "bg-green-100 border-green-300 text-green-800 hover:bg-green-200",
  cancelled: "bg-red-100 border-red-300 text-red-800 hover:bg-red-200",
  missed: "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200",
  rescheduled: "bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200",
};

export default function AgendaPage() {
  const { user } = useAuth();
  const { appointments, loading, addAppointment, updateAppointment, deleteAppointment, checkConflict } = useAppointments();
  const { patients } = usePatients();
  const { dentists } = useDentists();
  const { settings } = useClinicSettings();

  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
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
  
  // Estado para o sistema de clique e arraste (Drag)
  const [dragSelection, setDragSelection] = useState<{ date: string; start: string; current: string } | null>(null);

  const [detailsTarget, setDetailsTarget] = useState<AppointmentWithRelations | null>(null);
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

  const filteredAppointments = useMemo(() => appointments
    .filter(a => statusFilter === "all" || a.status === statusFilter)
    .filter(a => dentistFilter === "all" || a.dentist_id === dentistFilter)
    .filter(a => !search || (a.patients?.name ?? "").toLowerCase().includes(search.toLowerCase())),
    [appointments, statusFilter, dentistFilter, search]);

  const listFiltered = useMemo(() => filteredAppointments.filter(a => a.date === selectedDate), [filteredAppointments, selectedDate]);

  const weekStart = useMemo(() => getMonday(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => Array.from({ length: 6 }).map((_, i) => addDays(weekStart, i)), [weekStart]);
  const startHour = 8;
  const endHour = 20;
  
  const timeSlots = Array.from({ length: (endHour - startHour) * 2 }, (_, i) => {
    const h = Math.floor(i / 2) + startHour;
    const m = i % 2 === 0 ? "00" : "30";
    return `${h.toString().padStart(2, '0')}:${m}`;
  });

  const changeDate = (days: number) => {
    setSelectedDate(formatISO(addDays(new Date(selectedDate + "T12:00:00"), days)));
  };

  const openNew = (date?: string, startTime?: string, endTime?: string) => {
    setEditingId(null);
    let endTimeStr = endTime || "08:30";
    
    if (!endTime && startTime) {
      const [h, m] = startTime.split(":").map(Number);
      const dateObj = new Date();
      dateObj.setHours(h, m + 30, 0); 
      endTimeStr = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
    }

    setForm({ 
      patient_id: "", dentist_id: dentistFilter !== "all" ? dentistFilter : "", 
      date: date || selectedDate, start_time: startTime || "08:00", end_time: endTimeStr, 
      appointment_type: "", notes: "", status: "scheduled" 
    });
    setDetailsTarget(null);
    setFormOpen(true);
  };

  // Verifica se um slot de meia hora ou range colide com consultas
  const isRangeOccupied = (dateStr: string, start: string, end: string) => {
    return filteredAppointments.some(apt => {
      if (apt.date !== dateStr || apt.status === 'cancelled') return false;
      const aptStart = apt.start_time.slice(0, 5);
      const aptEnd = apt.end_time.slice(0, 5);
      return aptStart < end && aptEnd > start;
    });
  };

  const isSlotOccupied = (dateStr: string, timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    const endM = m + 30;
    const slotEnd = endM === 60 ? `${(h+1).toString().padStart(2,'0')}:00` : `${h.toString().padStart(2,'0')}:${endM}`;
    return isRangeOccupied(dateStr, timeStr, slotEnd);
  };

  // Escuta global para quando o usuário soltar o mouse em qualquer lugar da tela
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragSelection) {
        const { date, start, current } = dragSelection;
        
        // Garante a ordem correta independente de onde arrastou
        const finalStart = start < current ? start : current;
        const finalEnd = start < current ? current : start;
        
        // Adiciona os 30 min do último slot para obter o Fim verdadeiro
        const [eh, em] = finalEnd.split(":").map(Number);
        const endH = em + 30 === 60 ? eh + 1 : eh;
        const endM = em + 30 === 60 ? "00" : "30";
        const endTimeStr = `${endH.toString().padStart(2, '0')}:${endM}`;
        
        openNew(date, finalStart, endTimeStr);
        setDragSelection(null);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [dragSelection]);

  const openEdit = (apt: AppointmentWithRelations) => {
    setEditingId(apt.id);
    setForm({
      patient_id: apt.patient_id, dentist_id: apt.dentist_id, date: apt.date,
      start_time: apt.start_time.slice(0, 5), end_time: apt.end_time.slice(0, 5),
      appointment_type: apt.appointment_type ?? "", notes: apt.notes ?? "", status: apt.status,
    });
    setDetailsTarget(null);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.patient_id || !form.dentist_id) { toast.error("Paciente e dentista são obrigatórios."); return; }
    if (!form.appointment_type.trim()) { toast.error("Tipo de atendimento é obrigatório."); return; }
    if (form.end_time <= form.start_time) { toast.error("Horário final deve ser posterior ao inicial."); return; }

    setSaving(true);
    try {
      const conflict = await checkConflict(form.dentist_id, form.date, form.start_time, form.end_time, editingId ?? undefined);
      if (conflict) { toast.error("Conflito de horário! Este dentista já tem agendamento neste período."); setSaving(false); return; }

      const payload: AppointmentInsert = {
        patient_id: form.patient_id, dentist_id: form.dentist_id, date: form.date,
        start_time: form.start_time, end_time: form.end_time, appointment_type: form.appointment_type.trim(),
        notes: form.notes.trim() || null, status: form.status, created_by: user?.id ?? null,
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
    if (status === "cancelled") { setCancelId(id); setCancelReason(""); return; }
    try {
      await updateAppointment(id, { status });
      await logAudit("appointment.update", "appointment", id, { status });
      toast.success("Status atualizado.");
      setDetailsTarget(null);
    } catch (e) { toast.error("Erro ao atualizar status."); }
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    if (!cancelReason.trim()) { toast.error("Motivo do cancelamento é obrigatório."); return; }
    try {
      await updateAppointment(cancelId, { status: "cancelled", cancellation_reason: cancelReason.trim() });
      await logAudit("appointment.cancel", "appointment", cancelId, { reason: cancelReason.trim() });
      toast.success("Consulta cancelada.");
      setCancelId(null);
      setDetailsTarget(null);
    } catch { toast.error("Erro ao cancelar."); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAppointment(deleteId);
      await logAudit("appointment.delete", "appointment", deleteId);
      toast.success("Consulta removida.");
      setDetailsTarget(null);
    } catch { toast.error("Erro ao remover."); }
    setDeleteId(null);
  };

  const getStyleForAppointment = (start: string, end: string) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const topMinutes = (sh - startHour) * 60 + sm;
    const durationMinutes = (eh - sh) * 60 + (em - sm);
    return { top: `${(topMinutes / 60) * 4}rem`, height: `${(durationMinutes / 60) * 4}rem` };
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in flex flex-col h-[calc(100vh-2rem)]">
        <PageHeader
          title="Agenda da Clínica"
          description="Gerencie os horários e atendimentos"
          actionLabel={canManage ? "Novo Agendamento" : undefined}
          onAction={canManage ? () => openNew() : undefined}
        />

        <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-surface p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="icon" onClick={() => changeDate(viewMode === "calendar" ? -7 : -1)}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="relative">
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
              <Button variant="outline" className="pointer-events-none gap-2 font-medium min-w-[140px] justify-center">
                <CalendarIcon className="h-4 w-4 text-primary" />
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
              </Button>
            </div>
            <Button variant="outline" size="icon" onClick={() => changeDate(viewMode === "calendar" ? 7 : 1)}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="secondary" size="sm" onClick={() => setSelectedDate(todayISO())}>Hoje</Button>
            
            <div className="h-6 w-px bg-border mx-2 hidden sm:block" />
            <div className="flex bg-muted rounded-lg p-1">
              <button onClick={() => setViewMode("calendar")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${viewMode === "calendar" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <LayoutGrid className="h-3.5 w-3.5" /> Semana
              </button>
              <button onClick={() => setViewMode("list")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-2 ${viewMode === "list" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <List className="h-3.5 w-3.5" /> Lista (Dia)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full xl:w-auto">
            <div className="relative flex-1 xl:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-full xl:w-56 h-9 bg-background" />
            </div>
            <Select value={dentistFilter} onValueChange={setDentistFilter}>
              <SelectTrigger className="w-40 h-9 bg-background"><SelectValue placeholder="Dentista" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Dentistas</SelectItem>
                {dentists.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-9 bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 space-y-2"><Skeleton className="h-[500px] w-full rounded-xl" /></div>
        ) : viewMode === "calendar" ? (
          
          <div className="flex-1 bg-surface border border-border rounded-xl shadow-card overflow-hidden flex flex-col min-h-[500px] select-none">
            <div className="grid grid-cols-[60px_repeat(6,1fr)] border-b border-border bg-muted/30">
              <div className="p-3 border-r border-border flex items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground">Hora</span>
              </div>
              {weekDays.map((date, i) => {
                const isToday = formatISO(date) === todayISO();
                return (
                  <div key={i} className={`p-2 border-r border-border text-center flex flex-col items-center justify-center ${isToday ? "bg-primary/5" : ""}`}>
                    <span className={`text-[11px] font-semibold uppercase ${isToday ? "text-primary" : "text-muted-foreground"}`}>{getDayName(date)}</span>
                    <span className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>{getDayNumber(date)}</span>
                  </div>
                );
              })}
            </div>
            
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
              <div className="grid grid-cols-[60px_repeat(6,1fr)] min-w-full">
                
                {/* Eixo Y Exato (Horas e meias horas) */}
                <div className="border-r border-border relative bg-muted/10">
                  {timeSlots.map(time => {
                    const isHalfHour = time.endsWith("30");
                    return (
                      <div key={time} className={`h-8 border-b ${isHalfHour ? 'border-border/30' : 'border-border/80'} flex items-start justify-end pr-2 pt-0.5`}>
                        <span className={`text-[10px] font-medium tracking-tight ${isHalfHour ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                          {time}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Colunas dos Dias (Corpo do Calendário) */}
                {weekDays.map((date, colIdx) => {
                  const dateStr = formatISO(date);
                  const isDragDay = dragSelection?.date === dateStr;
                  
                  // Renderiza o retângulo azul visual enquanto você arrasta o mouse
                  let dragStyle = {};
                  if (isDragDay) {
                    const t1 = dragSelection.start;
                    const t2 = dragSelection.current;
                    const s = t1 < t2 ? t1 : t2;
                    const e = t1 < t2 ? t2 : t1;
                    
                    const [eh, em] = e.split(":").map(Number);
                    const endH = em + 30 === 60 ? eh + 1 : eh;
                    const endM = em + 30 === 60 ? "00" : "30";
                    const eStr = `${endH.toString().padStart(2, '0')}:${endM}`;
                    dragStyle = getStyleForAppointment(s, eStr);
                  }

                  return (
                    <div key={colIdx} className="border-r border-border relative min-h-full">
                      
                      {/* Caixa de destaque do Drag */}
                      {isDragDay && (
                        <div 
                          className="absolute left-0 right-0 bg-primary/20 border border-primary border-dashed z-[5] pointer-events-none rounded-md transition-all duration-75"
                          style={dragStyle}
                        />
                      )}

                      {/* Geração dos Blocos Base de 30 minutos (Fundo) */}
                      {timeSlots.map(time => {
                        const occupied = isSlotOccupied(dateStr, time);
                        return (
                          <div 
                            key={time} 
                            className={`h-8 border-b ${time.endsWith('30') ? 'border-border/30' : 'border-border/80'} transition-colors relative z-0 ${
                              occupied 
                                ? "cursor-not-allowed bg-muted/10" 
                                : "cursor-pointer hover:bg-primary/10"
                            }`}
                            onMouseDown={(e) => {
                              if (e.button !== 0 || occupied || !canManage) return;
                              setDragSelection({ date: dateStr, start: time, current: time });
                            }}
                            onMouseEnter={() => {
                              // Se estiver arrastando e passar o mouse por aqui, atualiza a área azul
                              if (!dragSelection || dragSelection.date !== dateStr || occupied) return;
                              
                              const testS = dragSelection.start < time ? dragSelection.start : time;
                              const testE = dragSelection.start < time ? time : dragSelection.start;
                              
                              const [eh, em] = testE.split(":").map(Number);
                              const endH = em + 30 === 60 ? eh + 1 : eh;
                              const endM = em + 30 === 60 ? "00" : "30";
                              const testEStr = `${endH.toString().padStart(2, '0')}:${endM}`;

                              // Impede o arraste se ele passar por cima de um horário já agendado
                              if (isRangeOccupied(dateStr, testS, testEStr)) return;

                              setDragSelection(prev => ({ ...prev!, current: time }));
                            }}
                          />
                        );
                      })}
                      
                      {/* Renderização das Consultas */}
                      {filteredAppointments
                        .filter(a => a.date === dateStr)
                        .map(apt => (
                          <div
                            key={apt.id}
                            onClick={(e) => { e.stopPropagation(); setDetailsTarget(apt); }}
                            className={`absolute left-0.5 right-0.5 rounded-md border p-1.5 overflow-hidden cursor-pointer shadow-sm transition-all hover:scale-[1.02] z-10 flex flex-col gap-0.5 ${STATUS_COLORS[apt.status] || "bg-muted text-foreground"}`}
                            style={getStyleForAppointment(apt.start_time, apt.end_time)}
                            title={`${apt.start_time.slice(0,5)} - ${apt.patients?.name}`}
                          >
                            <div className="flex justify-between items-start w-full">
                              <span className="text-[10px] font-bold opacity-80">{apt.start_time.slice(0,5)}</span>
                              {apt.confirmation_status === "confirmada" && <CheckCircle2 className="h-3 w-3 opacity-70" />}
                            </div>
                            <span className="text-xs font-semibold leading-tight truncate">{apt.patients?.name}</span>
                            <span className="text-[10px] leading-tight truncate opacity-90">{apt.dentists?.name?.split(' ')[0]}</span>
                          </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
        ) : (
          listFiltered.length === 0 ? (
            <EmptyState title="Nenhuma consulta" description="Sem consultas para este dia." icon={CalendarIcon} />
          ) : (
            <div className="space-y-3">
              {listFiltered.map(apt => (
                <div key={apt.id} onClick={() => setDetailsTarget(apt)} className="rounded-xl bg-surface border border-border shadow-sm p-4 hover:border-primary/50 cursor-pointer transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[60px] bg-muted/50 p-2 rounded-lg">
                        <p className="text-sm font-bold text-primary">{apt.start_time.slice(0,5)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{apt.end_time.slice(0,5)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{apt.patients?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{apt.appointment_type ?? "Consulta"} · Com Dr(a). {apt.dentists?.name ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <StatusBadge status={apt.status} label={APPOINTMENT_STATUS_LABELS[apt.status]} />
                      {apt.confirmation_status && apt.confirmation_status !== "pendente" && (
                        <Badge variant="outline" className="text-[10px]">{CONFIRMATION_STATUS_LABELS[apt.confirmation_status as ConfirmationStatus]}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        <Dialog open={!!detailsTarget} onOpenChange={(o) => !o && setDetailsTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-primary" /> Detalhes do Agendamento</DialogTitle></DialogHeader>
            {detailsTarget && (
              <div className="space-y-5 py-2">
                <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                  <div><p className="text-xs text-muted-foreground font-medium uppercase">Paciente</p><p className="font-semibold text-base">{detailsTarget.patients?.name}</p></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><p className="text-xs text-muted-foreground font-medium uppercase">Data e Hora</p><p className="font-medium">{new Date(detailsTarget.date + "T12:00:00").toLocaleDateString("pt-BR")} às {detailsTarget.start_time.slice(0,5)}</p></div>
                    <div><p className="text-xs text-muted-foreground font-medium uppercase">Dentista</p><p className="font-medium">{detailsTarget.dentists?.name}</p></div>
                  </div>
                  <div><p className="text-xs text-muted-foreground font-medium uppercase">Procedimento</p><p className="font-medium">{detailsTarget.appointment_type}</p></div>
                  {detailsTarget.notes && <div><p className="text-xs text-muted-foreground font-medium uppercase">Observações</p><p className="text-sm bg-background p-2 rounded border">{detailsTarget.notes}</p></div>}
                </div>

                {canManage && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Ações Rápidas</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={detailsTarget.status} onValueChange={v => handleStatusChange(detailsTarget.id, v as AppointmentStatus)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Mudar Status" /></SelectTrigger>
                        <SelectContent>{Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="h-9 justify-start text-xs font-medium" onClick={() => setConfirmationTarget({ id: detailsTarget.id, patientName: detailsTarget.patients?.name ?? "", status: detailsTarget.status, initial: "confirmada" })}><CheckCircle2 className="h-3.5 w-3.5 mr-2 text-primary" /> Confirmação</Button>
                      <Button variant="outline" size="sm" className="h-9 justify-start text-xs font-medium" onClick={() => setWhatsappTarget({ phone: (detailsTarget.patients as { phone?: string | null } | null)?.phone ?? null, patientName: detailsTarget.patients?.name ?? "", date: detailsTarget.date, time: detailsTarget.start_time?.slice(0, 5) ?? "", dentist: detailsTarget.dentists?.name ?? "", appointmentId: detailsTarget.id, patientId: detailsTarget.patient_id })}><MessageCircle className="h-3.5 w-3.5 mr-2 text-success" /> Enviar WhatsApp</Button>
                      {canViewRem && <Button variant="outline" size="sm" className="h-9 justify-start text-xs font-medium" onClick={() => setReminderTarget({ id: detailsTarget.id, patientId: detailsTarget.patient_id, patientName: detailsTarget.patients?.name ?? "", phone: (detailsTarget.patients as { phone?: string | null } | null)?.phone ?? null, date: detailsTarget.date, time: detailsTarget.start_time?.slice(0, 5) ?? "", dentist: detailsTarget.dentists?.name ?? "" })}><Bell className="h-3.5 w-3.5 mr-2 text-warning" /> Lembretes Auto</Button>}
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-border mt-4">
                      <Button variant="secondary" className="flex-1" onClick={() => openEdit(detailsTarget)}><Edit className="h-4 w-4 mr-2" /> Editar Tudo</Button>
                      {canDelete && <Button variant="destructive" size="icon" onClick={() => { setDetailsTarget(null); setDeleteId(detailsTarget.id); }} title="Excluir Definitivamente"><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? "Editar Consulta" : "Nova Consulta"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Paciente *</Label>
                  <Select value={form.patient_id} onValueChange={v => setForm({ ...form, patient_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                    <SelectContent>{patients.filter(p => p.status === "active").map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dentista *</Label>
                  <Select value={form.dentist_id} onValueChange={v => setForm({ ...form, dentist_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o dentista" /></SelectTrigger>
                    <SelectContent>{dentists.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Data *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Início *</Label><Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
                <div className="space-y-2"><Label>Fim *</Label><Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Tipo de atendimento *</Label><Input value={form.appointment_type} onChange={e => setForm({ ...form, appointment_type: e.target.value })} placeholder="Ex: Avaliação, Limpeza..." /></div>
              <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Detalhes adicionais..." /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando</> : (editingId ? "Salvar" : "Agendar")}</Button>
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
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCancelId(null)}>Voltar</Button><Button variant="destructive" onClick={confirmCancel}>Confirmar</Button></div>
            </div>
          </DialogContent>
        </Dialog>

        <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Excluir consulta" description="Esta ação remove a consulta permanentemente." confirmLabel="Excluir" onConfirm={confirmDelete} destructive />

        {confirmationTarget && <AppointmentConfirmationModal open={!!confirmationTarget} onClose={() => setConfirmationTarget(null)} appointmentId={confirmationTarget.id} patientName={confirmationTarget.patientName} appointmentStatus={confirmationTarget.status} initialStatus={confirmationTarget.initial} />}
        {whatsappTarget && <WhatsAppMessageModal open={!!whatsappTarget} onClose={() => setWhatsappTarget(null)} phone={whatsappTarget.phone} entity="appointment" entityId={whatsappTarget.appointmentId} context="agenda" patientId={whatsappTarget.patientId} appointmentId={whatsappTarget.appointmentId} communicationType="confirmacao_consulta" templateTypes={["confirmacao_consulta", "lembrete_consulta", "outro"]} vars={{ nome_paciente: whatsappTarget.patientName, nome_clinica: settings?.clinic_name ?? "", data_consulta: whatsappTarget.date, horario_consulta: whatsappTarget.time, nome_dentista: whatsappTarget.dentist, whatsapp_clinica: settings?.whatsapp ?? "" }} />}
        
        {reminderTarget && (
          <Dialog open={!!reminderTarget} onOpenChange={(o) => !o && setReminderTarget(null)}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Lembretes</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {canManageRem && <Button onClick={() => setReminderFormOpen(true)} className="w-full"><Bell className="h-4 w-4 mr-1.5" /> Novo lembrete</Button>}
                <ReminderList appointmentId={reminderTarget.id} patientName={reminderTarget.patientName} patientPhone={reminderTarget.phone} />
              </div>
            </DialogContent>
          </Dialog>
        )}
        {reminderTarget && reminderFormOpen && <ReminderForm open={reminderFormOpen} onClose={() => setReminderFormOpen(false)} appointmentId={reminderTarget.id} patientId={reminderTarget.patientId} patientName={reminderTarget.patientName} appointmentDate={reminderTarget.date} appointmentTime={reminderTarget.time} dentistName={reminderTarget.dentist} />}
      </div>
    </AppLayout>
  );
}

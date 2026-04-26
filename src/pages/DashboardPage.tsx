import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/lib/auth-context";
import { usePatients } from "@/hooks/usePatients";
import { useAppointments } from "@/hooks/useAppointments";
import { useFinancialRecords } from "@/hooks/useFinancialRecords";
import { useTreatmentPlans } from "@/hooks/useTreatmentPlans";
import { useAppointmentReminders } from "@/hooks/useAppointmentReminders";
import { canViewReminders } from "@/lib/permissions";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Bell, Calendar, Users, CheckCircle2, Clock, AlertTriangle,
  DollarSign, ClipboardList, TrendingDown, AlertCircle, ChevronRight,
} from "lucide-react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDateBR(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { patients } = usePatients();
  const { appointments } = useAppointments();
  const { records: financial } = useFinancialRecords();
  const { plans } = useTreatmentPlans();
  const canSeeReminders = user ? canViewReminders(user.role) : false;
  const { reminders } = useAppointmentReminders(canSeeReminders ? { kind: "pending" } : { kind: "all" });

  const today = new Date().toISOString().split("T")[0];

  const todayAppts = useMemo(() => appointments.filter(a => a.date === today), [appointments, today]);
  const upcoming = useMemo(
    () => todayAppts.filter(a => ["scheduled", "confirmed"].includes(a.status))
                    .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [todayAppts],
  );
  const completedCount = todayAppts.filter(a => a.status === "completed").length;
  const cancelledCount = todayAppts.filter(a => a.status === "cancelled").length;
  const missedCount = todayAppts.filter(a => a.status === "missed").length;
  const activePatients = patients.filter(p => p.status === "active").length;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = patients.filter(p => new Date(p.created_at) >= monthStart).length;

  const monthRevenue = financial
    .filter(f => f.payment_date && new Date(f.payment_date) >= monthStart)
    .reduce((sum, f) => sum + Number(f.paid_value || 0), 0);

  const overdueRecords = financial.filter(f => f.status === "atrasado" || (
    f.status === "pendente" && f.due_date && new Date(f.due_date) < new Date(today + "T00:00:00")
  ));
  const pendingRecords = financial.filter(f => f.status === "pendente" || f.status === "parcial");
  const overdueAmount = overdueRecords.reduce((s, f) => s + Number(f.remaining_value || 0), 0);
  const pendingAmount = pendingRecords.reduce((s, f) => s + Number(f.remaining_value || 0), 0);

  const ongoingPlans = plans.filter(p => p.status === "em_andamento" || p.status === "aprovado").length;

  // Recent missed: last 14 days
  const fourteenAgo = new Date();
  fourteenAgo.setDate(fourteenAgo.getDate() - 14);
  const recentMissed = appointments.filter(a => a.status === "missed" && new Date(a.date) >= fourteenAgo).length;

  // Pending reminders breakdown
  const nowMs = Date.now();
  const todayStartMs = new Date(today + "T00:00:00").getTime();
  const todayEndMs = todayStartMs + 24 * 60 * 60 * 1000;
  const reminderToday = canSeeReminders
    ? reminders.filter(r => {
        const t = new Date(r.scheduled_for).getTime();
        return t >= todayStartMs && t < todayEndMs;
      }).length
    : 0;
  const reminderOverdue = canSeeReminders
    ? reminders.filter(r => new Date(r.scheduled_for).getTime() < nowMs).length
    : 0;
  const reminderTotal = canSeeReminders ? reminders.length : 0;

  // Alerts
  const alerts: { id: string; title: string; description: string; severity: "warning" | "danger" | "info"; onClick: () => void }[] = [];
  if (overdueRecords.length > 0) {
    alerts.push({
      id: "overdue",
      title: `${overdueRecords.length} pagamento(s) atrasado(s)`,
      description: `Total em atraso: ${formatBRL(overdueAmount)}`,
      severity: "danger",
      onClick: () => navigate("/financeiro"),
    });
  }
  if (recentMissed > 0) {
    alerts.push({
      id: "missed",
      title: `${recentMissed} falta(s) recente(s)`,
      description: "Pacientes ausentes nos últimos 14 dias.",
      severity: "warning",
      onClick: () => navigate("/agenda"),
    });
  }
  if (upcoming.length > 0) {
    alerts.push({
      id: "today",
      title: `${upcoming.length} consulta(s) para hoje`,
      description: "Confira a agenda do dia.",
      severity: "info",
      onClick: () => navigate("/agenda"),
    });
  }
  if (ongoingPlans > 0) {
    alerts.push({
      id: "plans",
      title: `${ongoingPlans} plano(s) ativo(s)`,
      description: "Planos de tratamento em andamento.",
      severity: "info",
      onClick: () => navigate("/tratamentos"),
    });
  }
  if (canSeeReminders && reminderTotal > 0) {
    const overdueText = reminderOverdue > 0 ? ` · ${reminderOverdue} atrasado(s)` : "";
    alerts.push({
      id: "reminders",
      title: `${reminderTotal} lembrete(s) pendente(s)`,
      description: `Hoje: ${reminderToday}${overdueText}`,
      severity: reminderOverdue > 0 ? "danger" : "warning",
      onClick: () => navigate("/agenda"),
    });
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {getGreeting()}, {user?.name?.split(" ")[0] ?? "bem-vindo"}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1 capitalize">{formatDateBR(today)}</p>
        </div>

        {/* KPI cards (clickable) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button onClick={() => navigate("/agenda")} className="text-left">
            <KPICard title="Consultas Hoje" value={todayAppts.length} icon={Calendar} />
          </button>
          <button onClick={() => navigate("/pacientes")} className="text-left">
            <KPICard title="Pacientes Ativos" value={activePatients} icon={Users} />
          </button>
          <button onClick={() => navigate("/pacientes")} className="text-left">
            <KPICard title="Novos no Mês" value={newThisMonth} icon={CheckCircle2} />
          </button>
          <button onClick={() => navigate("/agenda")} className="text-left">
            <KPICard title="Faltas Hoje" value={missedCount} icon={AlertTriangle} />
          </button>
          {canSeeReminders && (
            <button onClick={() => navigate("/agenda")} className="text-left">
              <KPICard title="Lembretes Pendentes" value={reminderTotal} icon={Bell} />
            </button>
          )}
        </div>

        {/* Financial / Plans cards (clickable) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button onClick={() => navigate("/financeiro")} className="text-left">
            <KPICard title="Recebido no Mês" value={formatBRL(monthRevenue)} icon={DollarSign} />
          </button>
          <button onClick={() => navigate("/financeiro")} className="text-left">
            <KPICard title="Pendências" value={formatBRL(pendingAmount)} icon={Clock} />
          </button>
          <button onClick={() => navigate("/financeiro")} className="text-left">
            <KPICard title="Atrasados" value={formatBRL(overdueAmount)} icon={TrendingDown} />
          </button>
          <button onClick={() => navigate("/tratamentos")} className="text-left">
            <KPICard title="Planos Ativos" value={ongoingPlans} icon={ClipboardList} />
          </button>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="rounded-xl bg-surface shadow-card p-5">
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" /> Alertas
            </h2>
            <div className="space-y-2">
              {alerts.map(alert => (
                <button
                  key={alert.id}
                  onClick={alert.onClick}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40",
                    alert.severity === "danger" && "border-destructive/30 bg-destructive/5",
                    alert.severity === "warning" && "border-warning/30 bg-warning/5",
                    alert.severity === "info" && "border-border",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AlertCircle className={cn(
                      "h-4 w-4 shrink-0",
                      alert.severity === "danger" && "text-destructive",
                      alert.severity === "warning" && "text-warning",
                      alert.severity === "info" && "text-primary",
                    )} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-surface shadow-card p-5">
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Próximas Consultas de Hoje
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma consulta pendente para hoje.</p>
            ) : (
              <div className="space-y-3">
                {upcoming.slice(0, 6).map(apt => (
                  <button
                    key={apt.id}
                    onClick={() => navigate("/agenda")}
                    className="w-full flex items-center gap-4 rounded-lg bg-muted/50 p-3 text-left hover:bg-muted transition-colors"
                  >
                    <div className="text-center min-w-[60px]">
                      <p className="text-sm font-semibold text-foreground">{apt.start_time.slice(0,5)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{apt.patients?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {apt.appointment_type ?? "Consulta"} · {apt.dentists?.name ?? "—"}
                      </p>
                    </div>
                    <StatusBadge status={apt.status} label={APPOINTMENT_STATUS_LABELS[apt.status]} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-surface shadow-card p-5">
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Resumo do Dia
            </h2>
            <div className="space-y-1">
              {[
                { label: "Total agendado", value: todayAppts.length },
                { label: "Concluídas", value: completedCount },
                { label: "Canceladas", value: cancelledCount },
                { label: "Faltas", value: missedCount },
                { label: "Aguardando", value: upcoming.length },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

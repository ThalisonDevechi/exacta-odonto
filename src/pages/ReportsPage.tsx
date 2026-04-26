import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { KPICard } from "@/components/KPICard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppointments } from "@/hooks/useAppointments";
import { usePatients } from "@/hooks/usePatients";
import { useProcedures, PROCEDURE_STATUS_LABELS } from "@/hooks/useProcedures";
import { useTreatmentPlans, PLAN_STATUS_LABELS } from "@/hooks/useTreatmentPlans";
import { useFinancialRecords, FINANCIAL_STATUS_LABELS } from "@/hooks/useFinancialRecords";
import { useDentists } from "@/hooks/useDentists";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/types";
import { exportCsv, exportPdf, auditedExport, type Column } from "@/lib/exporters";
import { Calendar, Users, DollarSign, Stethoscope, BarChart3, FileDown, FileText, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}

function formatDateBR(iso?: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

export default function ReportsPage() {
  const { appointments, loading: lAppts } = useAppointments();
  const { patients, loading: lPats } = usePatients();
  const { procedures, loading: lProc } = useProcedures();
  const { plans, loading: lPlans } = useTreatmentPlans();
  const { records: financials, loading: lFin } = useFinancialRecords();
  const { dentists } = useDentists();

  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dentistFilter, setDentistFilter] = useState("all");

  const inRange = (iso?: string | null) => {
    if (!iso) return false;
    const d = iso.slice(0, 10);
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  };
  const matchDentist = (id?: string | null) =>
    dentistFilter === "all" || id === dentistFilter;

  // ---- OPERATIONAL ----
  const filteredAppts = useMemo(
    () => appointments.filter(a => inRange(a.date) && matchDentist(a.dentist_id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appointments, dateFrom, dateTo, dentistFilter],
  );
  const completedAppts = filteredAppts.filter(a => a.status === "completed");
  const cancelledAppts = filteredAppts.filter(a => a.status === "cancelled");
  const missedAppts = filteredAppts.filter(a => a.status === "missed");

  const newPatients = useMemo(
    () => patients.filter(p => inRange(p.created_at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [patients, dateFrom, dateTo],
  );

  // ---- CLINICAL ----
  const filteredProcedures = useMemo(
    () => procedures.filter(p => {
      const dateRef = p.performed_date ?? p.planned_date ?? p.created_at;
      return inRange(dateRef) && matchDentist(p.dentist_id);
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [procedures, dateFrom, dateTo, dentistFilter],
  );
  const performedProcedures = filteredProcedures.filter(p => p.status === "realizado");

  const filteredPlans = useMemo(
    () => plans.filter(p => inRange(p.created_at) && matchDentist(p.dentist_id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plans, dateFrom, dateTo, dentistFilter],
  );
  const approvedPlans = filteredPlans.filter(p => p.status === "aprovado" || p.status === "em_andamento" || p.status === "concluido");
  const inProgressPlans = filteredPlans.filter(p => p.status === "em_andamento");

  // ---- FINANCIAL ----
  const filteredFin = useMemo(
    () => financials.filter(f => inRange(f.created_at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [financials, dateFrom, dateTo],
  );
  const totalReceived = filteredFin.reduce((s, f) => s + Number(f.paid_value ?? 0), 0);
  const totalPending = filteredFin.filter(f => f.status === "pendente" || f.status === "parcial")
    .reduce((s, f) => s + Number(f.remaining_value ?? 0), 0);
  const totalOverdue = financials.filter(f => f.status === "atrasado" || (f.due_date && f.due_date < today && (f.status === "pendente" || f.status === "parcial")))
    .reduce((s, f) => s + Number(f.remaining_value ?? 0), 0);

  // ---- Productivity per dentist ----
  const productivity = useMemo(() => dentists.map(d => {
    const appts = filteredAppts.filter(a => a.dentist_id === d.id);
    const completed = appts.filter(a => a.status === "completed").length;
    const procs = filteredProcedures.filter(p => p.dentist_id === d.id && p.status === "realizado");
    const value = procs.reduce((s, p) => s + Number(p.value ?? 0), 0);
    return { dentist: d.name, total: appts.length, completed, procedures: procs.length, value };
  }), [dentists, filteredAppts, filteredProcedures]);

  const subtitle = `Período: ${dateFrom || "início"} a ${dateTo || "hoje"}${dentistFilter !== "all" ? ` · Dentista: ${dentists.find(d => d.id === dentistFilter)?.name ?? ""}` : ""}`;

  const handleExport = async <T,>(
    format: "csv" | "pdf",
    name: string,
    title: string,
    rows: T[],
    columns: Column<T>[],
  ) => {
    if (rows.length === 0) {
      toast.warning("Nada para exportar.");
      return;
    }
    try {
      if (format === "csv") exportCsv(name, rows, columns);
      else exportPdf({ filename: name, title, subtitle, rows, columns });
      await auditedExport(format, name, "report.export", { rows: rows.length });
      toast.success(`Exportação ${format.toUpperCase()} concluída.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar.");
    }
  };

  const loading = lAppts || lPats || lProc || lPlans || lFin;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Relatórios" description="Indicadores e exportações por período, dentista e categoria." />

        {/* Filters */}
        <div className="rounded-xl bg-surface shadow-card p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Data início</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40 h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data fim</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40 h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dentista</Label>
              <Select value={dentistFilter} onValueChange={setDentistFilter}>
                <SelectTrigger className="w-56 h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os dentistas</SelectItem>
                  {dentists.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setDentistFilter("all"); }}>
              Limpar filtros
            </Button>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <Tabs defaultValue="operacional" className="w-full">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="operacional"><Calendar className="h-3.5 w-3.5 mr-1.5" />Operacional</TabsTrigger>
              <TabsTrigger value="clinico"><Stethoscope className="h-3.5 w-3.5 mr-1.5" />Clínico</TabsTrigger>
              <TabsTrigger value="financeiro"><DollarSign className="h-3.5 w-3.5 mr-1.5" />Financeiro</TabsTrigger>
              <TabsTrigger value="produtividade"><TrendingUp className="h-3.5 w-3.5 mr-1.5" />Produtividade</TabsTrigger>
            </TabsList>

            {/* OPERACIONAL */}
            <TabsContent value="operacional" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Consultas no período" value={filteredAppts.length} icon={Calendar} />
                <KPICard title="Concluídas" value={completedAppts.length} icon={BarChart3} />
                <KPICard title="Canceladas" value={cancelledAppts.length} icon={AlertTriangle} />
                <KPICard title="Faltas" value={missedAppts.length} icon={AlertTriangle} />
              </div>

              <ReportTable
                title="Consultas no período"
                icon={Calendar}
                rows={filteredAppts}
                columns={[
                  { header: "Data", accessor: r => formatDateBR(r.date) },
                  { header: "Hora", accessor: r => r.start_time?.slice(0, 5) ?? "" },
                  { header: "Paciente", accessor: r => r.patients?.name ?? "—" },
                  { header: "Dentista", accessor: r => r.dentists?.name ?? "—" },
                  { header: "Tipo", accessor: r => r.appointment_type ?? "Consulta" },
                  { header: "Status", accessor: r => APPOINTMENT_STATUS_LABELS[r.status] },
                ]}
                onExport={(fmt, rows, cols) => handleExport(fmt, "consultas-periodo", "Consultas por período", rows, cols)}
              />

              <ReportTable
                title="Cancelamentos"
                icon={AlertTriangle}
                rows={cancelledAppts}
                columns={[
                  { header: "Data", accessor: r => formatDateBR(r.date) },
                  { header: "Paciente", accessor: r => r.patients?.name ?? "—" },
                  { header: "Dentista", accessor: r => r.dentists?.name ?? "—" },
                  { header: "Motivo", accessor: r => r.cancellation_reason ?? "—" },
                ]}
                onExport={(fmt, rows, cols) => handleExport(fmt, "cancelamentos", "Consultas canceladas", rows, cols)}
              />

              <ReportTable
                title="Faltas"
                icon={AlertTriangle}
                rows={missedAppts}
                columns={[
                  { header: "Data", accessor: r => formatDateBR(r.date) },
                  { header: "Paciente", accessor: r => r.patients?.name ?? "—" },
                  { header: "Dentista", accessor: r => r.dentists?.name ?? "—" },
                  { header: "Tipo", accessor: r => r.appointment_type ?? "Consulta" },
                ]}
                onExport={(fmt, rows, cols) => handleExport(fmt, "faltas", "Faltas de pacientes", rows, cols)}
              />

              <ReportTable
                title="Pacientes cadastrados no período"
                icon={Users}
                rows={newPatients}
                columns={[
                  { header: "Cadastrado em", accessor: r => formatDateBR(r.created_at) },
                  { header: "Nome", accessor: "name" },
                  { header: "CPF", accessor: r => r.cpf ?? "—" },
                  { header: "Telefone", accessor: r => r.phone ?? "—" },
                  { header: "Email", accessor: r => r.email ?? "—" },
                  { header: "Status", accessor: "status" },
                ]}
                onExport={(fmt, rows, cols) => handleExport(fmt, "pacientes-periodo", "Pacientes cadastrados no período", rows, cols)}
              />
            </TabsContent>

            {/* CLÍNICO */}
            <TabsContent value="clinico" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Procedimentos no período" value={filteredProcedures.length} icon={Stethoscope} />
                <KPICard title="Realizados" value={performedProcedures.length} icon={BarChart3} />
                <KPICard title="Planos aprovados" value={approvedPlans.length} icon={FileText} />
                <KPICard title="Planos em andamento" value={inProgressPlans.length} icon={FileText} />
              </div>

              <ReportTable
                title="Procedimentos realizados"
                icon={Stethoscope}
                rows={performedProcedures}
                columns={[
                  { header: "Data", accessor: r => formatDateBR(r.performed_date ?? r.planned_date) },
                  { header: "Paciente", accessor: r => r.patients?.name ?? "—" },
                  { header: "Dentista", accessor: r => r.dentists?.name ?? "—" },
                  { header: "Procedimento", accessor: "name" },
                  { header: "Dente", accessor: r => r.tooth_number ?? "—" },
                  { header: "Valor", accessor: r => formatCurrency(Number(r.value ?? 0)) },
                ]}
                onExport={(fmt, rows, cols) => handleExport(fmt, "procedimentos-realizados", "Procedimentos realizados", rows, cols)}
              />

              <ReportTable
                title="Planos de tratamento"
                icon={FileText}
                rows={filteredPlans}
                columns={[
                  { header: "Criado", accessor: r => formatDateBR(r.created_at) },
                  { header: "Paciente", accessor: r => r.patients?.name ?? "—" },
                  { header: "Dentista", accessor: r => r.dentists?.name ?? "—" },
                  { header: "Título", accessor: "title" },
                  { header: "Status", accessor: r => PLAN_STATUS_LABELS[r.status] },
                  { header: "Valor estimado", accessor: r => formatCurrency(Number(r.estimated_value ?? 0)) },
                ]}
                onExport={(fmt, rows, cols) => handleExport(fmt, "planos-tratamento", "Planos de tratamento", rows, cols)}
              />
            </TabsContent>

            {/* FINANCEIRO */}
            <TabsContent value="financeiro" className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Recebido no período" value={formatCurrency(totalReceived)} icon={DollarSign} />
                <KPICard title="Pendente" value={formatCurrency(totalPending)} icon={DollarSign} />
                <KPICard title="Atrasado (geral)" value={formatCurrency(totalOverdue)} icon={AlertTriangle} />
                <KPICard title="Lançamentos no período" value={filteredFin.length} icon={FileText} />
              </div>

              <ReportTable
                title="Financeiro por período"
                icon={DollarSign}
                rows={filteredFin}
                columns={[
                  { header: "Data", accessor: r => formatDateBR(r.created_at) },
                  { header: "Paciente", accessor: r => r.patients?.name ?? "—" },
                  { header: "Descrição", accessor: "description" },
                  { header: "Valor", accessor: r => formatCurrency(Number(r.final_value ?? 0)) },
                  { header: "Pago", accessor: r => formatCurrency(Number(r.paid_value ?? 0)) },
                  { header: "Restante", accessor: r => formatCurrency(Number(r.remaining_value ?? 0)) },
                  { header: "Status", accessor: r => FINANCIAL_STATUS_LABELS[r.status] },
                  { header: "Vencimento", accessor: r => formatDateBR(r.due_date) },
                ]}
                onExport={(fmt, rows, cols) => handleExport(fmt, "financeiro-periodo", "Financeiro por período", rows, cols)}
              />
            </TabsContent>

            {/* PRODUTIVIDADE */}
            <TabsContent value="produtividade" className="space-y-6">
              <ReportTable
                title="Produtividade por dentista"
                icon={TrendingUp}
                rows={productivity}
                columns={[
                  { header: "Dentista", accessor: "dentist" },
                  { header: "Total consultas", accessor: "total" },
                  { header: "Concluídas", accessor: "completed" },
                  { header: "Procedimentos realizados", accessor: "procedures" },
                  { header: "Valor produzido", accessor: r => formatCurrency(Number(r.value ?? 0)) },
                ]}
                onExport={(fmt, rows, cols) => handleExport(fmt, "produtividade", "Produtividade por dentista", rows, cols)}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}

interface ReportTableProps<T> {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: T[];
  columns: Column<T>[];
  onExport: (format: "csv" | "pdf", rows: T[], columns: Column<T>[]) => void;
}

function ReportTable<T>({ title, icon: Icon, rows, columns, onExport }: ReportTableProps<T>) {
  return (
    <div className="rounded-xl bg-surface shadow-card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Icon className="h-4 w-4 text-primary" />{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{rows.length} registro{rows.length === 1 ? "" : "s"}</span>
          <Button size="sm" variant="outline" onClick={() => onExport("csv", rows, columns)}>
            <FileDown className="h-3.5 w-3.5 mr-1.5" />CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => onExport("pdf", rows, columns)}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />PDF
          </Button>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="p-8">
          <EmptyState title="Sem dados para o período" description="Ajuste os filtros para visualizar resultados." />
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[480px]">
          <Table>
            <TableHeader>
              <TableRow>{columns.map((c, i) => <TableHead key={i}>{c.header}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 200).map((r, i) => (
                <TableRow key={i}>
                  {columns.map((c, j) => {
                    const v = typeof c.accessor === "function" ? c.accessor(r) : (r as Record<string, unknown>)[c.accessor as string];
                    return <TableCell key={j} className="text-xs">{v == null ? "—" : String(v)}</TableCell>;
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length > 200 && (
            <p className="text-[11px] text-muted-foreground text-center py-2 border-t border-border">
              Mostrando 200 de {rows.length} registros. Exporte para ver todos.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

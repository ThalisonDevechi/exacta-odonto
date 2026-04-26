import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Search } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  "login": "Login",
  "logout": "Logout",
  "user.create": "Criou usuário",
  "user.update": "Editou usuário",
  "user.inactivate": "Inativou usuário",
  "user.block": "Bloqueou usuário",
  "user.reactivate": "Reativou usuário",
  "user.delete": "Excluiu usuário",
  "patient.create": "Criou paciente",
  "patient.update": "Editou paciente",
  "patient.inactivate": "Inativou paciente",
  "patient.reactivate": "Reativou paciente",
  "patient.delete": "Excluiu paciente",
  "appointment.create": "Criou consulta",
  "appointment.update": "Editou consulta",
  "appointment.reschedule": "Remarcou consulta",
  "appointment.cancel": "Cancelou consulta",
  "appointment.complete": "Concluiu consulta",
  "appointment.miss": "Registrou falta",
  "appointment.delete": "Excluiu consulta",
  "access.denied": "Acesso negado",
};

function actionTone(action: string): string {
  if (action.endsWith(".create")) return "bg-success/10 text-success";
  if (action.endsWith(".update") || action.endsWith(".reschedule")) return "bg-info-bg text-info";
  if (action.endsWith(".delete") || action.endsWith(".inactivate") || action.endsWith(".block") || action.endsWith(".cancel") || action.endsWith(".miss")) return "bg-destructive/10 text-destructive";
  if (action === "login" || action === "logout") return "bg-primary/10 text-primary";
  return "bg-muted text-muted-foreground";
}

export default function AuditPage() {
  const { logs, loading } = useAuditLogs(300);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  const filtered = useMemo(() => logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || (l.user_name ?? "").toLowerCase().includes(q) || l.action.toLowerCase().includes(q);
    const matchEntity = entityFilter === "all" || l.entity === entityFilter;
    return matchSearch && matchEntity;
  }), [logs, search, entityFilter]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Auditoria" description={`${logs.length} registros recentes`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por usuário ou ação..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64 h-9" />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as entidades</SelectItem>
              <SelectItem value="user">Usuários</SelectItem>
              <SelectItem value="patient">Pacientes</SelectItem>
              <SelectItem value="appointment">Consultas</SelectItem>
              <SelectItem value="auth">Autenticação</SelectItem>
            </SelectContent>
          </Select>
        </PageHeader>

        {loading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhum registro" description="Nenhuma ação corresponde aos filtros." icon={Shield} />
        ) : (
          <div className="space-y-2">
            {filtered.map(log => (
              <div key={log.id} className="flex items-start gap-4 rounded-xl bg-surface shadow-card p-4">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                  {(log.user_name ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{log.user_name ?? "Sistema"}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${actionTone(log.action)}`}>
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {Object.entries(log.details).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {log.entity}{log.entity_id ? ` · ${log.entity_id.slice(0, 8)}` : ""} · {new Date(log.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

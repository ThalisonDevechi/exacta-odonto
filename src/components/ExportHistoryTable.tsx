import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { type ExportLogRow } from "@/services/backupExportService";

const TYPE_LABELS: Record<string, string> = {
  pacientes: "Pacientes",
  consultas: "Consultas",
  financeiro: "Financeiro",
  procedimentos: "Procedimentos",
  planos_tratamento: "Planos de Tratamento",
  logs_auditoria: "Logs de Auditoria",
  recibos: "Recibos",
  orcamentos: "Orçamentos",
  comunicacoes: "Comunicações",
  lembretes: "Lembretes",
  assinaturas: "Assinaturas",
};

interface ExportHistoryTableProps {
  logs: ExportLogRow[];
  loading: boolean;
}

export function ExportHistoryTable({ logs, loading }: ExportHistoryTableProps) {
  if (loading) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Carregando histórico...</p>;
  }
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma exportação registrada ainda.</p>;
  }
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Registros</TableHead>
            <TableHead>Formato</TableHead>
            <TableHead>Filtros</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map(log => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap text-sm">
                {new Date(log.created_at).toLocaleString("pt-BR")}
              </TableCell>
              <TableCell className="text-sm">{log.user_name ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="secondary">{TYPE_LABELS[log.export_type] ?? log.export_type}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{log.total_records}</TableCell>
              <TableCell><Badge variant="outline">{log.format.toUpperCase()}</Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">
                {log.filters && Object.keys(log.filters).length > 0
                  ? JSON.stringify(log.filters)
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

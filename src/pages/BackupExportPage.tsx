import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExportCard } from "@/components/ExportCard";
import { ExportHistoryTable } from "@/components/ExportHistoryTable";
import { useBackupExports } from "@/hooks/useBackupExports";
import { type ExportType } from "@/services/backupExportService";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import {
  Users, Calendar, Stethoscope, ClipboardList, DollarSign, Receipt,
  FileSpreadsheet, Shield, MessageSquare, Bell, PenLine, ShieldAlert, History,
} from "lucide-react";

interface CategoryConfig {
  title: string;
  description: string;
  items: { type: ExportType; title: string; description: string; icon: typeof Users; useDateFilter: boolean }[];
}

const CATEGORIES: CategoryConfig[] = [
  {
    title: "Operacional",
    description: "Cadastros e agenda da clínica",
    items: [
      { type: "pacientes", title: "Pacientes", description: "Cadastro completo de pacientes (sem senhas).", icon: Users, useDateFilter: true },
      { type: "consultas", title: "Consultas", description: "Agenda de consultas e seus status.", icon: Calendar, useDateFilter: true },
    ],
  },
  {
    title: "Clínico",
    description: "Procedimentos e planos de tratamento",
    items: [
      { type: "procedimentos", title: "Procedimentos", description: "Procedimentos planejados e realizados.", icon: Stethoscope, useDateFilter: true },
      { type: "planos_tratamento", title: "Planos de Tratamento", description: "Planos de tratamento e seus status.", icon: ClipboardList, useDateFilter: true },
    ],
  },
  {
    title: "Financeiro",
    description: "Lançamentos, recibos e orçamentos",
    items: [
      { type: "financeiro", title: "Financeiro", description: "Lançamentos financeiros e pagamentos.", icon: DollarSign, useDateFilter: true },
      { type: "recibos", title: "Recibos", description: "Recibos de pagamento emitidos.", icon: Receipt, useDateFilter: true },
      { type: "orcamentos", title: "Orçamentos", description: "Orçamentos emitidos para pacientes.", icon: FileSpreadsheet, useDateFilter: true },
    ],
  },
  {
    title: "Controle",
    description: "Auditoria, comunicação, lembretes e assinaturas",
    items: [
      { type: "logs_auditoria", title: "Logs de Auditoria", description: "Histórico de ações dos usuários.", icon: Shield, useDateFilter: true },
      { type: "comunicacoes", title: "Histórico de Comunicação", description: "Mensagens e contatos com pacientes.", icon: MessageSquare, useDateFilter: true },
      { type: "lembretes", title: "Lembretes", description: "Lembretes de consulta agendados.", icon: Bell, useDateFilter: true },
      { type: "assinaturas", title: "Assinaturas (metadados)", description: "Metadados das assinaturas digitais (sem imagens).", icon: PenLine, useDateFilter: true },
    ],
  },
];

export default function BackupExportPage() {
  const { logs, loadingLogs, exporting, runExport } = useBackupExports();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    logAudit("backup.view", "export", null).catch(() => undefined);
  }, []);

  const filters = useMemo(
    () => (startDate || endDate ? { startDate: startDate || undefined, endDate: endDate || undefined } : undefined),
    [startDate, endDate],
  );

  const lastExportByType = useMemo(() => {
    const map: Partial<Record<ExportType, string>> = {};
    for (const log of logs) {
      if (!map[log.export_type]) map[log.export_type] = log.created_at;
    }
    return map;
  }, [logs]);

  async function handleExport(type: ExportType) {
    try {
      const total = await runExport(type, filters);
      toast.success(`Exportação concluída: ${total} registros`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao exportar";
      toast.error(msg);
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Backup e Exportação"
        description="Exporte os dados principais do sistema em CSV para backup e conferência interna."
      />

      <Alert className="mb-6">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          Acesso restrito a administradores. As exportações não incluem senhas, tokens ou imagens de assinatura — apenas
          dados estruturados. Cada exportação é registrada no histórico abaixo e na auditoria do sistema.
        </AlertDescription>
      </Alert>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Filtros gerais</CardTitle>
          <CardDescription>
            Aplica-se a todas as exportações com filtro por período (criado em / data do registro).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-1">
              <Label htmlFor="startDate">Data inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endDate">Data final</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => { setStartDate(""); setEndDate(""); }}
              disabled={!startDate && !endDate}
            >
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {CATEGORIES.map(category => (
          <section key={category.title}>
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-foreground">{category.title}</h2>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.items.map(item => (
                <ExportCard
                  key={item.type}
                  type={item.type}
                  title={item.title}
                  description={item.description}
                  icon={item.icon}
                  lastExportAt={lastExportByType[item.type]}
                  isExporting={exporting === item.type}
                  onExport={handleExport}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de exportações
          </CardTitle>
          <CardDescription>Últimas 100 exportações registradas no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExportHistoryTable logs={logs} loading={loadingLogs} />
        </CardContent>
      </Card>
    </AppLayout>
  );
}

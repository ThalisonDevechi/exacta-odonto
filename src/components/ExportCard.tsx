import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, type LucideIcon } from "lucide-react";
import { type ExportType } from "@/services/backupExportService";

interface ExportCardProps {
  type: ExportType;
  title: string;
  description: string;
  icon: LucideIcon;
  lastExportAt?: string;
  isExporting: boolean;
  onExport: (type: ExportType) => Promise<void> | void;
}

export function ExportCard({ type, title, description, icon: Icon, lastExportAt, isExporting, onExport }: ExportCardProps) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await onExport(type);
    } finally {
      setBusy(false);
    }
  }

  const showLoading = busy || isExporting;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end gap-3">
        {lastExportAt && (
          <p className="text-xs text-muted-foreground">
            Última exportação: {new Date(lastExportAt).toLocaleString("pt-BR")}
          </p>
        )}
        <Button onClick={handleClick} disabled={showLoading} size="sm" className="w-full">
          {showLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

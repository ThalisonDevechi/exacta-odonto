import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { usePatients } from "@/hooks/usePatients";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/permissions";
import { calculateAge } from "@/lib/cpf";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Search, ChevronRight } from "lucide-react";

export default function RecordsPage() {
  const { user } = useAuth();
  const { patients, loading } = usePatients();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const canView = user ? canAccess(user.role, "records") : false;

  const filtered = useMemo(() => patients
    .filter(p => p.status === "active")
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase())),
    [patients, search]);

  if (!canView) {
    return (
      <AppLayout>
        <EmptyState title="Acesso restrito" description="Você não tem permissão para visualizar prontuários." icon={FileText} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Prontuários"
          description="Acesse o prontuário clínico de cada paciente. O prontuário é único por paciente e mantém o histórico clínico completo."
        >
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar paciente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
        </PageHeader>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhum paciente encontrado" icon={FileText} />
        ) : (
          <div className="rounded-xl bg-surface shadow-card overflow-hidden divide-y divide-border">
            {filtered.map(p => (
              <button
                key={p.id}
                // CORREÇÃO: Força abrir direto na aba 'prontuario' usando a URL
                onClick={() => navigate(`/pacientes/${p.id}?tab=prontuario`)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/40 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {calculateAge(p.birth_date)} anos · {p.cpf ?? "Sem CPF"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="gap-1.5 shrink-0">
                  Abrir prontuário <ChevronRight className="h-4 w-4" />
                </Button>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

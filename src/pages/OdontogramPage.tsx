import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { PersistentOdontogram } from "@/components/PersistentOdontogram";
import { usePatients } from "@/hooks/usePatients";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Smile } from "lucide-react";

export default function OdontogramPage() {
  const { patients, loading } = usePatients();
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const activePatients = patients.filter(p => p.status === "active");
  const selected = activePatients.find(p => p.id === selectedPatientId);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Odontograma" description="Mapeamento clínico persistente da arcada dentária" />

        <div className="max-w-xs space-y-2">
          <Label>Paciente</Label>
          {loading ? <Skeleton className="h-10 w-full" /> : (
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger><SelectValue placeholder="Selecione um paciente" /></SelectTrigger>
              <SelectContent>
                {activePatients.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {!selected ? (
          <EmptyState
            title="Selecione um paciente"
            description="Escolha um paciente para visualizar ou editar o odontograma."
            icon={Smile}
          />
        ) : (
          <PersistentOdontogram
            patientId={selected.id}
            patientName={selected.name}
            birthDate={selected.birth_date}
          />
        )}
      </div>
    </AppLayout>
  );
}

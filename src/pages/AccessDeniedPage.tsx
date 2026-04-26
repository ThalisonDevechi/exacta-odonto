import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";

export default function AccessDeniedPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center animate-fade-in">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Acesso Negado</h1>
        <p className="text-muted-foreground mb-6">Você não tem permissão para acessar esta página.</p>
        <Button onClick={() => navigate("/")}>Voltar ao Dashboard</Button>
      </div>
    </div>
  );
}

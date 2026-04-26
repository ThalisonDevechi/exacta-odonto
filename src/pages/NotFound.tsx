import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center animate-fade-in">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
        <h2 className="text-xl font-semibold text-foreground mb-2">Página não encontrada</h2>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Button onClick={() => navigate("/")} size="lg">
          Voltar ao início
        </Button>
      </div>
    </div>
  );
};

export default NotFound;

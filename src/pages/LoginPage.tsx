import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import RegisterPage from "./RegisterPage";
import logoExacta from "@/assets/exacta-odonto-logo.png";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  if (showRegister) return <RegisterPage onBack={() => setShowRegister(false)} />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) { setError("Preencha todos os campos."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Formato de e-mail inválido."); return; }
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.ok) {
      const msg = result.error?.toLowerCase().includes("invalid")
        ? "E-mail ou senha incorretos."
        : result.error ?? "Não foi possível entrar.";
      setError(msg);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(17_49%_80%/0.18),transparent_55%)]" />
        <div className="max-w-md text-primary-foreground relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary-foreground/10 backdrop-blur-sm shadow-elegant mb-8 ring-1 ring-primary-foreground/15">
            <img src={logoExacta} alt="Exacta Odonto" className="h-20 w-20 object-contain" />
          </div>
          <h2 className="font-serif text-4xl font-semibold mb-3 tracking-tight">Exacta Odonto</h2>
          <p className="text-lg opacity-90 mb-2 font-light">Gestão Odontológica Inteligente</p>
          <p className="text-sm opacity-75 leading-relaxed font-light">Gerencie pacientes, consultas, prontuários e finanças da sua clínica em um único lugar — com elegância e precisão.</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8 text-center lg:text-left">
            <div className="lg:hidden mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-elegant">
              <img src={logoExacta} alt="Exacta Odonto" className="h-12 w-12 object-contain" />
            </div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">Bem-vindo de volta</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Entrando...</> : "Entrar"}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => setShowRegister(true)} disabled={loading}>
              Cadastrar novo usuário
            </Button>
          </form>

          <div className="mt-8 rounded-xl bg-muted p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Primeiro acesso?</p>
            <p className="text-xs text-muted-foreground">
              Clique em <strong>"Cadastrar novo usuário"</strong> para criar sua conta.
              Novos cadastros entram como <strong>Paciente</strong> — um administrador pode promover seu perfil depois.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

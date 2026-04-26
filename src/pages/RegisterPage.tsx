import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RegisterPageProps {
  onBack: () => void;
}

export default function RegisterPage({ onBack }: RegisterPageProps) {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Nome é obrigatório.";
    if (!form.email.trim()) e.email = "E-mail é obrigatório.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Formato de e-mail inválido.";
    if (!form.password) e.password = "Senha é obrigatória.";
    else if (form.password.length < 6) e.password = "Mínimo 6 caracteres.";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Senhas não conferem.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const res = await signup(form.email.trim(), form.password, form.name.trim(), form.phone.trim());
    setLoading(false);
    if (!res.ok) {
      const msg = res.error?.toLowerCase().includes("registered")
        ? "Este e-mail já está cadastrado."
        : res.error ?? "Não foi possível criar a conta.";
      toast.error(msg);
      return;
    }
    toast.success("Conta criada! Você foi conectado automaticamente.");
    // user will be set by onAuthStateChange — no need to navigate
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/20 text-3xl font-bold mb-8">E</div>
          <h2 className="text-3xl font-bold mb-4">Exacta Odonto</h2>
          <p className="text-lg opacity-90 mb-2">Gestão Odontológica Inteligente</p>
          <p className="text-sm opacity-70 leading-relaxed">Crie sua conta para acessar todas as funcionalidades do sistema.</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-6">
            <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
              <ArrowLeft className="h-4 w-4" /> Voltar ao login
            </button>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Criar conta</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Preencha os dados para se cadastrar. Novas contas são criadas como{" "}
              <strong>Paciente</strong>; um administrador pode promover seu perfil depois.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Seu nome completo" />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">E-mail *</Label>
              <Input id="reg-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="seu@email.com" autoComplete="email" />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99000-0000" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reg-password">Senha *</Label>
                <div className="relative">
                  <Input id="reg-password" type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mín. 6 caracteres" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar *</Label>
                <div className="relative">
                  <Input id="confirm-password" type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Repita a senha" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...</> : "Criar conta"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

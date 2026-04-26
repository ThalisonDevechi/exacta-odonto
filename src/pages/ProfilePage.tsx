import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth-context";
import { ROLE_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Mail, Phone, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function ProfilePage() {
  const { user, updateSession } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: user?.name ?? "", phone: user?.phone ?? "", email: user?.email ?? "" });

  if (!user) return null;

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório."); return; }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: form.name.trim(), phone: form.phone.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    updateSession({ name: form.name.trim(), phone: form.phone.trim() });
    toast.success("Perfil atualizado com sucesso!");
    setEditing(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-2xl">
        <PageHeader title="Meu Perfil" description="Gerencie suas informações pessoais" />

        <div className="rounded-xl bg-surface shadow-card p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl font-bold">
              {user.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{user.name}</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> {ROLE_LABELS[user.role]}
              </p>
            </div>
          </div>

          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={form.email} disabled className="opacity-60" />
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
                <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground w-20">Nome</span>
                <span className="text-foreground font-medium">{user.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground w-20">E-mail</span>
                <span className="text-foreground font-medium">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground w-20">Telefone</span>
                <span className="text-foreground font-medium">{user.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground w-20">Perfil</span>
                <span className="text-foreground font-medium">{ROLE_LABELS[user.role]}</span>
              </div>
              <div className="pt-2">
                <Button onClick={() => setEditing(true)}>Editar perfil</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

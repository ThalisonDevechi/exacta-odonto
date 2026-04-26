import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useStaff, StaffMember } from "@/hooks/useStaff";
import { useAuth } from "@/lib/auth-context";
import { logAudit } from "@/lib/audit";
import { ROLE_LABELS, UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Edit, Ban, Search, Eye, EyeOff, RotateCcw, Loader2, Trash2 } from "lucide-react";

interface FormState {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: "active" | "inactive" | "blocked";
  password: string;
  confirmPassword: string;
  cro: string;
  specialty: string;
}

const emptyForm: FormState = {
  name: "", email: "", phone: "", role: "receptionist", status: "active",
  password: "", confirmPassword: "", cro: "", specialty: "",
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { staff, loading, createStaff, updateStaff, deleteStaff } = useStaff();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; action: "inactivate" | "block" | "reactivate" | "delete"; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Hide patients from staff list
  const filtered = useMemo(() => staff
    .filter(u => u.role !== "patient")
    .filter(u => roleFilter === "all" || u.role === roleFilter)
    .filter(u => statusFilter === "all" || u.status === statusFilter)
    .filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone ?? "").includes(search);
    }), [staff, roleFilter, statusFilter, search]);

  const activeCount = staff.filter(u => u.role !== "patient" && u.status === "active").length;

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowPassword(false);
    setFormOpen(true);
  };

  const openEdit = (u: StaffMember) => {
    setEditing(u);
    setForm({
      name: u.name, email: u.email, phone: u.phone ?? "",
      role: u.role, status: u.status,
      password: "", confirmPassword: "",
      cro: u.cro ?? "", specialty: u.specialty ?? "",
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório."); return; }
    if (!form.email.trim()) { toast.error("E-mail é obrigatório."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error("E-mail inválido."); return; }
    if (form.role === "dentist" && (!form.cro.trim() || !form.specialty.trim())) {
      toast.error("CRO e especialidade são obrigatórios para dentistas.");
      return;
    }
    if (!editing) {
      if (!form.password) { toast.error("Senha provisória é obrigatória."); return; }
      if (form.password.length < 6) { toast.error("A senha deve ter no mínimo 6 caracteres."); return; }
      if (form.password !== form.confirmPassword) { toast.error("As senhas não conferem."); return; }
      if (staff.some(u => u.email.toLowerCase() === form.email.toLowerCase())) {
        toast.error("Já existe um usuário com este e-mail.");
        return;
      }
    }

    setSaving(true);
    try {
      if (editing) {
        await updateStaff({
          user_id: editing.id,
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          status: form.status,
          cro: form.role === "dentist" ? form.cro.trim() : undefined,
          specialty: form.role === "dentist" ? form.specialty.trim() : undefined,
        });
        await logAudit("user.update", "user", editing.id, { name: form.name, role: form.role });
        toast.success("Funcionário atualizado com sucesso!");
      } else {
        await createStaff({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          role: form.role,
          cro: form.role === "dentist" ? form.cro.trim() : undefined,
          specialty: form.role === "dentist" ? form.specialty.trim() : undefined,
        });
        await logAudit("user.create", "user", null, { email: form.email, role: form.role });
        toast.success("Funcionário cadastrado com sucesso!");
      }
      setFormOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.action === "inactivate") {
        await updateStaff({ user_id: confirm.id, status: "inactive" });
        await logAudit("user.inactivate", "user", confirm.id, { name: confirm.name });
        toast.success("Funcionário inativado.");
      } else if (confirm.action === "block") {
        await updateStaff({ user_id: confirm.id, status: "blocked" });
        await logAudit("user.block", "user", confirm.id, { name: confirm.name });
        toast.success("Funcionário bloqueado.");
      } else if (confirm.action === "reactivate") {
        await updateStaff({ user_id: confirm.id, status: "active" });
        await logAudit("user.reactivate", "user", confirm.id, { name: confirm.name });
        toast.success("Funcionário reativado.");
      } else if (confirm.action === "delete") {
        await deleteStaff(confirm.id);
        await logAudit("user.delete", "user", confirm.id, { name: confirm.name });
        toast.success("Funcionário excluído.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao executar ação.");
    } finally {
      setConfirm(null);
    }
  };

  const statusLabel = (s: StaffMember["status"]) =>
    s === "active" ? "Ativo" : s === "blocked" ? "Bloqueado" : "Inativo";
  const statusVariant = (s: StaffMember["status"]) =>
    s === "active" ? "active" : s === "blocked" ? "cancelled" : "inactive";

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Gestão de Funcionários"
          description={loading ? "Carregando..." : `${activeCount} funcionário${activeCount === 1 ? "" : "s"} ativo${activeCount === 1 ? "" : "s"}`}
          actionLabel="Novo Funcionário"
          onAction={openNew}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nome, e-mail ou telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64 h-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Perfil" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os perfis</SelectItem>
              {(["admin", "receptionist", "dentist", "assistant"] as UserRole[]).map(r => (
                <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="blocked">Bloqueados</SelectItem>
            </SelectContent>
          </Select>
        </PageHeader>

        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : (
          <div className="rounded-xl bg-surface shadow-card overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead className="hidden md:table-cell">E-mail</TableHead>
                  <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                  <TableHead className="hidden sm:table-cell">Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum funcionário encontrado.</TableCell></TableRow>
                ) : filtered.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">{u.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="font-medium leading-tight">{u.name}</p>
                          {u.cro && <p className="text-[11px] text-muted-foreground">CRO {u.cro}{u.specialty ? ` · ${u.specialty}` : ""}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{u.phone || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-foreground">{ROLE_LABELS[u.role]}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={statusVariant(u.status)} label={statusLabel(u.status)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)} title="Editar"><Edit className="h-3.5 w-3.5" /></Button>
                        {u.status === "active" && u.id !== currentUser?.id && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-warning" onClick={() => setConfirm({ id: u.id, action: "block", name: u.name })} title="Bloquear"><Ban className="h-3.5 w-3.5" /></Button>
                        )}
                        {u.status !== "active" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => setConfirm({ id: u.id, action: "reactivate", name: u.name })} title="Reativar"><RotateCcw className="h-3.5 w-3.5" /></Button>
                        )}
                        {u.id !== currentUser?.id && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setConfirm({ id: u.id, action: "delete", name: u.name })} title="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nome completo *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!editing} />
                  {editing && <p className="text-[10px] text-muted-foreground">E-mail não pode ser alterado.</p>}
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(11) 90000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>Perfil *</Label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v as UserRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["admin", "receptionist", "dentist", "assistant"] as UserRole[]).map(r => (
                        <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as FormState["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="blocked">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.role === "dentist" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="space-y-2">
                    <Label>CRO *</Label>
                    <Input value={form.cro} onChange={e => setForm({ ...form, cro: e.target.value })} placeholder="Ex: 12345/SP" />
                  </div>
                  <div className="space-y-2">
                    <Label>Especialidade *</Label>
                    <Input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} placeholder="Ex: Ortodontia" />
                  </div>
                </div>
              )}

              {!editing && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Senha provisória *</Label>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar senha *</Label>
                    <Input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando</> : (editing ? "Salvar alterações" : "Criar funcionário")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!confirm}
          onOpenChange={() => setConfirm(null)}
          title={
            confirm?.action === "inactivate" ? "Inativar funcionário" :
            confirm?.action === "block" ? "Bloquear funcionário" :
            confirm?.action === "reactivate" ? "Reativar funcionário" : "Excluir funcionário"
          }
          description={
            confirm?.action === "delete"
              ? `O funcionário "${confirm.name}" será excluído permanentemente. Esta ação não pode ser desfeita.`
              : confirm?.action === "block"
              ? `O funcionário "${confirm?.name}" será bloqueado e não poderá acessar o sistema.`
              : confirm?.action === "reactivate"
              ? `Reativar o acesso de "${confirm?.name}" ao sistema?`
              : `O funcionário "${confirm?.name}" será inativado.`
          }
          confirmLabel={confirm?.action === "reactivate" ? "Reativar" : confirm?.action === "delete" ? "Excluir" : confirm?.action === "block" ? "Bloquear" : "Inativar"}
          onConfirm={handleConfirm}
          destructive={confirm?.action !== "reactivate"}
        />
      </div>
    </AppLayout>
  );
}

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { usePatients, DBPatient, PatientInsert } from "@/hooks/usePatients";
import { useAuth } from "@/lib/auth-context";
import { logAudit } from "@/lib/audit";
import { calculateAge, isValidCPF, formatCPF } from "@/lib/cpf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, Search, Eye, Edit, Trash2, Loader2, User, RotateCcw } from "lucide-react";

type FormState = {
  name: string; cpf: string; rg: string; birth_date: string; gender: "M" | "F" | "O" | "";
  phone: string; email: string; address: string; address_number: string; neighborhood: string;
  city: string; state: string; zip_code: string;
  guardian_name: string; guardian_cpf: string; guardian_phone: string; guardian_relationship: string;
  notes: string; status: "active" | "inactive" | "archived";
};

const emptyForm: FormState = {
  name: "", cpf: "", rg: "", birth_date: "", gender: "",
  phone: "", email: "", address: "", address_number: "", neighborhood: "",
  city: "", state: "", zip_code: "",
  guardian_name: "", guardian_cpf: "", guardian_phone: "", guardian_relationship: "",
  notes: "", status: "active",
};

export default function PatientsPage() {
  const { user } = useAuth();
  const { patients, loading, addPatient, updatePatient, inactivatePatient } = usePatients();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [formOpen, setFormOpen] = useState(false);
  const [viewOnly, setViewOnly] = useState(false); // NOVO: Controla se o form é apenas leitura
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reactivateId, setReactivateId] = useState<string | null>(null); // NOVO: Para reativar pacientes

  const canCreate = user && (user.role === "admin" || user.role === "receptionist" || user.role === "dentist");
  const canDelete = user?.role === "admin";

  const filtered = useMemo(() => patients.filter(p => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) ||
      (p.cpf ?? "").includes(search) || (p.phone ?? "").includes(search) ||
      (p.email ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }), [patients, statusFilter, search]);

  const openNew = () => { setEditingId(null); setViewOnly(false); setForm(emptyForm); setFormOpen(true); };
  
  const openEdit = (p: DBPatient) => {
    setViewOnly(false);
    setEditingId(p.id);
    populateForm(p);
  };

  const openView = (p: DBPatient) => {
    setViewOnly(true);
    setEditingId(p.id);
    populateForm(p);
  };

  const populateForm = (p: DBPatient) => {
    setForm({
      name: p.name, cpf: p.cpf ?? "", rg: p.rg ?? "", birth_date: p.birth_date,
      gender: (p.gender ?? "") as FormState["gender"],
      phone: p.phone ?? "", email: p.email ?? "",
      address: p.address ?? "", address_number: p.address_number ?? "",
      neighborhood: p.neighborhood ?? "", city: p.city ?? "", state: p.state ?? "",
      zip_code: p.zip_code ?? "",
      guardian_name: p.guardian_name ?? "", guardian_cpf: p.guardian_cpf ?? "",
      guardian_phone: p.guardian_phone ?? "", guardian_relationship: p.guardian_relationship ?? "",
      notes: p.notes ?? "", status: p.status,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (viewOnly) return;
    if (!form.name.trim()) { toast.error("Nome completo é obrigatório."); return; }
    if (!form.birth_date) { toast.error("Data de nascimento é obrigatória."); return; }
    if (form.cpf.trim() && !isValidCPF(form.cpf)) { toast.error("CPF inválido."); return; }

    const age = calculateAge(form.birth_date);
    if (age < 18) {
      if (!form.guardian_name.trim() || !form.guardian_phone.trim()) {
        toast.error("Para menores de 18 anos, nome e telefone do responsável são obrigatórios.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: PatientInsert = {
        name: form.name.trim(),
        cpf: form.cpf.trim() || null,
        rg: form.rg.trim() || null,
        birth_date: form.birth_date,
        gender: form.gender || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        address_number: form.address_number.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zip_code: form.zip_code.trim() || null,
        guardian_name: form.guardian_name.trim() || null,
        guardian_cpf: form.guardian_cpf.trim() || null,
        guardian_phone: form.guardian_phone.trim() || null,
        guardian_relationship: form.guardian_relationship.trim() || null,
        notes: form.notes.trim() || null,
        status: form.status,
      };
      if (editingId) {
        await updatePatient(editingId, payload);
        await logAudit("patient.update", "patient", editingId, { name: form.name });
        toast.success("Paciente atualizado!");
      } else {
        const created = await addPatient(payload);
        await logAudit("patient.create", "patient", created?.id ?? null, { name: form.name });
        toast.success("Paciente cadastrado!");
      }
      setFormOpen(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar.";
      if (msg.toLowerCase().includes("duplicate") || msg.includes("patients_cpf_key")) {
        toast.error("Já existe um paciente com este CPF.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInactivate = async () => {
    if (!deleteId) return;
    try {
      await inactivatePatient(deleteId);
      await logAudit("patient.inactivate", "patient", deleteId);
      toast.success("Paciente inativado.");
    } catch (e) {
      toast.error("Não foi possível inativar.");
    }
    setDeleteId(null);
  };

  const handleReactivate = async () => {
    if (!reactivateId) return;
    const p = patients.find(x => x.id === reactivateId);
    if (!p) return;

    try {
      const payload: PatientInsert = {
        name: p.name, cpf: p.cpf, rg: p.rg, birth_date: p.birth_date, gender: p.gender,
        phone: p.phone, email: p.email, address: p.address, address_number: p.address_number,
        neighborhood: p.neighborhood, city: p.city, state: p.state, zip_code: p.zip_code,
        guardian_name: p.guardian_name, guardian_cpf: p.guardian_cpf, guardian_phone: p.guardian_phone,
        guardian_relationship: p.guardian_relationship, notes: p.notes,
        status: "active", // Força o status de volta para ativo
      };
      await updatePatient(reactivateId, payload);
      await logAudit("patient.reactivate", "patient", reactivateId);
      toast.success("Paciente reativado com sucesso.");
    } catch (e) {
      toast.error("Erro ao reativar o paciente.");
    }
    setReactivateId(null);
  };

  const activeCount = patients.filter(p => p.status === "active").length;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Pacientes"
          description={loading ? "Carregando..." : `${activeCount} ${activeCount === 1 ? "paciente ativo" : "pacientes ativos"}`}
          actionLabel={canCreate ? "Novo Paciente" : undefined}
          onAction={canCreate ? openNew : undefined}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, CPF, telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-full sm:w-64 h-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="archived">Arquivados</SelectItem>
            </SelectContent>
          </Select>
        </PageHeader>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search || statusFilter !== "all" ? "Nenhum paciente encontrado" : "Ainda não há pacientes"}
            description={canCreate ? "Cadastre o primeiro paciente para começar." : undefined}
            icon={Users}
          />
        ) : (
          <div className="rounded-xl bg-surface shadow-card overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="hidden sm:table-cell">CPF</TableHead>
                  <TableHead className="hidden md:table-cell">Telefone</TableHead>
                  <TableHead className="hidden lg:table-cell">Idade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/pacientes/${p.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">{p.name.charAt(0).toUpperCase()}</div>
                        <p className="font-medium">{p.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{p.cpf ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{p.phone ?? "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{calculateAge(p.birth_date)} anos</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status === "active" ? "active" : "inactive"} label={p.status === "active" ? "Ativo" : p.status === "archived" ? "Arquivado" : "Inativo"} />
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      {/* Sempre pode ver a área clínica */}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/pacientes/${p.id}`)} title="Área Clínica"><Eye className="h-3.5 w-3.5" /></Button>
                      
                      {/* Paciente Ativo: Permite editar cadastro e inativar */}
                      {canCreate && p.status === "active" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)} title="Editar Cadastro"><Edit className="h-3.5 w-3.5" /></Button>
                      )}
                      {canDelete && p.status === "active" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(p.id)} title="Inativar"><Trash2 className="h-3.5 w-3.5" /></Button>
                      )}

                      {/* Paciente Inativo/Arquivado: Apenas ver cadastro e reativar */}
                      {canCreate && p.status !== "active" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openView(p)} title="Ver Cadastro (Leitura)"><User className="h-3.5 w-3.5" /></Button>
                      )}
                      {canDelete && p.status !== "active" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => setReactivateId(p.id)} title="Reativar Paciente"><RotateCcw className="h-3.5 w-3.5" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{viewOnly ? "Dados do Paciente" : editingId ? "Editar Paciente" : "Novo Paciente"}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados pessoais</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2"><Label>Nome completo *</Label><Input disabled={viewOnly} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>CPF</Label><Input disabled={viewOnly} value={form.cpf} onChange={e => setForm({ ...form, cpf: formatCPF(e.target.value) })} placeholder="000.000.000-00" maxLength={14} /></div>
                <div className="space-y-2"><Label>RG</Label><Input disabled={viewOnly} value={form.rg} onChange={e => setForm({ ...form, rg: e.target.value })} /></div>
                <div className="space-y-2"><Label>Data de nascimento *</Label><Input disabled={viewOnly} type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Sexo</Label>
                  <Select disabled={viewOnly} value={form.gender} onValueChange={v => setForm({ ...form, gender: v as FormState["gender"] })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                      <SelectItem value="O">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Telefone</Label><Input disabled={viewOnly} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(11) 90000-0000" /></div>
                <div className="space-y-2"><Label>E-mail</Label><Input disabled={viewOnly} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              </div>

              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Endereço</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>CEP</Label><Input disabled={viewOnly} value={form.zip_code} onChange={e => setForm({ ...form, zip_code: e.target.value })} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Logradouro</Label><Input disabled={viewOnly} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-2"><Label>Número</Label><Input disabled={viewOnly} value={form.address_number} onChange={e => setForm({ ...form, address_number: e.target.value })} /></div>
                <div className="space-y-2"><Label>Bairro</Label><Input disabled={viewOnly} value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cidade</Label><Input disabled={viewOnly} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                <div className="space-y-2"><Label>UF</Label><Input disabled={viewOnly} value={form.state} onChange={e => setForm({ ...form, state: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} /></div>
              </div>

              {form.birth_date && calculateAge(form.birth_date) < 18 && (
                <>
                  <div className="text-xs font-semibold text-warning uppercase tracking-wide pt-2">
                    Responsável (paciente menor de 18 anos)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nome do responsável *</Label><Input disabled={viewOnly} value={form.guardian_name} onChange={e => setForm({ ...form, guardian_name: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Telefone do responsável *</Label><Input disabled={viewOnly} value={form.guardian_phone} onChange={e => setForm({ ...form, guardian_phone: e.target.value })} /></div>
                    <div className="space-y-2"><Label>CPF do responsável</Label><Input disabled={viewOnly} value={form.guardian_cpf} onChange={e => setForm({ ...form, guardian_cpf: formatCPF(e.target.value) })} maxLength={14} /></div>
                    <div className="space-y-2"><Label>Grau de parentesco</Label><Input disabled={viewOnly} value={form.guardian_relationship} onChange={e => setForm({ ...form, guardian_relationship: e.target.value })} placeholder="Mãe, Pai, Tutor..." /></div>
                  </div>
                </>
              )}

              <div className="space-y-2 pt-2"><Label>Observações</Label><Textarea disabled={viewOnly} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setFormOpen(false)}>
                  {viewOnly ? "Fechar" : "Cancelar"}
                </Button>
                {!viewOnly && (
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : (editingId ? "Salvar alterações" : "Cadastrar")}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={() => setDeleteId(null)}
          title="Inativar paciente"
          description="O paciente será marcado como inativo. Os dados clínicos e o histórico serão preservados. Você pode reativá-lo mais tarde."
          confirmLabel="Inativar"
          onConfirm={handleInactivate}
          destructive
        />

        <ConfirmDialog
          open={!!reactivateId}
          onOpenChange={() => setReactivateId(null)}
          title="Reativar paciente"
          description="Este paciente voltará a constar como Ativo em sua clínica, permitindo novas edições de prontuário, orçamentos e procedimentos."
          confirmLabel="Confirmar Reativação"
          onConfirm={handleReactivate}
        />
      </div>
    </AppLayout>
  );
}

import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/types";
import {
  LayoutDashboard, Calendar, Users, FileText, Stethoscope, ClipboardList,
  DollarSign, BarChart3, UserCog, Shield, Menu, X, LogOut, Smile,
  Settings, MessageSquare, FileSpreadsheet, Receipt, DatabaseBackup,
} from "lucide-react";
import logoExacta from "@/assets/exacta-odonto-logo.png";

const allNavItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" as const },
  { to: "/agenda", label: "Agenda", icon: Calendar, module: "appointments" as const },
  { to: "/pacientes", label: "Pacientes", icon: Users, module: "patients" as const },
  { to: "/prontuarios", label: "Prontuários", icon: FileText, module: "records" as const },
  { to: "/odontograma", label: "Odontograma", icon: Smile, module: "odontogram" as const },
  { to: "/procedimentos", label: "Procedimentos", icon: Stethoscope, module: "procedures" as const },
  { to: "/tratamentos", label: "Planos de Tratamento", icon: ClipboardList, module: "treatmentPlans" as const },
  { to: "/orcamentos", label: "Orçamentos", icon: FileSpreadsheet, module: "budgets" as const },
  { to: "/financeiro", label: "Financeiro", icon: DollarSign, module: "financial" as const },
  { to: "/recibos", label: "Recibos", icon: Receipt, module: "receipts" as const },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, module: "reports" as const },
  { to: "/modelos-mensagem", label: "Modelos de Mensagem", icon: MessageSquare, module: "messageTemplates" as const },
  { to: "/configuracoes", label: "Configurações", icon: Settings, module: "clinicSettings" as const },
  { to: "/usuarios", label: "Usuários", icon: UserCog, module: "users" as const },
  { to: "/auditoria", label: "Auditoria", icon: Shield, module: "audit" as const },
  { to: "/backup-exportacao", label: "Backup e Exportação", icon: DatabaseBackup, module: "backupExports" as const },
];

const patientNavItems = [
  { to: "/meu-painel", label: "Meu Painel", icon: LayoutDashboard },
];

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = user?.role === "patient"
    ? patientNavItems.map(i => ({ ...i, module: "dashboard" as const }))
    : allNavItems.filter(item => user && canAccess(user.role, item.module));

  return (
    <>
      <button
        aria-label="Abrir menu"
        title="Abrir menu"
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-surface shadow-card lg:hidden"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface border-r border-border transition-transform duration-300 lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-20 items-center justify-between px-5 border-b border-sidebar-border bg-gradient-surface">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-elegant overflow-hidden">
              <img src={logoExacta} alt="Exacta Odonto" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <span className="font-serif text-lg font-semibold tracking-tight text-foreground leading-none">Exacta Odonto</span>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1">Gestão Odontológica</p>
            </div>
          </div>
          <button aria-label="Fechar menu" title="Fechar menu" onClick={() => setMobileOpen(false)} className="lg:hidden"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-primary" />}
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <button
              aria-label="Abrir perfil"
              title="Abrir perfil"
              onClick={() => { navigate("/perfil"); setMobileOpen(false); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0 hover:bg-primary/20 transition-colors"
            >
              {user?.name.charAt(0)}
            </button>
            <button onClick={() => { navigate("/perfil"); setMobileOpen(false); }} className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user ? ROLE_LABELS[user.role] : ""}</p>
            </button>
            <button aria-label="Sair" onClick={logout} className="text-muted-foreground hover:text-destructive transition-colors shrink-0" title="Sair"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>
    </>
  );
}

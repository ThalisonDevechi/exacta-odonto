import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { DataProvider } from "@/lib/data-context";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AgendaPage from "./pages/AgendaPage";
import PatientsPage from "./pages/PatientsPage";
import PatientDetailPage from "./pages/PatientDetailPage";
import RecordsPage from "./pages/RecordsPage";
import ProceduresPage from "./pages/ProceduresPage";
import TreatmentPlansPage from "./pages/TreatmentPlansPage";
import FinancialPage from "./pages/FinancialPage";
import ReportsPage from "./pages/ReportsPage";
import UsersPage from "./pages/UsersPage";
import AuditPage from "./pages/AuditPage";
import ProfilePage from "./pages/ProfilePage";
import OdontogramPage from "./pages/OdontogramPage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import MyPanelPage from "./pages/MyPanelPage";
import ClinicSettingsPage from "./pages/ClinicSettingsPage";
import MessageTemplatesPage from "./pages/MessageTemplatesPage";
import BudgetsPage from "./pages/BudgetsPage";
import ReceiptsPage from "./pages/ReceiptsPage";
import BackupExportPage from "./pages/BackupExportPage";
import NotFound from "./pages/NotFound";
import WhatsAppChatPage from "./pages/WhatsAppChatPage";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }
  if (!user) return <LoginPage />;

  // Patients are routed to their own panel only
  if (user.role === "patient") {
    return (
      <Routes>
        <Route path="/meu-painel" element={<MyPanelPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="/acesso-negado" element={<AccessDeniedPage />} />
        <Route path="*" element={<Navigate to="/meu-painel" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute module="dashboard"><DashboardPage /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute module="appointments"><AgendaPage /></ProtectedRoute>} />
      <Route path="/pacientes" element={<ProtectedRoute module="patients"><PatientsPage /></ProtectedRoute>} />
      <Route path="/pacientes/:id" element={<ProtectedRoute module="patients"><PatientDetailPage /></ProtectedRoute>} />
      <Route path="/prontuarios" element={<ProtectedRoute module="records"><RecordsPage /></ProtectedRoute>} />
      <Route path="/procedimentos" element={<ProtectedRoute module="procedures"><ProceduresPage /></ProtectedRoute>} />
      <Route path="/tratamentos" element={<ProtectedRoute module="treatmentPlans"><TreatmentPlansPage /></ProtectedRoute>} />
      <Route path="/financeiro" element={<ProtectedRoute module="financial"><FinancialPage /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute module="reports"><ReportsPage /></ProtectedRoute>} />
      <Route path="/usuarios" element={<ProtectedRoute module="users"><UsersPage /></ProtectedRoute>} />
      <Route path="/auditoria" element={<ProtectedRoute module="audit"><AuditPage /></ProtectedRoute>} />
      <Route path="/odontograma" element={<ProtectedRoute module="odontogram"><OdontogramPage /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute module="clinicSettings"><ClinicSettingsPage /></ProtectedRoute>} />
      <Route path="/modelos-mensagem" element={<ProtectedRoute module="messageTemplates"><MessageTemplatesPage /></ProtectedRoute>} />
      <Route path="/orcamentos" element={<ProtectedRoute module="budgets"><BudgetsPage /></ProtectedRoute>} />
      <Route path="/recibos" element={<ProtectedRoute module="receipts"><ReceiptsPage /></ProtectedRoute>} />
      <Route path="/backup-exportacao" element={<ProtectedRoute module="backupExports"><BackupExportPage /></ProtectedRoute>} />
      <Route path="/perfil" element={<ProfilePage />} />
      <Route path="/acesso-negado" element={<AccessDeniedPage />} />
      <Route path="/whatsapp" element={<ProtectedRoute module="patients"><WhatsAppChatPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DataProvider>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { canAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

type Module = "dashboard" | "patients" | "appointments" | "records" | "procedures" | "treatmentPlans" | "financial" | "reports" | "users" | "audit" | "odontogram" | "clinicSettings" | "messageTemplates" | "budgets" | "receipts" | "backupExports";

interface ProtectedRouteProps {
  module: Module;
  children: React.ReactNode;
}

export function ProtectedRoute({ module, children }: ProtectedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();
  const loggedRef = useRef(false);

  const allowed = !!user && canAccess(user.role, module);

  useEffect(() => {
    if (user && !allowed && !loggedRef.current) {
      loggedRef.current = true;
      logAudit("access.denied", "route", null, { path: location.pathname, module });
    }
  }, [user, allowed, location.pathname, module]);

  if (!user) return <Navigate to="/" replace />;
  if (!allowed) return <Navigate to="/acesso-negado" replace />;
  return <>{children}</>;
}

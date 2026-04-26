import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@/lib/types";

interface PermissionGateProps {
  /** Roles allowed to render the children. */
  allow: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only when the current user's role is in the `allow` list.
 * Use to conditionally show buttons, sections, table actions, etc.
 */
export function PermissionGate({ allow, children, fallback = null }: PermissionGateProps) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}

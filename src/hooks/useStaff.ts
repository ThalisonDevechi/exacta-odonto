import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/lib/types";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: "active" | "inactive" | "blocked";
  last_login: string | null;
  created_at: string;
  role: UserRole;
  cro: string | null;
  specialty: string | null;
}

interface CreateStaffInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: UserRole;
  cro?: string;
  specialty?: string;
}

interface UpdateStaffInput {
  user_id: string;
  name?: string;
  phone?: string | null;
  role?: UserRole;
  status?: "active" | "inactive" | "blocked";
  cro?: string;
  specialty?: string;
}

async function callAdmin(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Profiles + roles + dentist info
      const [{ data: profiles, error: pErr }, { data: roles }, { data: dentists }] = await Promise.all([
        supabase.from("profiles").select("*").order("name"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("dentists").select("user_id, cro, specialty"),
      ]);
      if (pErr) throw pErr;

      const roleMap = new Map<string, UserRole>();
      const order: UserRole[] = ["admin", "dentist", "assistant", "receptionist", "patient"];
      (roles ?? []).forEach((r) => {
        const current = roleMap.get(r.user_id);
        if (!current || order.indexOf(r.role as UserRole) < order.indexOf(current)) {
          roleMap.set(r.user_id, r.role as UserRole);
        }
      });
      const dentistMap = new Map<string, { cro: string; specialty: string | null }>();
      (dentists ?? []).forEach((d) => dentistMap.set(d.user_id, { cro: d.cro, specialty: d.specialty }));

      const list: StaffMember[] = (profiles ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        status: p.status as StaffMember["status"],
        last_login: p.last_login,
        created_at: p.created_at,
        role: roleMap.get(p.id) ?? "patient",
        cro: dentistMap.get(p.id)?.cro ?? null,
        specialty: dentistMap.get(p.id)?.specialty ?? null,
      }));
      // Filter: staff page shows non-patient profiles by default
      setStaff(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const createStaff = async (input: CreateStaffInput) => {
    await callAdmin({ action: "create", ...input });
    await refetch();
  };

  const updateStaff = async (input: UpdateStaffInput) => {
    await callAdmin({ action: "update", ...input });
    await refetch();
  };

  const deleteStaff = async (user_id: string) => {
    await callAdmin({ action: "delete", user_id });
    await refetch();
  };

  return { staff, loading, error, refetch, createStaff, updateStaff, deleteStaff };
}

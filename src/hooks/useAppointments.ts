import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type DBAppointment = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];
export type AppointmentUpdate = Database["public"]["Tables"]["appointments"]["Update"];

export type AppointmentWithRelations = DBAppointment & {
  patients: { id: string; name: string } | null;
  dentists: { id: string; name: string } | null;
};

export function useAppointments() {
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("*, patients(id,name), dentists(id,name)")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });
      
    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setAppointments((data ?? []) as AppointmentWithRelations[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const checkConflict = async (
    dentistId: string,
    date: string,
    start: string,
    end: string,
    ignoreId?: string,
  ): Promise<boolean> => {
    // CORREÇÃO: Formatar para garantir os segundos e não falhar na query string
    const formattedStart = start.length === 5 ? `${start}:00` : start;
    const formattedEnd = end.length === 5 ? `${end}:00` : end;

    let q = supabase.from("appointments")
      .select("id")
      .eq("dentist_id", dentistId)
      .eq("date", date)
      .neq("status", "cancelled")
      .lt("start_time", formattedEnd)
      .gt("end_time", formattedStart);
      
    if (ignoreId) q = q.neq("id", ignoreId);
    
    const { data } = await q;
    return (data?.length ?? 0) > 0;
  };

  const addAppointment = async (a: AppointmentInsert) => {
    const { data, error } = await supabase.from("appointments").insert(a).select().single();
    if (error) throw error;
    await refetch();
    return data;
  };

  const updateAppointment = async (id: string, a: AppointmentUpdate) => {
    const { error } = await supabase.from("appointments").update(a).eq("id", id);
    if (error) throw error;
    await refetch();
  };

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) throw error;
    await refetch();
  };

  return { appointments, loading, error, refetch, addAppointment, updateAppointment, deleteAppointment, checkConflict };
}

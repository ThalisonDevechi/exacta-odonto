import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type DBPatient = Database["public"]["Tables"]["patients"]["Row"];
export type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"];
export type PatientUpdate = Database["public"]["Tables"]["patients"]["Update"];

export function usePatients() {
  const [patients, setPatients] = useState<DBPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .order("name", { ascending: true });
    if (error) setError(error.message);
    else setPatients(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const addPatient = async (p: PatientInsert) => {
    const { data, error } = await supabase.from("patients").insert(p).select().single();
    if (error) throw error;
    await refetch();
    return data;
  };

  const updatePatient = async (id: string, p: PatientUpdate) => {
    const { error } = await supabase.from("patients").update(p).eq("id", id);
    if (error) throw error;
    await refetch();
  };

  const inactivatePatient = async (id: string) => {
    await updatePatient(id, { status: "inactive" });
  };

  return { patients, loading, error, refetch, addPatient, updatePatient, inactivatePatient };
}

export function usePatient(id: string | undefined) {
  const [patient, setPatient] = useState<DBPatient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    supabase.from("patients").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setPatient(data);
      setLoading(false);
    });
  }, [id]);

  return { patient, loading };
}

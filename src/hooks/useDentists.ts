import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type DBDentist = Database["public"]["Tables"]["dentists"]["Row"];

export function useDentists() {
  const [dentists, setDentists] = useState<DBDentist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("dentists").select("*").eq("status", "active").order("name").then(({ data }) => {
      setDentists(data ?? []);
      setLoading(false);
    });
  }, []);

  return { dentists, loading };
}

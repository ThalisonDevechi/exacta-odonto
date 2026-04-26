import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ClinicSettings = Database["public"]["Tables"]["clinic_settings"]["Row"];
export type ClinicSettingsInsert = Database["public"]["Tables"]["clinic_settings"]["Insert"];
export type ClinicSettingsUpdate = Database["public"]["Tables"]["clinic_settings"]["Update"];

const BUCKET = "clinic-assets";

export const clinicSettingsService = {
  async get(): Promise<ClinicSettings | null> {
    const { data, error } = await supabase
      .from("clinic_settings")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsert(payload: ClinicSettingsInsert | ClinicSettingsUpdate, id?: string): Promise<ClinicSettings> {
    if (id) {
      const { data, error } = await supabase
        .from("clinic_settings")
        .update(payload as ClinicSettingsUpdate)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await supabase
      .from("clinic_settings")
      .insert(payload as ClinicSettingsInsert)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async uploadLogo(file: File): Promise<{ path: string; publicUrl: string }> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
  },

  async removeLogo(path: string): Promise<void> {
    if (!path) return;
    await supabase.storage.from(BUCKET).remove([path]);
  },
};

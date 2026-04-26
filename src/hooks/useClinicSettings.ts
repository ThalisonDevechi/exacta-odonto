import { useCallback, useEffect, useState } from "react";
import { clinicSettingsService, type ClinicSettings, type ClinicSettingsInsert, type ClinicSettingsUpdate } from "@/services/clinicSettingsService";
import { logAudit } from "@/lib/audit";

export function useClinicSettings() {
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clinicSettingsService.get();
      setSettings(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar configurações.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const save = useCallback(async (payload: ClinicSettingsInsert | ClinicSettingsUpdate) => {
    const updated = await clinicSettingsService.upsert(payload, settings?.id);
    await logAudit("clinic_settings.update", "clinic_settings", updated.id, { clinic_name: updated.clinic_name });
    setSettings(updated);
    return updated;
  }, [settings?.id]);

  const uploadLogo = useCallback(async (file: File) => {
    if (!settings?.id) throw new Error("Salve as configurações antes de enviar a logo.");
    const { path, publicUrl } = await clinicSettingsService.uploadLogo(file);
    if (settings.logo_path && settings.logo_path !== path) {
      await clinicSettingsService.removeLogo(settings.logo_path);
    }
    const updated = await clinicSettingsService.upsert({ logo_path: path, logo_url: publicUrl }, settings.id);
    await logAudit("clinic_settings.logo_upload", "clinic_settings", settings.id, { path });
    setSettings(updated);
    return updated;
  }, [settings]);

  const removeLogo = useCallback(async () => {
    if (!settings?.id || !settings.logo_path) return;
    await clinicSettingsService.removeLogo(settings.logo_path);
    const updated = await clinicSettingsService.upsert({ logo_path: null, logo_url: null }, settings.id);
    await logAudit("clinic_settings.logo_remove", "clinic_settings", settings.id);
    setSettings(updated);
  }, [settings]);

  return { settings, loading, error, refetch, save, uploadLogo, removeLogo };
}

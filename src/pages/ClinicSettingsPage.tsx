import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth-context";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Trash2, ImageOff, QrCode, PowerOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Navigate, useSearchParams } from "react-router-dom";

const empty = {
  clinic_name: "", trade_name: "", cnpj: "", phone: "", whatsapp: "", email: "",
  cep: "", address: "", number: "", district: "", city: "", state: "",
  responsible_name: "", responsible_cro: "", opening_hours: "",
  document_footer: "", default_budget_validity_days: 30,
};

// Componente da Aba do Bot WhatsApp
function WhatsAppBotTab() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Configurações do Docker da Evolution API rodando na sua máquina
  const API_URL = "https://pierce-clinic-combat-finance.trycloudflare.com";
  const API_KEY = "exacta123";
  const INSTANCE_NAME = "exacta_bot";

  const generateQRCode = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/instance/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": API_KEY,
        },
        body: JSON.stringify({
          instanceName: INSTANCE_NAME,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });

      const data = await response.json();
      
      if (data.qrcode && data.qrcode.base64) {
        setQrCode(data.qrcode.base64);
        toast.success("QR Code Gerado", {
          description: "Abra o WhatsApp do celular da clínica e leia o código.",
        });
      } else if (data.instance?.status === "open") {
        toast.info("Já conectado!", {
          description: "O WhatsApp da clínica já está pareado com o sistema.",
        });
      }
    } catch (error) {
      toast.error("Erro de Conexão", {
        description: "Verifique se o Docker da Evolution API está rodando na porta 8080.",
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnectBot = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/instance/logout/${INSTANCE_NAME}`, {
        method: "DELETE",
        headers: { "apikey": API_KEY },
      });
      setQrCode(null);
      toast.success("Desconectado", {
        description: "O bot foi desconectado do WhatsApp com sucesso.",
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao desconectar o bot.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Conexão com WhatsApp</CardTitle>
        <CardDescription>
          Conecte o celular da clínica para habilitar a inteligência artificial, envios automáticos e botões de confirmação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!qrCode ? (
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-slate-50">
            <QrCode className="w-12 h-12 text-slate-400 mb-4" />
            <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
              Ao gerar o QR Code, o servidor local será iniciado. Leia com o aplicativo do WhatsApp na seção "Aparelhos Conectados".
            </p>
            <Button onClick={generateQRCode} disabled={loading} size="lg">
              {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
              Gerar QR Code de Conexão
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 space-y-6">
            <div className="p-4 bg-white border rounded-xl shadow-sm">
              <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
            </div>
            <p className="text-sm font-medium text-blue-600 animate-pulse">Aguardando leitura do celular da clínica...</p>
            <Button variant="destructive" onClick={disconnectBot} disabled={loading}>
              <PowerOff className="mr-2 h-4 w-4" />
              Cancelar / Desconectar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClinicSettingsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "general";
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };
  const isAdmin = user?.role === "admin";
  const canView = isAdmin || user?.role === "dentist" || user?.role === "receptionist" || user?.role === "assistant";
  const { settings, loading, save, uploadLogo, removeLogo } = useClinicSettings();

  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setForm({
        clinic_name: settings.clinic_name ?? "",
        trade_name: settings.trade_name ?? "",
        cnpj: settings.cnpj ?? "",
        phone: settings.phone ?? "",
        whatsapp: settings.whatsapp ?? "",
        email: settings.email ?? "",
        cep: settings.cep ?? "",
        address: settings.address ?? "",
        number: settings.number ?? "",
        district: settings.district ?? "",
        city: settings.city ?? "",
        state: settings.state ?? "",
        responsible_name: settings.responsible_name ?? "",
        responsible_cro: settings.responsible_cro ?? "",
        opening_hours: settings.opening_hours ?? "",
        document_footer: settings.document_footer ?? "",
        default_budget_validity_days: settings.default_budget_validity_days ?? 30,
      });
    }
  }, [settings]);

  if (!canView) return <Navigate to="/acesso-negado" replace />;

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    if (!form.clinic_name.trim()) return "Nome da clínica é obrigatório.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "E-mail inválido.";
    if (form.cnpj && form.cnpj.replace(/\D/g, "").length !== 14) return "CNPJ deve ter 14 dígitos.";
    if (form.whatsapp && form.whatsapp.replace(/\D/g, "").length < 10) return "WhatsApp inválido.";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      await save({
        clinic_name: form.clinic_name.trim(),
        trade_name: form.trade_name || null,
        cnpj: form.cnpj || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        cep: form.cep || null,
        address: form.address || null,
        number: form.number || null,
        district: form.district || null,
        city: form.city || null,
        state: form.state || null,
        responsible_name: form.responsible_name || null,
        responsible_cro: form.responsible_cro || null,
        opening_hours: form.opening_hours || null,
        document_footer: form.document_footer || null,
        default_budget_validity_days: Number(form.default_budget_validity_days) || 30,
        updated_by: user?.id ?? null,
      });
      toast.success("Configurações salvas.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogo = async (file: File) => {
    if (!isAdmin) return;
    setUploading(true);
    try {
      await uploadLogo(file);
      toast.success("Logo atualizada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar logo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    if (!isAdmin) return;
    try {
      await removeLogo();
      toast.success("Logo removida.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover.");
    }
  };

  const disabled = !isAdmin;

  return (
    <AppLayout>
      <PageHeader title="Configurações da Clínica" description="Gerencie os dados da clínica e a conexão com o assistente virtual" />

      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
         <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">Dados Gerais</TabsTrigger>
            <TabsTrigger value="bot">Bot WhatsApp</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-1">
                <CardHeader><CardTitle className="text-base">Logo da clínica</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="aspect-square w-full max-w-[220px] mx-auto rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
                    {settings?.logo_url ? (
                      <img src={settings.logo_url} alt="Logo" className="object-contain w-full h-full" />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground">
                        <ImageOff className="h-8 w-8 mb-2" />
                        <span className="text-xs">Sem logo</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleLogo(e.target.files[0])}
                  />
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      disabled={disabled || uploading || !settings?.id}
                      onClick={() => fileRef.current?.click()}
                      title={!settings?.id ? "Salve as configurações antes de enviar a logo." : ""}
                    >
                      <Upload className="h-4 w-4 mr-1.5" /> {uploading ? "Enviando..." : settings?.logo_url ? "Substituir logo" : "Enviar logo"}
                    </Button>
                    {settings?.logo_url && (
                      <Button variant="ghost" disabled={disabled} onClick={handleRemoveLogo} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-1.5" /> Remover logo
                      </Button>
                    )}
                  </div>
                  {!settings?.id && (
                    <p className="text-xs text-muted-foreground">Salve os dados primeiro para habilitar o upload da logo.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-base">Dados gerais</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Nome da clínica *</Label>
                      <Input value={form.clinic_name} disabled={disabled} onChange={(e) => set("clinic_name", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Nome fantasia</Label>
                      <Input value={form.trade_name} disabled={disabled} onChange={(e) => set("trade_name", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>CNPJ</Label>
                      <Input value={form.cnpj} disabled={disabled} onChange={(e) => set("cnpj", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>E-mail</Label>
                      <Input type="email" value={form.email} disabled={disabled} onChange={(e) => set("email", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Telefone</Label>
                      <Input value={form.phone} disabled={disabled} onChange={(e) => set("phone", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>WhatsApp</Label>
                      <Input value={form.whatsapp} disabled={disabled} onChange={(e) => set("whatsapp", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Responsável técnico</Label>
                      <Input value={form.responsible_name} disabled={disabled} onChange={(e) => set("responsible_name", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>CRO do responsável</Label>
                      <Input value={form.responsible_cro} disabled={disabled} onChange={(e) => set("responsible_cro", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Horário de funcionamento</Label>
                      <Input value={form.opening_hours} disabled={disabled} onChange={(e) => set("opening_hours", e.target.value)} placeholder="Seg-Sex 8h-18h" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Validade padrão do orçamento (dias)</Label>
                      <Input type="number" min={1} value={form.default_budget_validity_days} disabled={disabled}
                        onChange={(e) => set("default_budget_validity_days", Number(e.target.value))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5 md:col-span-1">
                      <Label>CEP</Label>
                      <Input value={form.cep} disabled={disabled} onChange={(e) => set("cep", e.target.value)} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Endereço</Label>
                      <Input value={form.address} disabled={disabled} onChange={(e) => set("address", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Número</Label>
                      <Input value={form.number} disabled={disabled} onChange={(e) => set("number", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Bairro</Label>
                      <Input value={form.district} disabled={disabled} onChange={(e) => set("district", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Cidade</Label>
                      <Input value={form.city} disabled={disabled} onChange={(e) => set("city", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Estado</Label>
                      <Input value={form.state} disabled={disabled} onChange={(e) => set("state", e.target.value)} maxLength={2} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Rodapé padrão dos documentos</Label>
                    <Textarea value={form.document_footer} disabled={disabled} onChange={(e) => set("document_footer", e.target.value)} rows={3}
                      placeholder="Ex.: Documento gerado eletronicamente por Exacta Odonto." />
                  </div>

                  {isAdmin ? (
                    <div className="flex justify-end pt-2">
                      <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar configurações"}</Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Somente administrador pode editar.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bot">
            <WhatsAppBotTab />
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
}

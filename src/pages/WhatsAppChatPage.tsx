import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { usePatients } from "@/hooks/usePatients";
import { useWhatsAppMessages } from "@/hooks/useWhatsAppMessage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Send, Bot, User, QrCode, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function WhatsAppChatPage() {
  const navigate = useNavigate();
  const { user } = useAuth(); // Pega o usuário logado para carimbar as mensagens
  const { patients, loading: loadingPatients } = usePatients();
  
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState("");
  const [togglingBot, setTogglingBot] = useState(false);

  const { messages, sendMessage } = useWhatsAppMessages(selectedPatientId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Rola para a última mensagem automaticamente
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Checa a conexão com a Evolution API
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const API_URL = import.meta.env.VITE_EVOLUTION_API_URL;
        const res = await fetch(`${API_URL}/instance/connectionState/exacta_bot`, {
          headers: { apikey: "exacta123" }
        });
        const data = await res.json();
        setIsConnected(data?.instance?.state === "open");
      } catch (error) {
        setIsConnected(false);
      }
    };
    checkConnection();
  }, []);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.phone && p.phone.includes(searchTerm))
  );

  const handleToggleBot = async (checked: boolean) => {
    if (!selectedPatient) return;
    setTogglingBot(true);
    try {
      const { error } = await (supabase as any)
        .from("patients")
        .update({ bot_enabled: checked })
        .eq("id", selectedPatient.id);
      
      if (error) throw error;
      (selectedPatient as any).bot_enabled = checked; 
      toast.success(checked ? "IA ativada para este paciente." : "Bot pausado! Você assumiu a conversa.");
    } catch (e) {
      toast.error("Erro ao alterar IA.");
    } finally {
      setTogglingBot(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user) return;
    try {
      // Envia a mensagem passando o ID e o Nome do profissional logado
      await sendMessage(messageText, user.id, user.name);
      setMessageText("");
      // PRÓXIMO PASSO: Configurar o n8n para enviar a mensagem física pro zap
    } catch (error) {
      toast.error("Erro ao salvar mensagem.");
    }
  };

  if (isConnected === null || loadingPatients) {
    return <AppLayout><Skeleton className="w-full h-[80vh] rounded-xl" /></AppLayout>;
  }

  if (!isConnected) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[80vh] space-y-6">
          <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4">
            <MessageCircle className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">WhatsApp Desconectado</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Para acessar a central de mensagens, você precisa ler o QR Code com o celular da clínica primeiro.
          </p>
          <Button size="lg" onClick={() => navigate("/configuracoes?tab=bot")}>
            <QrCode className="mr-2 h-5 w-5" />
            Ir para Configurações Conectar
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Card className="flex h-[85vh] overflow-hidden border-border bg-surface">
        
        {/* COLUNA ESQUERDA */}
        <div className="w-80 border-r border-border flex flex-col bg-slate-50/50">
          <div className="p-4 border-b border-border bg-surface">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <MessageCircle className="text-emerald-500 h-5 w-5" /> Mensagens
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar paciente..." 
                className="pl-9 bg-white" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredPatients.map(patient => (
              <div 
                key={patient.id}
                onClick={() => setSelectedPatientId(patient.id)}
                className={`p-4 border-b border-border cursor-pointer transition-colors hover:bg-slate-100 ${selectedPatientId === patient.id ? 'bg-slate-100 border-l-4 border-l-emerald-500' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-sm truncate pr-2">{patient.name}</h3>
                  {(patient as any).bot_enabled !== false && <Bot className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">{patient.phone || "Sem número"}</p>
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div className="flex-1 flex flex-col bg-[#efeae2]">
          {selectedPatient ? (
            <>
              {/* HEADER DO CHAT */}
              <div className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedPatient.name}</h3>
                    <p className="text-xs text-muted-foreground">{selectedPatient.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-border">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-foreground">Assistente IA</span>
                    <span className="text-[10px] text-muted-foreground">
                      {(selectedPatient as any).bot_enabled !== false ? "Respondendo" : "Pausado"}
                    </span>
                  </div>
                  <Switch 
                    checked={(selectedPatient as any).bot_enabled !== false} 
                    onCheckedChange={handleToggleBot}
                    disabled={togglingBot}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </div>

              {/* LISTA DE MENSAGENS */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex justify-center mb-6">
                  <span className="text-xs bg-white/60 px-3 py-1 rounded-md text-slate-500 shadow-sm backdrop-blur-sm">
                    Início do histórico com o paciente
                  </span>
                </div>
                
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-3 rounded-lg max-w-md shadow-sm border ${
                        msg.direction === 'outbound' 
                        ? 'bg-emerald-100 border-emerald-200 rounded-tr-none' 
                        : 'bg-white border-slate-100 rounded-tl-none'
                      }`}>
                        
                        {/* IDENTIFICADOR DO REMETENTE */}
                        {msg.direction === 'outbound' && (
                          <div className="flex items-center gap-1 mb-1 border-b border-emerald-200/50 pb-1">
                            {msg.sender_type === 'bot' ? (
                              <><Bot className="h-3 w-3 text-emerald-600" /> <span className="text-[10px] font-bold text-emerald-700 uppercase">Assistente IA</span></>
                            ) : (
                              <><User className="h-3 w-3 text-emerald-600" /> <span className="text-[10px] font-bold text-emerald-700 uppercase">{msg.sender_name || 'Equipe'}</span></>
                            )}
                          </div>
                        )}
                        
                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{msg.content}</p>
                        <span className="text-[10px] text-slate-500 mt-2 block text-right">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* INPUT DE ENVIO */}
              <div className="p-4 bg-surface border-t border-border flex items-center gap-2">
                <Input 
                  placeholder={((selectedPatient as any).bot_enabled !== false) ? "O bot está ativo. Desative para assumir a conversa..." : "Digite sua mensagem..."}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 bg-slate-50"
                  disabled={(selectedPatient as any).bot_enabled !== false}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!messageText.trim() || ((selectedPatient as any).bot_enabled !== false)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-50">
              <MessageCircle className="h-16 w-16 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">Nenhum chat selecionado</h3>
              <p className="text-sm text-slate-500">Selecione um paciente na lista para visualizar as mensagens.</p>
            </div>
          )}
        </div>
      </Card>
    </AppLayout>
  );
}

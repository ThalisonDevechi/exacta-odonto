import { useEffect, useState } from "react";
import { useOdontogram, DBTooth } from "@/hooks/useOdontogram";
import { useAuth } from "@/lib/auth-context";
import {
  DENTITION_LABELS, DentitionType, teethForDentition, suggestDentition,
  TOOTH_STATUS_LABELS, TOOTH_STATUS_COLORS, ToothStatus,
  FACE_LABELS, FaceType, FACE_CONDITION_LABELS, FaceCondition,
  quadrantOf,
} from "@/lib/dentition";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Smile, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  patientId: string;
  patientName: string;
  birthDate: string;
}

function ToothBox({ number, tooth, onClick, readOnly }: { number: number; tooth?: DBTooth; onClick: () => void; readOnly: boolean }) {
  const status: ToothStatus = (tooth?.status as ToothStatus) ?? "integro";
  const color = TOOTH_STATUS_COLORS[status];
  const isAbsent = status === "ausente" || status === "extraido";
  return (
    <button
      onClick={readOnly ? undefined : onClick}
      className={`flex flex-col items-center gap-0.5 p-0.5 rounded transition ${readOnly ? "cursor-default" : "cursor-pointer hover:bg-muted"}`}
      title={`Dente ${number}: ${TOOTH_STATUS_LABELS[status]}`}
    >
      <svg width="26" height="32" viewBox="0 0 26 32" className={isAbsent ? "opacity-40" : ""}>
        <rect x="2" y="2" width="22" height="28" rx="3" fill={status === "integro" ? "transparent" : color} stroke={color} strokeWidth="1.5" opacity={status === "integro" ? 1 : 0.65} />
        {isAbsent && (
          <>
            <line x1="4" y1="4" x2="22" y2="28" stroke={color} strokeWidth="2" />
            <line x1="22" y1="4" x2="4" y2="28" stroke={color} strokeWidth="2" />
          </>
        )}
      </svg>
      <span className="text-[9px] font-medium text-muted-foreground">{number}</span>
    </button>
  );
}

export function PersistentOdontogram({ patientId, patientName, birthDate }: Props) {
  const { user } = useAuth();
  const { data, loading, ensureOdontogram, changeDentitionType, upsertTooth, upsertFace } = useOdontogram(patientId, birthDate);

  const canEdit = user && (user.role === "admin" || user.role === "dentist");
  const canAddNotes = user && (user.role === "admin" || user.role === "dentist" || user.role === "assistant");

  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<ToothStatus>("integro");
  const [editObs, setEditObs] = useState("");
  const [faceEdits, setFaceEdits] = useState<Record<FaceType, { condition: FaceCondition; planned: string; performed: string; obs: string }>>({} as never);
  const [saving, setSaving] = useState(false);

  const [dentitionDialog, setDentitionDialog] = useState(false);
  const [newDentition, setNewDentition] = useState<DentitionType>("permanent");
  const [dentitionReason, setDentitionReason] = useState("");

  useEffect(() => {
    if (!loading && !data.odontogram && canEdit) {
      ensureOdontogram(user?.id).catch(e => toast.error(e?.message ?? "Erro ao criar odontograma."));
    }
  }, [loading, data.odontogram, canEdit, ensureOdontogram, user?.id]);

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!data.odontogram) {
    return (
      <div className="text-center py-12 space-y-4">
        <Smile className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Odontograma ainda não inicializado.</p>
        {canEdit && <Button onClick={() => ensureOdontogram(user?.id)}>Inicializar odontograma</Button>}
      </div>
    );
  }

  const dentition = data.odontogram.dentition_type as DentitionType;
  const teethNumbers = teethForDentition(dentition);
  const suggested = suggestDentition(birthDate);
  const toothByNumber = (n: number) => data.teeth.find(t => t.tooth_number === n);

  const quadrants: Record<number, number[]> = {};
  teethNumbers.forEach(n => { const q = quadrantOf(n); (quadrants[q] = quadrants[q] || []).push(n); });
  const upperLeft = quadrants[1]?.slice().sort((a, b) => b - a) ?? [];
  const upperRight = quadrants[2]?.slice().sort((a, b) => a - b) ?? [];
  const lowerLeft = quadrants[4]?.slice().sort((a, b) => b - a) ?? [];
  const lowerRight = quadrants[3]?.slice().sort((a, b) => a - b) ?? [];
  const decUL = quadrants[5]?.slice().sort((a, b) => b - a) ?? [];
  const decUR = quadrants[6]?.slice().sort((a, b) => a - b) ?? [];
  const decLL = quadrants[8]?.slice().sort((a, b) => b - a) ?? [];
  const decLR = quadrants[7]?.slice().sort((a, b) => a - b) ?? [];

  const openTooth = (n: number) => {
    const t = toothByNumber(n);
    setSelectedNumber(n);
    setEditStatus((t?.status as ToothStatus) ?? "integro");
    setEditObs(t?.observation ?? "");
    const initFaces: Record<string, { condition: FaceCondition; planned: string; performed: string; obs: string }> = {};
    if (t) {
      data.faces.filter(f => f.tooth_id === t.id).forEach(f => {
        initFaces[f.face] = {
          condition: f.condition as FaceCondition,
          planned: f.planned_procedure ?? "",
          performed: f.performed_procedure ?? "",
          obs: f.observation ?? "",
        };
      });
    }
    setFaceEdits(initFaces as never);
  };

  const handleSaveTooth = async () => {
    if (selectedNumber === null) return;
    setSaving(true);
    try {
      const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
      if (selectedNumber >= 51 && age > 14 && editStatus !== "integro") {
        const ok = window.confirm("Marcar dente decíduo em paciente adulto exige justificativa. Deseja continuar?");
        if (!ok) { setSaving(false); return; }
      }
      await upsertTooth(selectedNumber, { status: editStatus, observation: editObs || null }, user?.id);
      // Look up the persisted tooth id directly to ensure faces target the correct row
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: freshTooth } = await supabase
        .from("odontogram_teeth")
        .select("id")
        .eq("odontogram_id", data.odontogram!.id)
        .eq("tooth_number", selectedNumber)
        .maybeSingle();
      const toothId = freshTooth?.id;
      if (toothId) {
        for (const [face, vals] of Object.entries(faceEdits)) {
          await upsertFace(toothId, face as FaceType, {
            condition: vals.condition,
            planned_procedure: vals.planned || null,
            performed_procedure: vals.performed || null,
            observation: vals.obs || null,
          }, user?.id);
        }
      }
      toast.success(`Dente ${selectedNumber} atualizado.`);
      setSelectedNumber(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar dente.");
    } finally { setSaving(false); }
  };

  const handleChangeDentition = async () => {
    if (newDentition === dentition) { setDentitionDialog(false); return; }
    if (!dentitionReason.trim()) { toast.error("Informe a justificativa."); return; }
    try {
      await changeDentitionType(newDentition, dentitionReason.trim(), user?.id);
      toast.success("Tipo de dentição atualizado.");
      setDentitionDialog(false); setDentitionReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro.");
    }
  };

  const renderRow = (nums: number[]) => (
    <div className="flex gap-0.5">
      {nums.map(n => <ToothBox key={n} number={n} tooth={toothByNumber(n)} onClick={() => openTooth(n)} readOnly={!canEdit} />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Odontograma — {patientName}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">Dentição: {DENTITION_LABELS[dentition]}</Badge>
            {data.odontogram.manually_changed && <Badge variant="outline">Alterada manualmente</Badge>}
            {suggested !== dentition && (
              <Badge variant="outline" className="gap-1 text-warning">
                <AlertTriangle className="h-3 w-3" /> Sugestão por idade: {DENTITION_LABELS[suggested]}
              </Badge>
            )}
          </div>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => { setNewDentition(dentition); setDentitionDialog(true); }}>
            Alterar dentição
          </Button>
        )}
      </div>

      <div className="rounded-xl bg-surface shadow-card p-4 space-y-3 overflow-x-auto">
        {(dentition === "permanent" || dentition === "mixed") && (
          <>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center font-semibold">Permanentes — Superior</p>
            <div className="flex justify-center gap-2 min-w-[520px]">{renderRow(upperLeft)}<div className="w-px bg-border" />{renderRow(upperRight)}</div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center font-semibold">Permanentes — Inferior</p>
            <div className="flex justify-center gap-2 min-w-[520px]">{renderRow(lowerLeft)}<div className="w-px bg-border" />{renderRow(lowerRight)}</div>
          </>
        )}
        {(dentition === "deciduous" || dentition === "mixed") && (
          <>
            <div className="h-px bg-border my-1" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center font-semibold">Decíduos — Superior</p>
            <div className="flex justify-center gap-2 min-w-[320px]">{renderRow(decUL)}<div className="w-px bg-border" />{renderRow(decUR)}</div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-center font-semibold">Decíduos — Inferior</p>
            <div className="flex justify-center gap-2 min-w-[320px]">{renderRow(decLL)}<div className="w-px bg-border" />{renderRow(decLR)}</div>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.entries(TOOTH_STATUS_LABELS) as [ToothStatus, string][]).map(([k, l]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: TOOTH_STATUS_COLORS[k] }} />
            <span className="text-[10px] text-muted-foreground">{l}</span>
          </div>
        ))}
      </div>

      <Dialog open={selectedNumber !== null} onOpenChange={() => setSelectedNumber(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Dente {selectedNumber}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Status geral</Label>
              <Select value={editStatus} onValueChange={v => setEditStatus(v as ToothStatus)} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(TOOTH_STATUS_LABELS) as [ToothStatus, string][]).map(([k, l]) => (
                    <SelectItem key={k} value={k}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: TOOTH_STATUS_COLORS[k] }} />
                        {l}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Observação geral</Label>
              <Textarea rows={2} value={editObs} onChange={e => setEditObs(e.target.value)} disabled={!canEdit && !canAddNotes} />
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Faces</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.entries(FACE_LABELS) as [FaceType, string][]).map(([face, label]) => {
                  const cur = faceEdits[face] ?? { condition: "normal" as FaceCondition, planned: "", performed: "", obs: "" };
                  return (
                    <div key={face} className="rounded-md border border-border p-2.5 space-y-2">
                      <p className="text-xs font-semibold">{label}</p>
                      <Select
                        value={cur.condition}
                        onValueChange={v => setFaceEdits(prev => ({ ...prev, [face]: { ...cur, condition: v as FaceCondition } }) as never)}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.entries(FACE_CONDITION_LABELS) as [FaceCondition, string][]).map(([k, l]) => (
                            <SelectItem key={k} value={k}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input className="h-7 text-xs" placeholder="Planejado" value={cur.planned}
                        onChange={e => setFaceEdits(prev => ({ ...prev, [face]: { ...cur, planned: e.target.value } }) as never)}
                        disabled={!canEdit} />
                      <Input className="h-7 text-xs" placeholder="Realizado" value={cur.performed}
                        onChange={e => setFaceEdits(prev => ({ ...prev, [face]: { ...cur, performed: e.target.value } }) as never)}
                        disabled={!canEdit} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setSelectedNumber(null)}>Fechar</Button>
              {canEdit && (
                <Button onClick={handleSaveTooth} disabled={saving}>
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Salvar
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dentitionDialog} onOpenChange={setDentitionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alterar tipo de dentição</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Sugestão por idade: <strong>{DENTITION_LABELS[suggested]}</strong></p>
            <div className="space-y-1.5">
              <Label>Novo tipo</Label>
              <Select value={newDentition} onValueChange={v => setNewDentition(v as DentitionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(DENTITION_LABELS) as [DentitionType, string][]).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Justificativa <span className="text-destructive">*</span></Label>
              <Textarea rows={3} value={dentitionReason} onChange={e => setDentitionReason(e.target.value)} placeholder="Ex: troca dentária em andamento, caso clínico atípico..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDentitionDialog(false)}>Cancelar</Button>
              <Button onClick={handleChangeDentition}>Confirmar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

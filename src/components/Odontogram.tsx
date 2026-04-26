import { useState } from "react";
import { ToothRecord, ToothCondition, ToothFace, TOOTH_CONDITION_LABELS, TOOTH_CONDITION_COLORS, TOOTH_FACE_LABELS } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// Adult teeth numbering (FDI)
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];

const ALL_TEETH = [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_LEFT, ...LOWER_RIGHT];

interface OdontogramProps {
  teeth: ToothRecord[];
  onUpdateTooth: (tooth: ToothRecord) => void;
  readOnly?: boolean;
  patientName?: string;
}

function ToothDiagram({ number, record, onClick, readOnly }: {
  number: number;
  record?: ToothRecord;
  onClick: () => void;
  readOnly?: boolean;
}) {
  const condition = record?.condition ?? "higido";
  const color = TOOTH_CONDITION_COLORS[condition];
  const isAbsent = condition === "ausente";

  return (
    <button
      onClick={readOnly ? undefined : onClick}
      className={`flex flex-col items-center gap-1 p-1 rounded-lg transition-all duration-150 ${readOnly ? "cursor-default" : "cursor-pointer hover:bg-muted"}`}
      title={`Dente ${number}: ${TOOTH_CONDITION_LABELS[condition]}`}
    >
      {/* 5-face tooth diagram */}
      <svg width="32" height="32" viewBox="0 0 36 36" className={`shrink-0 ${isAbsent ? "opacity-30" : ""}`}>
        {/* Outer square = vestibular/lingual */}
        <rect x="2" y="2" width="32" height="32" rx="4" fill="none" stroke={color} strokeWidth="1.5" />
        {/* Top = vestibular */}
        <polygon
          points="2,2 34,2 26,10 10,10"
          fill={record?.faces?.includes("vestibular") ? color : "transparent"}
          stroke={color}
          strokeWidth="0.8"
          opacity={record?.faces?.includes("vestibular") ? 0.6 : 0.2}
        />
        {/* Bottom = lingual */}
        <polygon
          points="2,34 34,34 26,26 10,26"
          fill={record?.faces?.includes("lingual") ? color : "transparent"}
          stroke={color}
          strokeWidth="0.8"
          opacity={record?.faces?.includes("lingual") ? 0.6 : 0.2}
        />
        {/* Left = mesial */}
        <polygon
          points="2,2 2,34 10,26 10,10"
          fill={record?.faces?.includes("mesial") ? color : "transparent"}
          stroke={color}
          strokeWidth="0.8"
          opacity={record?.faces?.includes("mesial") ? 0.6 : 0.2}
        />
        {/* Right = distal */}
        <polygon
          points="34,2 34,34 26,26 26,10"
          fill={record?.faces?.includes("distal") ? color : "transparent"}
          stroke={color}
          strokeWidth="0.8"
          opacity={record?.faces?.includes("distal") ? 0.6 : 0.2}
        />
        {/* Center = oclusal */}
        <rect
          x="10" y="10" width="16" height="16" rx="2"
          fill={record?.faces?.includes("oclusal") ? color : "transparent"}
          stroke={color}
          strokeWidth="0.8"
          opacity={record?.faces?.includes("oclusal") ? 0.7 : 0.2}
        />
        {/* X for absent */}
        {isAbsent && (
          <>
            <line x1="6" y1="6" x2="30" y2="30" stroke={color} strokeWidth="2" />
            <line x1="30" y1="6" x2="6" y2="30" stroke={color} strokeWidth="2" />
          </>
        )}
      </svg>
      <span className="text-[10px] font-medium text-muted-foreground">{number}</span>
    </button>
  );
}

export function Odontogram({ teeth, onUpdateTooth, readOnly = false, patientName }: OdontogramProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [editCondition, setEditCondition] = useState<ToothCondition>("higido");
  const [editFaces, setEditFaces] = useState<ToothFace[]>([]);
  const [editPlanned, setEditPlanned] = useState("");
  const [editPerformed, setEditPerformed] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const getRecord = (num: number) => teeth.find(t => t.toothNumber === num);

  const openTooth = (num: number) => {
    const rec = getRecord(num);
    setSelectedTooth(num);
    setEditCondition(rec?.condition ?? "higido");
    setEditFaces(rec?.faces ?? []);
    setEditPlanned(rec?.plannedProcedure ?? "");
    setEditPerformed(rec?.performedProcedure ?? "");
    setEditNotes(rec?.notes ?? "");
  };

  const handleSaveTooth = () => {
    if (selectedTooth === null) return;
    onUpdateTooth({
      toothNumber: selectedTooth,
      condition: editCondition,
      faces: editFaces,
      plannedProcedure: editPlanned || undefined,
      performedProcedure: editPerformed || undefined,
      notes: editNotes || undefined,
      updatedAt: new Date().toISOString(),
      updatedBy: "",
    });
    toast.success(`Dente ${selectedTooth} atualizado`);
    setSelectedTooth(null);
  };

  const toggleFace = (face: ToothFace) => {
    setEditFaces(prev => prev.includes(face) ? prev.filter(f => f !== face) : [...prev, face]);
  };

  const renderRow = (toothNumbers: number[], label: string) => (
    <div className="flex items-center gap-0.5 shrink-0">
      <span className="text-[9px] font-semibold text-muted-foreground w-5 text-right mr-0.5">{label}</span>
      {toothNumbers.map(num => (
        <ToothDiagram key={num} number={num} record={getRecord(num)} onClick={() => openTooth(num)} readOnly={readOnly} />
      ))}
    </div>
  );

  // Legend
  const usedConditions = new Set(teeth.map(t => t.condition));
  usedConditions.add("higido");

  return (
    <div className="space-y-4" id="odontogram-print">
      {patientName && <h3 className="text-sm font-semibold text-foreground">Odontograma — {patientName}</h3>}

      <div className="rounded-xl bg-surface shadow-card p-3 sm:p-4 space-y-3 overflow-x-auto">
        {/* Upper arch */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Arcada Superior</p>
          <div className="flex justify-start sm:justify-center gap-0 min-w-[580px]">
            {renderRow(UPPER_RIGHT, "1°Q")}
            <div className="w-px bg-border mx-0.5" />
            {renderRow(UPPER_LEFT, "")}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Lower arch */}
        <div className="space-y-1">
          <div className="flex justify-start sm:justify-center gap-0 min-w-[580px]">
            {renderRow(LOWER_RIGHT, "")}
            <div className="w-px bg-border mx-0.5" />
            {renderRow(LOWER_LEFT, "4°Q")}
          </div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Arcada Inferior</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(TOOTH_CONDITION_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: TOOTH_CONDITION_COLORS[key as ToothCondition] }} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={selectedTooth !== null} onOpenChange={() => setSelectedTooth(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dente {selectedTooth}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Condição Clínica</Label>
              <Select value={editCondition} onValueChange={v => setEditCondition(v as ToothCondition)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TOOTH_CONDITION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: TOOTH_CONDITION_COLORS[k as ToothCondition] }} />
                        {v}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Faces Afetadas</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(TOOTH_FACE_LABELS) as [ToothFace, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={editFaces.includes(key)} onCheckedChange={() => toggleFace(key)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Procedimento Planejado</Label>
              <Input value={editPlanned} onChange={e => setEditPlanned(e.target.value)} placeholder="Ex: Restauração em resina" />
            </div>

            <div className="space-y-2">
              <Label>Procedimento Realizado</Label>
              <Input value={editPerformed} onChange={e => setEditPerformed(e.target.value)} placeholder="Ex: Restauração concluída" />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedTooth(null)}>Cancelar</Button>
              <Button onClick={handleSaveTooth}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

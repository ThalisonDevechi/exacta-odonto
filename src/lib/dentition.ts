import { calculateAge } from "@/lib/cpf";

export type DentitionType = "deciduous" | "mixed" | "permanent";

export const DENTITION_LABELS: Record<DentitionType, string> = {
  deciduous: "Decídua",
  mixed: "Mista",
  permanent: "Permanente",
};

export function suggestDentition(birthDate: string): DentitionType {
  const age = calculateAge(birthDate);
  if (age <= 5) return "deciduous";
  if (age <= 12) return "mixed";
  return "permanent";
}

// FDI numbering
export const PERMANENT_TEETH = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

export const DECIDUOUS_TEETH = [
  55, 54, 53, 52, 51, 61, 62, 63, 64, 65,
  85, 84, 83, 82, 81, 71, 72, 73, 74, 75,
];

export function teethForDentition(d: DentitionType): number[] {
  if (d === "deciduous") return DECIDUOUS_TEETH;
  if (d === "permanent") return PERMANENT_TEETH;
  return [...PERMANENT_TEETH, ...DECIDUOUS_TEETH];
}

export function quadrantOf(toothNumber: number): number {
  return Math.floor(toothNumber / 10);
}

export function kindOf(toothNumber: number): "deciduous" | "permanent" {
  const q = quadrantOf(toothNumber);
  return q >= 5 && q <= 8 ? "deciduous" : "permanent";
}

export type ToothStatus =
  | "integro" | "cariado" | "restaurado" | "ausente" | "extraido"
  | "indicado_para_extracao" | "tratamento_endodontico" | "coroa" | "implante"
  | "protese" | "selante" | "fraturado" | "incluso" | "em_erupcao"
  | "nao_erupcionado" | "mobilidade" | "outro";

export const TOOTH_STATUS_LABELS: Record<ToothStatus, string> = {
  integro: "Íntegro",
  cariado: "Cariado",
  restaurado: "Restaurado",
  ausente: "Ausente",
  extraido: "Extraído",
  indicado_para_extracao: "Indicado p/ Extração",
  tratamento_endodontico: "Tratamento Endodôntico",
  coroa: "Coroa",
  implante: "Implante",
  protese: "Prótese",
  selante: "Selante",
  fraturado: "Fraturado",
  incluso: "Incluso",
  em_erupcao: "Em Erupção",
  nao_erupcionado: "Não Erupcionado",
  mobilidade: "Mobilidade",
  outro: "Outro",
};

export const TOOTH_STATUS_COLORS: Record<ToothStatus, string> = {
  integro: "hsl(var(--success))",
  cariado: "hsl(var(--destructive))",
  restaurado: "hsl(var(--primary))",
  ausente: "hsl(var(--muted-foreground))",
  extraido: "#475569",
  indicado_para_extracao: "#F97316",
  tratamento_endodontico: "#8B5CF6",
  coroa: "#F59E0B",
  implante: "#06B6D4",
  protese: "#0EA5E9",
  selante: "#22D3EE",
  fraturado: "hsl(var(--warning))",
  incluso: "#94A3B8",
  em_erupcao: "#A3E635",
  nao_erupcionado: "#CBD5E1",
  mobilidade: "#EF4444",
  outro: "#64748B",
};

export type FaceType = "vestibular" | "lingual" | "palatina" | "mesial" | "distal" | "oclusal" | "incisal" | "cervical" | "raiz";
export const FACE_LABELS: Record<FaceType, string> = {
  vestibular: "Vestibular", lingual: "Lingual", palatina: "Palatina",
  mesial: "Mesial", distal: "Distal", oclusal: "Oclusal", incisal: "Incisal",
  cervical: "Cervical", raiz: "Raiz",
};

export type FaceCondition =
  | "normal" | "carie" | "restauracao" | "restauracao_infiltrada" | "fratura"
  | "desgaste" | "mancha" | "selante" | "tratamento_indicado" | "tratamento_realizado" | "outro";

export const FACE_CONDITION_LABELS: Record<FaceCondition, string> = {
  normal: "Normal",
  carie: "Cárie",
  restauracao: "Restauração",
  restauracao_infiltrada: "Restauração Infiltrada",
  fratura: "Fratura",
  desgaste: "Desgaste",
  mancha: "Mancha",
  selante: "Selante",
  tratamento_indicado: "Tratamento Indicado",
  tratamento_realizado: "Tratamento Realizado",
  outro: "Outro",
};

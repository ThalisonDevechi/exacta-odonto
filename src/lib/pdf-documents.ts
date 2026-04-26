import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ClinicSettings } from "@/services/clinicSettingsService";

const fmtMoney = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

const fmtDateBR = (iso?: string | null) => {
  if (!iso) return "—";
  const d = iso.includes("T") ? new Date(iso) : new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
};

/** Tries to load the clinic logo as base64; returns null on any failure. */
async function loadLogoSafe(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function getLogoFormat(dataUrl: string): "PNG" | "JPEG" | null {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG";
  return null;
}

interface HeaderResult {
  cursorY: number;
}

async function drawHeader(doc: jsPDF, clinic: ClinicSettings | null, title: string, docNumber: string | null): Promise<HeaderResult> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let cursorY = margin;
  let textX = margin;

  if (clinic?.logo_url) {
    const dataUrl = await loadLogoSafe(clinic.logo_url);
    const fmt = dataUrl ? getLogoFormat(dataUrl) : null;
    if (dataUrl && fmt) {
      try {
        doc.addImage(dataUrl, fmt, margin, cursorY, 25, 25);
        textX = margin + 30;
      } catch {
        // ignore — logo failure must not break PDF
      }
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(clinic?.clinic_name || "Clínica", textX, cursorY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  let y = cursorY + 12;
  const lineGap = 4.5;

  if (clinic?.cnpj) { doc.text(`CNPJ: ${clinic.cnpj}`, textX, y); y += lineGap; }
  const contact: string[] = [];
  if (clinic?.phone) contact.push(`Tel: ${clinic.phone}`);
  if (clinic?.whatsapp) contact.push(`WhatsApp: ${clinic.whatsapp}`);
  if (clinic?.email) contact.push(clinic.email);
  if (contact.length) { doc.text(contact.join(" · "), textX, y); y += lineGap; }
  const addrParts: string[] = [];
  if (clinic?.address) addrParts.push(`${clinic.address}${clinic.number ? `, ${clinic.number}` : ""}`);
  if (clinic?.district) addrParts.push(clinic.district);
  if (clinic?.city || clinic?.state) addrParts.push(`${clinic?.city ?? ""}${clinic?.state ? `/${clinic.state}` : ""}`.trim());
  if (addrParts.length) { doc.text(addrParts.join(" · "), textX, y); y += lineGap; }

  // Title + doc number on the right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(title, pageWidth - margin, cursorY + 6, { align: "right" });
  if (docNumber) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Nº ${docNumber}`, pageWidth - margin, cursorY + 12, { align: "right" });
  }

  cursorY = Math.max(y, cursorY + 30) + 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  return { cursorY: cursorY + 6 };
}

function drawFooter(doc: jsPDF, clinic: ClinicSettings | null) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const footerText = clinic?.document_footer || `${clinic?.clinic_name || "Clínica"} · Documento gerado em ${new Date().toLocaleString("pt-BR")}`;
  const lines = doc.splitTextToSize(footerText, pageWidth - margin * 2);
  doc.text(lines, pageWidth / 2, pageHeight - 10, { align: "center" });
}

function drawSignatureFields(doc: jsPDF, y: number, labels: [string, string]) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const colWidth = (pageWidth - margin * 2 - 10) / 2;
  doc.setDrawColor(150, 150, 150);
  doc.line(margin, y, margin + colWidth, y);
  doc.line(margin + colWidth + 10, y, pageWidth - margin, y);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(labels[0], margin + colWidth / 2, y + 5, { align: "center" });
  doc.text(labels[1], margin + colWidth + 10 + colWidth / 2, y + 5, { align: "center" });
}

// ---------- DIGITAL SIGNATURE BLOCK ----------

export interface SignaturePdfData {
  signerName: string;
  signerDocument: string;
  signedAt: string;
  /** A signed image URL fetched from Storage. May fail; the block degrades gracefully. */
  imageUrl: string | null;
}

async function loadSignatureSafe(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Draws a signature block at the given Y coordinate. If there's not enough room,
 * a new page is added and the block is drawn at the top.
 * Returns the Y position after the block.
 */
async function drawSignatureBlock(doc: jsPDF, signature: SignaturePdfData, startY: number): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const blockHeight = 55;

  let y = startY;
  if (y + blockHeight > pageHeight - 25) {
    doc.addPage();
    y = margin;
  }

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text("Assinatura digital", margin, y);
  y += 4;

  // Box
  const boxX = margin;
  const boxY = y;
  const boxW = pageWidth - margin * 2;
  const boxH = 40;
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5);

  // Try to draw the signature image
  const dataUrl = await loadSignatureSafe(signature.imageUrl);
  let imageDrawn = false;
  if (dataUrl) {
    try {
      const fmt = getLogoFormat(dataUrl) ?? "PNG";
      doc.addImage(dataUrl, fmt, boxX + 4, boxY + 4, 70, 22);
      imageDrawn = true;
    } catch {
      imageDrawn = false;
    }
  }
  if (!imageDrawn) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Assinatura registrada no sistema.", boxX + 4, boxY + 14);
  }

  // Signer info on the right
  const infoX = boxX + 80;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text("Assinante:", infoX, boxY + 8);
  doc.setFont("helvetica", "normal");
  doc.text(signature.signerName, infoX + 22, boxY + 8);

  doc.setFont("helvetica", "bold");
  doc.text("Documento:", infoX, boxY + 14);
  doc.setFont("helvetica", "normal");
  doc.text(signature.signerDocument, infoX + 22, boxY + 14);

  doc.setFont("helvetica", "bold");
  doc.text("Assinado em:", infoX, boxY + 20);
  doc.setFont("helvetica", "normal");
  const signedAtBR = new Date(signature.signedAt).toLocaleString("pt-BR");
  doc.text(signedAtBR, infoX + 26, boxY + 20);

  // Footer note
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Documento assinado digitalmente no sistema Exacta Odonto.",
    boxX + 4,
    boxY + boxH - 4,
  );

  return boxY + boxH + 4;
}

export interface BudgetPdfData {
  number: string | null;
  title: string;
  description: string | null;
  status: string;
  validityDate: string | null;
  notes: string | null;
  subtotal: number;
  discount: number;
  total: number;
  patient: { name: string; cpf?: string | null; phone?: string | null };
  dentist: { name: string; cro?: string | null } | null;
  items: { description: string; quantity: number; unit_value: number; total_value: number; tooth_number?: number | null }[];
  createdAt: string;
}

export async function generateBudgetPdf(
  data: BudgetPdfData,
  clinic: ClinicSettings | null,
  signature?: SignaturePdfData | null,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const { cursorY: startY } = await drawHeader(doc, clinic, "ORÇAMENTO", data.number);
  let y = startY;

  // Patient + dentist block
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.text("Paciente:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.patient.name, margin + 22, y);
  if (data.patient.cpf) doc.text(`CPF: ${data.patient.cpf}`, pageWidth - margin, y, { align: "right" });
  y += 6;

  if (data.dentist) {
    doc.setFont("helvetica", "bold");
    doc.text("Dentista:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.dentist.name}${data.dentist.cro ? ` — CRO ${data.dentist.cro}` : ""}`, margin + 22, y);
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Emissão:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(fmtDateBR(data.createdAt), margin + 22, y);
  doc.setFont("helvetica", "bold");
  doc.text("Validade:", margin + 80, y);
  doc.setFont("helvetica", "normal");
  doc.text(fmtDateBR(data.validityDate), margin + 102, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(data.title, margin, y);
  y += 5;
  if (data.description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(data.description, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 2;
  }

  // Items table
  autoTable(doc, {
    startY: y,
    head: [["#", "Descrição", "Dente", "Qtd.", "Unit.", "Total"]],
    body: data.items.map((it, idx) => [
      String(idx + 1),
      it.description,
      it.tooth_number ? String(it.tooth_number) : "—",
      String(it.quantity),
      fmtMoney(it.unit_value),
      fmtMoney(it.total_value),
    ]),
    headStyles: { fillColor: [40, 90, 140], textColor: 255, fontStyle: "bold" },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      2: { halign: "center", cellWidth: 18 },
      3: { halign: "center", cellWidth: 14 },
      4: { halign: "right", cellWidth: 28 },
      5: { halign: "right", cellWidth: 32 },
    },
  });

  // Totals box
  type AutoTableDoc = jsPDF & { lastAutoTable?: { finalY: number } };
  const lastY = (doc as AutoTableDoc).lastAutoTable?.finalY ?? y;
  let ty = lastY + 6;
  const labelX = pageWidth - margin - 60;
  const valueX = pageWidth - margin;
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);

  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", labelX, ty);
  doc.text(fmtMoney(data.subtotal), valueX, ty, { align: "right" });
  ty += 5;
  doc.text("Desconto:", labelX, ty);
  doc.text(fmtMoney(data.discount), valueX, ty, { align: "right" });
  ty += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL:", labelX, ty);
  doc.text(fmtMoney(data.total), valueX, ty, { align: "right" });
  ty += 10;

  // Notes
  if (data.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Observações", margin, ty);
    ty += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(data.notes, pageWidth - margin * 2);
    doc.text(lines, margin, ty);
    ty += lines.length * 4 + 6;
  }

  // Signatures
  const pageHeight = doc.internal.pageSize.getHeight();
  if (signature) {
    await drawSignatureBlock(doc, signature, ty + 6);
  } else {
    const sigY = Math.min(ty + 25, pageHeight - 30);
    drawSignatureFields(doc, sigY, ["Assinatura do Paciente", "Responsável pela Clínica"]);
  }

  drawFooter(doc, clinic);
  return doc;
}

// ---------- RECEIPT ----------

export interface ReceiptPdfData {
  number: string | null;
  amount: number;
  paymentMethod: string | null;
  paymentDate: string | null;
  description: string | null;
  notes: string | null;
  patient: { name: string; cpf?: string | null };
  issuedByName?: string | null;
  createdAt: string;
}

export async function generateReceiptPdf(
  data: ReceiptPdfData,
  clinic: ClinicSettings | null,
  signature?: SignaturePdfData | null,
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const { cursorY: startY } = await drawHeader(doc, clinic, "RECIBO", data.number);
  let y = startY + 4;

  // Big amount
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(40, 90, 140);
  doc.text(fmtMoney(data.amount), pageWidth - margin, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Valor recebido", pageWidth - margin, y + 5, { align: "right" });
  y += 14;

  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.text("Recebido de:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.patient.name, margin + 30, y);
  if (data.patient.cpf) doc.text(`CPF: ${data.patient.cpf}`, pageWidth - margin, y, { align: "right" });
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.text("Forma:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.paymentMethod ?? "—", margin + 30, y);

  doc.setFont("helvetica", "bold");
  doc.text("Data:", margin + 90, y);
  doc.setFont("helvetica", "normal");
  doc.text(fmtDateBR(data.paymentDate ?? data.createdAt), margin + 110, y);
  y += 7;

  if (data.issuedByName) {
    doc.setFont("helvetica", "bold");
    doc.text("Recebido por:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.issuedByName, margin + 30, y);
    y += 7;
  }

  if (data.description) {
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Referente a", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(data.description, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 4;
  }

  if (data.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text("Observações", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(data.notes, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 6;
  }

  // Signature area
  const pageHeight = doc.internal.pageSize.getHeight();
  if (signature) {
    await drawSignatureBlock(doc, signature, y + 6);
  } else {
    const sigY = Math.min(y + 30, pageHeight - 30);
    drawSignatureFields(doc, sigY, ["Assinatura do Pagador", "Responsável pelo Recebimento"]);
  }

  drawFooter(doc, clinic);
  return doc;
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}

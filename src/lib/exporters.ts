import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { logAudit, type AuditAction } from "./audit";

export type Column<T> = {
  header: string;
  /** Either a key of T or a getter that receives the row. */
  accessor: keyof T | ((row: T) => string | number | null | undefined);
};

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value).replace(/"/g, '""');
  if (/[",\n;]/.test(s)) return `"${s}"`;
  return s;
}

function getCell<T>(row: T, col: Column<T>): string {
  const raw = typeof col.accessor === "function"
    ? col.accessor(row)
    : (row as Record<string, unknown>)[col.accessor as string];
  if (raw === null || raw === undefined) return "";
  return String(raw);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function exportCsv<T>(filename: string, rows: T[], columns: Column<T>[]) {
  const header = columns.map(c => escapeCsv(c.header)).join(";");
  const body = rows.map(r => columns.map(c => escapeCsv(getCell(r, c))).join(";")).join("\n");
  // Add UTF-8 BOM for Excel compatibility
  const csv = "\uFEFF" + header + "\n" + body;
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${filename}-${timestamp()}.csv`);
}

export function exportPdf<T>(opts: {
  filename: string;
  title: string;
  subtitle?: string;
  rows: T[];
  columns: Column<T>[];
  orientation?: "portrait" | "landscape";
}) {
  const doc = new jsPDF({ orientation: opts.orientation ?? "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(opts.title, 40, 40);
  if (opts.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(opts.subtitle, 40, 58);
    doc.setTextColor(0);
  }
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 40, opts.subtitle ? 72 : 58);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: opts.subtitle ? 86 : 72,
    head: [opts.columns.map(c => c.header)],
    body: opts.rows.map(r => opts.columns.map(c => getCell(r, c))),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
  });

  doc.save(`${opts.filename}-${timestamp()}.pdf`);
}

/** Export helper that also writes an audit log. */
export async function auditedExport(
  format: "csv" | "pdf",
  reportName: string,
  action: AuditAction = "report.export",
  details?: Record<string, unknown>,
) {
  await logAudit(action, "report.export", null, { format, report: reportName, ...details });
}

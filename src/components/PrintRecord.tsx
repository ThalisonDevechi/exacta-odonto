import { Patient, MedicalRecord, RecordEvolution, ToothRecord, TOOTH_CONDITION_LABELS } from "@/lib/types";
import { formatDate, getAge } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintRecordProps {
  patient: Patient;
  record: MedicalRecord;
  evolutions: RecordEvolution[];
  teeth: ToothRecord[];
  professionalName: string;
}

export function PrintRecord({ patient, record, evolutions, teeth, professionalName }: PrintRecordProps) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const teethWithCondition = teeth.filter(t => t.condition !== "higido");

    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Prontuário - ${patient.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; padding: 24px; font-size: 12px; line-height: 1.5; }
  .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 18px; color: #0d9488; }
  .header p { font-size: 11px; color: #666; }
  .section { margin-bottom: 14px; }
  .section-title { font-size: 13px; font-weight: 700; color: #0d9488; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
  .field label { font-weight: 600; color: #555; font-size: 11px; }
  .field p { font-size: 12px; }
  .evolution { border-left: 3px solid #0d9488; padding-left: 10px; margin-bottom: 10px; }
  .evolution .date { font-size: 10px; color: #888; }
  .tooth-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .tooth-table th, .tooth-table td { border: 1px solid #ddd; padding: 4px 8px; text-align: left; }
  .tooth-table th { background: #f3f4f6; font-weight: 600; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  .signature { margin-top: 48px; text-align: center; }
  .signature .line { width: 250px; border-top: 1px solid #333; margin: 0 auto 4px; }
  @media print { body { padding: 12px; } }
  @page { margin: 15mm; }
</style></head><body>
  <div class="header">
    <h1>Exacta Odonto</h1>
    <p>Gestão Odontológica — Prontuário Clínico</p>
  </div>

  <div class="section">
    <div class="section-title">Dados do Paciente</div>
    <div class="grid">
      <div class="field"><label>Nome:</label><p>${patient.name}</p></div>
      <div class="field"><label>CPF:</label><p>${patient.cpf}</p></div>
      <div class="field"><label>Data Nasc.:</label><p>${formatDate(patient.birthDate)} (${getAge(patient.birthDate)} anos)</p></div>
      <div class="field"><label>Sexo:</label><p>${patient.gender === "M" ? "Masculino" : patient.gender === "F" ? "Feminino" : "Outro"}</p></div>
      <div class="field"><label>Telefone:</label><p>${patient.phone}</p></div>
      <div class="field"><label>E-mail:</label><p>${patient.email}</p></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Anamnese e Histórico</div>
    <div class="grid">
      <div class="field"><label>Queixa Principal:</label><p>${record.chiefComplaint || "—"}</p></div>
      <div class="field"><label>Diagnóstico:</label><p>${record.diagnosis || "—"}</p></div>
      <div class="field"><label>Alergias:</label><p>${record.allergies || "Nenhuma"}</p></div>
      <div class="field"><label>Medicamentos:</label><p>${record.medications || "Nenhum"}</p></div>
    </div>
    <div class="field" style="margin-top:8px"><label>Histórico Médico:</label><p>${record.medicalHistory || "—"}</p></div>
    <div class="field" style="margin-top:6px"><label>Plano de Tratamento:</label><p>${record.treatmentPlanSummary || "—"}</p></div>
    <div class="field" style="margin-top:6px"><label>Observações Clínicas:</label><p>${record.clinicalNotes || "—"}</p></div>
  </div>

  ${teethWithCondition.length > 0 ? `
  <div class="section">
    <div class="section-title">Odontograma</div>
    <table class="tooth-table">
      <thead><tr><th>Dente</th><th>Condição</th><th>Faces</th><th>Proc. Planejado</th><th>Proc. Realizado</th><th>Obs.</th></tr></thead>
      <tbody>${teethWithCondition.map(t => `
        <tr>
          <td>${t.toothNumber}</td>
          <td>${TOOTH_CONDITION_LABELS[t.condition]}</td>
          <td>${t.faces?.join(", ") || "—"}</td>
          <td>${t.plannedProcedure || "—"}</td>
          <td>${t.performedProcedure || "—"}</td>
          <td>${t.notes || "—"}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  ${evolutions.length > 0 ? `
  <div class="section">
    <div class="section-title">Evoluções Clínicas</div>
    ${evolutions.map(ev => `
      <div class="evolution">
        <div class="date">${formatDate(ev.date)} — ${ev.professionalName}</div>
        <p>${ev.description}</p>
      </div>`).join("")}
  </div>` : ""}

  <div class="signature">
    <div class="line"></div>
    <p><strong>${professionalName}</strong></p>
    <p style="font-size:10px;color:#888">Profissional Responsável</p>
  </div>

  <div class="footer">
    <p>Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")} — Exacta Odonto</p>
  </div>
</body></html>`);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
      <Printer className="h-3.5 w-3.5" />
      Imprimir Prontuário
    </Button>
  );
}

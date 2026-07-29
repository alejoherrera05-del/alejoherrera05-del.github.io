import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { jsPDF } from "jspdf";

const outputDir = resolve(process.cwd(), "output", "pdf");
mkdirSync(outputDir, { recursive: true });
const outputPath = resolve(outputDir, "Sistema-Alejandro-informe-ejemplo.pdf");

const doc = new jsPDF({ unit: "mm", format: "a4" });
const pageWidth = doc.internal.pageSize.getWidth();
const margin = 16;
let y = 0;

function header(period) {
  doc.setFillColor(12, 13, 17);
  doc.rect(0, 0, pageWidth, 54, "F");
  doc.setDrawColor(141, 124, 255);
  doc.setLineWidth(1.1);
  doc.line(margin, 45, pageWidth - margin, 45);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("SISTEMA ALEJANDRO", margin, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(191, 187, 214);
  doc.text("Informe de evolucion - hipertrofia y progreso medible", margin, 31);
  doc.text(period, margin, 38);
  y = 67;
}

function section(eyebrow, title) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(111, 92, 220);
  doc.text(eyebrow.toUpperCase(), margin, y);
  y += 5;
  doc.setFontSize(16);
  doc.setTextColor(18, 19, 24);
  doc.text(title, margin, y);
  y += 9;
}

function paragraph(text, color = [62, 64, 74]) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
  doc.text(lines, margin, y);
  y += lines.length * 4.1 + 3;
}

header("1 Jul 2026 a 29 Jul 2026");
section("Resumen", "Comparativa corporal");

const metrics = [
  ["Peso", "84.8 kg", "86.2 kg", "+1.4 kg"],
  ["Grasa corporal", "16.1 %", "15.8 %", "-0.3 %"],
  ["Pecho", "110.8 cm", "112.0 cm", "+1.2 cm"],
  ["Cintura", "89.6 cm", "89.0 cm", "-0.6 cm"],
  ["Biceps", "39.8 cm", "40.5 cm", "+0.7 cm"],
  ["Muslo", "61.2 cm", "62.0 cm", "+0.8 cm"],
];
const x = [margin, 73, 112, 151];
doc.setFillColor(240, 239, 248);
doc.roundedRect(margin, y - 5, pageWidth - margin * 2, 10, 2, 2, "F");
doc.setFont("helvetica", "bold");
doc.setFontSize(8);
doc.setTextColor(68, 68, 80);
["Indicador", "Inicio", "Actual", "Cambio"].forEach((label, index) => doc.text(label, x[index], y + 1));
y += 9;
metrics.forEach((row, index) => {
  if (index % 2 === 0) {
    doc.setFillColor(250, 250, 252);
    doc.rect(margin, y - 4.5, pageWidth - margin * 2, 7.5, "F");
  }
  doc.setFont("helvetica", index === 0 ? "bold" : "normal");
  doc.setTextColor(40, 41, 48);
  row.forEach((value, column) => doc.text(value, x[column], y));
  y += 7.5;
});

y += 7;
section("Interpretacion", "Lectura conjunta");
paragraph("La tendencia combina peso, cintura, perimetros, fuerza, volumen y adherencia. Una sola cifra no explica por si misma la causa de un cambio.");

doc.setFillColor(247, 245, 255);
doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 3, 3, "F");
y += 8;
doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.setTextColor(42, 37, 72);
doc.text("Senal favorable con confianza media", margin + 5, y);
y += 6;
doc.setFont("helvetica", "normal");
doc.setFontSize(8.5);
doc.text(doc.splitTextToSize("El peso y varios perimetros aumentaron mientras la cintura se mantuvo estable. Confirma la tendencia con mas semanas y fotos comparables.", pageWidth - margin * 2 - 10), margin + 5, y);
y += 27;

section("Entrenamiento", "Sesiones recientes");
[
  ["Lun 27 Jul - Pecho + triceps", "24 series | RPE 8.3"],
  ["Mar 28 Jul - Espalda + biceps", "24 series | RPE 8.1"],
  ["Mie 29 Jul - Pierna", "28 series | RPE 8.5"],
].forEach(([label, value]) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(28, 29, 35);
  doc.text(label, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(92, 93, 105);
  doc.text(value, 135, y);
  y += 8;
});

doc.addPage();
y = 18;
section("Analisis IA", "Acciones para la siguiente semana");
[
  ["1. Mantener la progresion", "Completa el rango previsto con tecnica y RPE controlado antes de aumentar la carga."],
  ["2. Comparar volumen de calidad", "Revisa series efectivas por grupo muscular y evita sumar volumen sin una respuesta medible."],
  ["3. Confirmar la tendencia corporal", "Repite medidas con el mismo horario, postura y protocolo antes de ajustar calorias."],
].forEach(([title, body]) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(32, 33, 39);
  doc.text(title, margin, y);
  y += 5;
  paragraph(body);
  y += 2;
});

section("Matriz de evidencia", "Fuentes utilizadas");
const sources = [
  ["Entrenamiento", "ACSM 2026", "Alta", "acsm.org/resistance-training-guidelines-update-2026/"],
  ["Proteina", "Morton et al. 2018", "Alta", "pubmed.ncbi.nlm.nih.gov/28698222/"],
  ["Suplementacion", "NIH ODS", "Alta", "ods.od.nih.gov/factsheets/ExerciseAndAthleticPerformance-HealthProfessional/"],
  ["Farmacologia", "Endocrine Society", "Alta", "endocrine.org/.../adverse-health-consequences-of-performance-enhancing-drugs"],
];
doc.setFillColor(240, 239, 248);
doc.roundedRect(margin, y - 5, pageWidth - margin * 2, 10, 2, 2, "F");
doc.setFont("helvetica", "bold");
doc.setFontSize(8);
doc.setTextColor(68, 68, 80);
["Dominio", "Fuente", "Fuerza", "Referencia"].forEach((label, index) => doc.text(label, [margin, 57, 105, 126][index], y + 1));
y += 10;
sources.forEach((row, index) => {
  const rowHeight = index === 3 ? 15 : 11;
  if (index % 2 === 0) {
    doc.setFillColor(250, 250, 252);
    doc.rect(margin, y - 5, pageWidth - margin * 2, rowHeight, "F");
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  doc.setTextColor(45, 46, 54);
  doc.text(row[0], margin, y);
  doc.text(row[1], 57, y);
  doc.text(row[2], 105, y);
  doc.setTextColor(92, 79, 170);
  doc.text(doc.splitTextToSize(row[3], 66), 126, y);
  y += rowHeight;
});

y += 6;
section("Seguridad", "Limites del sistema");
paragraph("Este informe apoya decisiones de entrenamiento y no diagnostica. La informacion sobre esteroides, SARMs o peptidos es educativa y de reduccion de dano: nunca incluye ciclos, dosis, PCT, stacks, inyeccion, reconstitucion, compra ni evasion.");

const pages = doc.getNumberOfPages();
for (let page = 1; page <= pages; page += 1) {
  doc.setPage(page);
  doc.setDrawColor(224, 223, 231);
  doc.line(margin, 286, pageWidth - margin, 286);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(116, 116, 126);
  doc.text("Sistema Alejandro - informe personal", margin, 291);
  doc.text(`Pagina ${page} de ${pages}`, pageWidth - margin - 19, 291);
}

doc.save(outputPath);
console.log(outputPath);

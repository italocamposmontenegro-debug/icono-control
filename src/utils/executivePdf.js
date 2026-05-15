import { getActivityMetadata } from './activityMetadata';
import { formatDateOnly } from './date';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 44;
const LINE_HEIGHT = 13;

function pdfText(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  let hex = 'FEFF';

  for (const char of text) {
    hex += char.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase();
  }

  return `<${hex}>`;
}

function sanitizePdfText(value) {
  return String(value ?? '')
    .replace(/[•→]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrapText(text, maxChars = 88) {
  const words = sanitizePdfText(text).split(' ').filter(Boolean);
  const lines = [];
  let line = '';

  words.forEach(word => {
    const next = line ? `${line} ${word}` : word;

    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });

  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function buildPdfDocument(pages) {
  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
  const pagesId = addObject('');
  const regularFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  const pageIds = pages.map(content => {
    const contentId = addObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    return addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
  });

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let output = `%PDF-1.4\n%${String.fromCharCode(226, 227, 207, 211)}\n`;
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(output.length);
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => {
    output += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return output;
}

class PdfPageBuilder {
  constructor() {
    this.pages = [];
    this.commands = [];
    this.y = PAGE_HEIGHT - MARGIN;
    this.pageNumber = 0;
    this.newPage();
  }

  newPage() {
    if (this.commands.length) this.pages.push(this.commands.join('\n'));
    this.pageNumber += 1;
    this.commands = [
      '1 1 1 rg 0 0 595.28 841.89 re f',
      '0.07 0.08 0.16 rg 0 795 595.28 46 re f',
      '0.77 0.64 0.31 rg 0 792 595.28 3 re f',
      `BT /F2 9 Tf ${MARGIN} 816 Td ${pdfText('ICONO CONTROL - PROYECTO ICONICO 2026')} Tj ET`,
      `BT /F1 8 Tf 468 816 Td ${pdfText(`Pag. ${this.pageNumber}`)} Tj ET`,
    ];
    this.y = 764;
  }

  ensureSpace(height = LINE_HEIGHT) {
    if (this.y - height < 54) this.newPage();
  }

  text(value, { x = MARGIN, size = 10, font = 'F1', color = '0.12 0.14 0.22', maxChars = 88, leading = LINE_HEIGHT } = {}) {
    wrapText(value, maxChars).forEach(line => {
      this.ensureSpace(leading + 2);
      this.commands.push(`${color} rg`);
      this.commands.push(`BT /${font} ${size} Tf ${x} ${this.y} Td ${pdfText(line)} Tj ET`);
      this.y -= leading;
    });
  }

  heading(value) {
    this.ensureSpace(30);
    this.text(value, { size: 15, font: 'F2', color: '0.07 0.08 0.16', maxChars: 62, leading: 18 });
    this.y -= 5;
  }

  labelValue(label, value) {
    this.text(`${label}: ${value || 'Pendiente de confirmar'}`, { size: 9.5, maxChars: 90 });
  }

  divider() {
    this.ensureSpace(12);
    this.commands.push('0.86 0.88 0.91 RG 44 ' + this.y + ' 507 0.5 re f');
    this.y -= 14;
  }

  metric(label, value, x) {
    this.commands.push('0.96 0.97 0.98 rg ' + x + ' ' + (this.y - 34) + ' 112 42 re f');
    this.commands.push('0.86 0.88 0.91 RG ' + x + ' ' + (this.y - 34) + ' 112 42 re S');
    this.commands.push(`BT /F2 15 Tf ${x + 10} ${this.y - 10} Td ${pdfText(value)} Tj ET`);
    this.commands.push(`BT /F1 7.5 Tf ${x + 10} ${this.y - 25} Td ${pdfText(label)} Tj ET`);
  }

  finish() {
    this.pages.push(this.commands.join('\n'));
    return this.pages;
  }
}

export function downloadExecutivePdf({
  activities,
  evidence,
  project,
  modeLabel,
  monthLabel,
  avgProgress,
  noEvidence,
  withIndicators,
  upcomingClose,
}) {
  const builder = new PdfPageBuilder();
  const now = new Date();
  const active = activities.filter(activity => activity.status === 'en_curso').length;
  const pending = activities.filter(activity => activity.status === 'pendiente').length;
  const finished = activities.filter(activity => activity.status === 'finalizado').length;

  builder.heading('Resumen ejecutivo del Proyecto Iconico 2026');
  builder.text(project.name, { size: 12, font: 'F2', maxChars: 72, leading: 15 });
  builder.text(project.objective, { size: 9.5, maxChars: 96 });
  builder.y -= 6;
  builder.labelValue('Generado', formatDateOnly(now, { day: '2-digit', month: 'long', year: 'numeric' }));
  builder.labelValue('Vista', `${modeLabel} / ${monthLabel}`);
  builder.labelValue('Responsable 2026', `${project.responsible.name} (${project.responsible.email})`);
  builder.divider();

  builder.metric('Actividades', String(activities.length), 44);
  builder.metric('Avance global', `${avgProgress}%`, 172);
  builder.metric('En ejecucion', String(active), 300);
  builder.metric('Evidencia pendiente', String(noEvidence.length), 428);
  builder.y -= 58;

  builder.heading('Lectura de estado');
  builder.labelValue('Pendientes', pending);
  builder.labelValue('Finalizadas', finished);
  builder.labelValue('Con indicadores asociados', withIndicators);
  builder.labelValue('Proximas a cierre', upcomingClose.length);
  builder.labelValue('Evidencias cargadas', evidence.length);
  builder.divider();

  builder.heading('Actividades incorporadas');
  activities.forEach((activity, index) => {
    const metadata = getActivityMetadata(activity);
    const period = metadata.period || [activity.start_date, activity.end_date].filter(Boolean).join(' a ');
    const career = metadata.career || activity.careers?.name || 'Por definir';
    const indicators = metadata.indicators?.length ? metadata.indicators.join('; ') : 'Pendiente de confirmar';

    builder.text(`${index + 1}. ${activity.title}`, { size: 9.6, font: 'F2', maxChars: 86, leading: 12 });
    builder.text(`Etapa: ${metadata.stage || 'Por definir'} | Carrera: ${career} | Estado: ${activity.status} | Avance: ${activity.progress_percent}%`, { size: 8.6, maxChars: 100, leading: 11 });
    builder.text(`Periodo: ${period || 'Pendiente de confirmar'} | Territorio: ${metadata.territory || 'Por definir'}`, { size: 8.6, maxChars: 100, leading: 11 });
    builder.text(`Indicadores: ${indicators}`, { size: 8.2, maxChars: 104, leading: 10 });
    builder.y -= 4;
  });

  builder.divider();
  builder.heading('Pendientes criticos');
  activities
    .map(activity => ({ activity, metadata: getActivityMetadata(activity) }))
    .filter(({ metadata }) => metadata.pending || metadata.nextAction)
    .slice(0, 10)
    .forEach(({ activity, metadata }) => {
      builder.text(`${activity.title}: ${metadata.pending || metadata.nextAction}`, { size: 8.8, maxChars: 102, leading: 11 });
    });

  const pdf = buildPdfDocument(builder.finish());
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `resumen_icono_control_${new Date().toISOString().slice(0, 10)}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

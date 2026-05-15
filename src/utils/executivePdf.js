import { getActivityMetadata } from './activityMetadata';
import { formatDateOnly } from './date';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const COLORS = {
  ink: '0.07 0.08 0.16',
  navy: '0.09 0.12 0.22',
  slate: '0.28 0.32 0.40',
  muted: '0.49 0.54 0.61',
  line: '0.85 0.87 0.90',
  wash: '0.96 0.97 0.98',
  softGold: '0.98 0.95 0.84',
  gold: '0.77 0.60 0.20',
  cyan: '0.05 0.58 0.82',
  green: '0.09 0.56 0.34',
  red: '0.72 0.11 0.11',
  white: '1 1 1',
};

function encodeWinAnsi(value) {
  const replacements = {
    '•': '-',
    '→': '->',
    '—': '-',
    '–': '-',
    '“': '"',
    '”': '"',
    '‘': "'",
    '’': "'",
    '…': '...',
  };
  const text = String(value ?? '')
    .replace(/[•→—–“”‘’…]/g, char => replacements[char] || '')
    .replace(/\s+/g, ' ')
    .trim();

  let hex = '';
  for (const char of text) {
    const code = char.charCodeAt(0);
    const byte = code <= 255 ? code : 63;
    hex += byte.toString(16).padStart(2, '0').toUpperCase();
  }

  return `<${hex}>`;
}

function wrapText(value, maxChars = 88, maxLines = Infinity) {
  const words = String(value ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
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
  const limited = lines.slice(0, maxLines);

  if (lines.length > maxLines && limited.length) {
    limited[limited.length - 1] = `${limited[limited.length - 1].replace(/\.*$/, '')}...`;
  }

  return limited.length ? limited : [''];
}

function buildPdfDocument(pages) {
  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
  const pagesId = addObject('');
  const regularFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

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

function sortByStage(activities) {
  const stageOrder = ['Etapa 1', 'Etapa 2', 'Etapa 3', 'Etapa 4'];
  return [...activities].sort((a, b) => {
    const aStage = stageOrder.indexOf(getActivityMetadata(a).stage);
    const bStage = stageOrder.indexOf(getActivityMetadata(b).stage);
    return (aStage === -1 ? 99 : aStage) - (bStage === -1 ? 99 : bStage);
  });
}

function groupCounts(values) {
  const map = new Map();
  values.filter(Boolean).forEach(value => map.set(value, (map.get(value) || 0) + 1));
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function uniqueList(items) {
  return [...new Set(items.filter(Boolean))];
}

class PremiumPdf {
  constructor({ project, modeLabel, monthLabel }) {
    this.project = project;
    this.modeLabel = modeLabel;
    this.monthLabel = monthLabel;
    this.pages = [];
    this.commands = [];
    this.pageNumber = 0;
    this.y = PAGE_HEIGHT - MARGIN;
    this.cover = false;
  }

  push(value) {
    this.commands.push(value);
  }

  fill(color, x, y, width, height) {
    this.push(`${color} rg ${x} ${y} ${width} ${height} re f`);
  }

  stroke(color, x, y, width, height, lineWidth = 0.7) {
    this.push(`${lineWidth} w ${color} RG ${x} ${y} ${width} ${height} re S`);
  }

  line(color, x1, y1, x2, y2, lineWidth = 0.7) {
    this.push(`${lineWidth} w ${color} RG ${x1} ${y1} m ${x2} ${y2} l S`);
  }

  text(value, x, y, { size = 10, font = 'F1', color = COLORS.ink } = {}) {
    if (!String(value ?? '').trim()) return;
    this.push(`${color} rg BT /${font} ${size} Tf ${x} ${y} Td ${encodeWinAnsi(value)} Tj ET`);
  }

  multiText(value, {
    x = MARGIN,
    size = 10,
    font = 'F1',
    color = COLORS.ink,
    maxChars = 88,
    maxLines = Infinity,
    leading = size + 4,
  } = {}) {
    wrapText(value, maxChars, maxLines).forEach(line => {
      this.ensure(leading + 3);
      this.text(line, x, this.y, { size, font, color });
      this.y -= leading;
    });
  }

  addPage({ cover = false } = {}) {
    if (this.commands.length) {
      if (!this.cover) this.footer();
      this.pages.push(this.commands.join('\n'));
    }

    this.pageNumber += 1;
    this.cover = cover;
    this.commands = [];
    this.fill(COLORS.white, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);

    if (cover) {
      this.y = PAGE_HEIGHT - 78;
      return;
    }

    this.fill(COLORS.navy, 0, PAGE_HEIGHT - 58, PAGE_WIDTH, 58);
    this.fill(COLORS.gold, 0, PAGE_HEIGHT - 61, PAGE_WIDTH, 3);
    this.text('ICONO CONTROL', MARGIN, PAGE_HEIGHT - 33, { size: 9, font: 'F2', color: COLORS.white });
    this.text('Proyecto Iconico 2026', MARGIN + 91, PAGE_HEIGHT - 33, { size: 9, color: '0.83 0.88 0.95' });
    this.text(`Vista ${this.modeLabel} / ${this.monthLabel}`, PAGE_WIDTH - MARGIN - 124, PAGE_HEIGHT - 33, { size: 8, color: '0.83 0.88 0.95' });
    this.y = PAGE_HEIGHT - 91;
  }

  footer() {
    this.line(COLORS.line, MARGIN, 38, PAGE_WIDTH - MARGIN, 38, 0.5);
    this.text('Facultad de Ciencias de la Vida - Universidad Viña del Mar', MARGIN, 24, { size: 7.4, color: COLORS.muted });
    this.text(`Pagina ${this.pageNumber}`, PAGE_WIDTH - MARGIN - 46, 24, { size: 7.4, color: COLORS.muted });
  }

  ensure(height) {
    if (this.y - height < 58) this.addPage();
  }

  section(title, eyebrow) {
    this.ensure(42);
    if (eyebrow) this.text(eyebrow.toUpperCase(), MARGIN, this.y, { size: 7.6, font: 'F2', color: COLORS.gold });
    this.y -= eyebrow ? 14 : 0;
    this.text(title, MARGIN, this.y, { size: 16, font: 'F2', color: COLORS.ink });
    this.y -= 22;
    this.line(COLORS.line, MARGIN, this.y + 6, PAGE_WIDTH - MARGIN, this.y + 6, 0.5);
  }

  metricCard({ x, y, width, label, value, note, accent = COLORS.gold }) {
    this.fill(COLORS.wash, x, y, width, 62);
    this.stroke('0.86 0.88 0.92', x, y, width, 62, 0.6);
    this.fill(accent, x, y, 4, 62);
    this.text(value, x + 14, y + 34, { size: 18, font: 'F2', color: COLORS.ink });
    this.text(label, x + 14, y + 20, { size: 7.5, font: 'F2', color: COLORS.muted });
    if (note) this.text(note, x + 14, y + 8, { size: 6.8, color: COLORS.muted });
  }

  coverPage({ now, summary }) {
    this.addPage({ cover: true });
    this.fill(COLORS.navy, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
    this.fill('0.10 0.15 0.25', 0, 0, PAGE_WIDTH, 330);
    this.fill(COLORS.gold, MARGIN, 108, 4, 626);
    this.fill(COLORS.cyan, MARGIN + 11, 108, 1.5, 530);

    for (let y = 140; y < 740; y += 42) this.line('0.17 0.22 0.33', MARGIN + 26, y, PAGE_WIDTH - MARGIN, y, 0.35);
    for (let x = MARGIN + 26; x < PAGE_WIDTH - MARGIN; x += 44) this.line('0.17 0.22 0.33', x, 118, x, 734, 0.35);

    this.text('INFORME EJECUTIVO DE SEGUIMIENTO', MARGIN + 28, 708, { size: 9.5, font: 'F2', color: COLORS.gold });
    wrapText(this.project.name, 38).forEach((line, index) => {
      this.text(line, MARGIN + 28, 657 - index * 32, { size: 27, font: 'F2', color: COLORS.white });
    });
    this.text('Vinculacion con el Medio | Facultad de Ciencias de la Vida', MARGIN + 28, 538, { size: 11.5, color: '0.83 0.88 0.95' });
    this.text('Universidad Viña del Mar', MARGIN + 28, 520, { size: 11.5, color: '0.83 0.88 0.95' });

    this.fill('0.98 0.98 0.98', MARGIN + 28, 286, 440, 144);
    this.fill(COLORS.gold, MARGIN + 28, 426, 440, 4);
    this.text('Sintesis institucional', MARGIN + 48, 398, { size: 12, font: 'F2', color: COLORS.ink });
    this.multiBlock(this.project.objective, MARGIN + 48, 374, 72, { size: 9.5, color: COLORS.slate, leading: 13, maxLines: 5 });
    this.text(`Corte: ${formatDateOnly(now, { day: '2-digit', month: 'long', year: 'numeric' })}`, MARGIN + 48, 303, { size: 8.5, font: 'F2', color: COLORS.muted });

    const baseY = 172;
    this.metricCard({ x: MARGIN + 28, y: baseY, width: 122, label: 'Actividades', value: String(summary.total), note: 'cartera vigente', accent: COLORS.gold });
    this.metricCard({ x: MARGIN + 164, y: baseY, width: 122, label: 'Avance global', value: `${summary.avgProgress}%`, note: 'promedio operativo', accent: COLORS.cyan });
    this.metricCard({ x: MARGIN + 300, y: baseY, width: 168, label: 'Evidencia pendiente', value: String(summary.noEvidence), note: 'requiere trazabilidad documental', accent: COLORS.red });

    this.text('Preparado para coordinacion, seguimiento institucional y toma de decisiones.', MARGIN + 28, 84, { size: 8.5, color: '0.83 0.88 0.95' });
    this.text('Identidad de gestion: Italo Campos Montenegro / Proyecto Iconico UVM', MARGIN + 28, 68, { size: 8.5, font: 'F2', color: COLORS.white });
  }

  multiBlock(value, x, y, maxChars, { size = 9, color = COLORS.ink, font = 'F1', leading = 12, maxLines = Infinity } = {}) {
    wrapText(value, maxChars, maxLines).forEach((line, index) => {
      this.text(line, x, y - index * leading, { size, color, font });
    });
  }

  infoTable(rows, columns) {
    const rowBase = 23;
    const headerY = this.y;
    this.ensure(58);
    this.fill(COLORS.navy, MARGIN, headerY - 18, CONTENT_WIDTH, 24);

    let x = MARGIN;
    columns.forEach(column => {
      this.text(column.label, x + 6, headerY - 9, { size: 7.4, font: 'F2', color: COLORS.white });
      x += column.width;
    });
    this.y = headerY - 24;

    rows.forEach((row, index) => {
      const titleLines = wrapText(row.title, 33, 2);
      const rowHeight = Math.max(rowBase, 12 + titleLines.length * 10);
      this.ensure(rowHeight + 8);
      const y = this.y - rowHeight;

      this.fill(index % 2 === 0 ? '0.99 0.99 1' : COLORS.wash, MARGIN, y, CONTENT_WIDTH, rowHeight);
      this.stroke(COLORS.line, MARGIN, y, CONTENT_WIDTH, rowHeight, 0.35);

      x = MARGIN;
      columns.forEach(column => {
        const value = row[column.key] ?? '';
        if (column.key === 'title') {
          titleLines.forEach((line, lineIndex) => {
            this.text(line, x + 6, this.y - 13 - lineIndex * 10, { size: 7.6, font: lineIndex === 0 ? 'F2' : 'F1', color: COLORS.ink });
          });
        } else {
          this.multiBlock(value, x + 6, this.y - 13, column.maxChars || 12, { size: 7.2, color: column.color || COLORS.slate, maxLines: column.maxLines || 2, leading: 9 });
        }
        x += column.width;
      });
      this.y = y;
    });
    this.y -= 14;
  }

  stageTimeline(activities) {
    const stages = ['Etapa 1', 'Etapa 2', 'Etapa 3', 'Etapa 4'];
    const x = MARGIN;
    const y = this.y - 56;
    const gap = 8;
    const width = (CONTENT_WIDTH - gap * 3) / 4;

    this.ensure(82);
    stages.forEach((stage, index) => {
      const rows = activities.filter(activity => getActivityMetadata(activity).stage === stage);
      const progress = rows.length
        ? Math.round(rows.reduce((sum, activity) => sum + (activity.progress_percent || 0), 0) / rows.length)
        : 0;
      const cardX = x + index * (width + gap);

      this.fill(index === 1 ? COLORS.softGold : COLORS.wash, cardX, y, width, 54);
      this.stroke(COLORS.line, cardX, y, width, 54, 0.5);
      this.text(stage, cardX + 9, y + 35, { size: 9, font: 'F2', color: COLORS.ink });
      this.text(`${rows.length} actividades`, cardX + 9, y + 21, { size: 7.2, color: COLORS.muted });
      this.text(`${progress}%`, cardX + width - 34, y + 12, { size: 12, font: 'F2', color: progress > 50 ? COLORS.green : COLORS.gold });
      this.fill(COLORS.line, cardX + 9, y + 9, width - 50, 4);
      this.fill(progress > 50 ? COLORS.green : COLORS.gold, cardX + 9, y + 9, (width - 50) * progress / 100, 4);
    });
    this.y = y - 24;
  }

  finish() {
    if (!this.cover) this.footer();
    this.pages.push(this.commands.join('\n'));
    return this.pages;
  }
}

function statusLabel(status) {
  const labels = {
    pendiente: 'Pendiente',
    en_curso: 'En curso',
    finalizado: 'Finalizada',
    retrasado: 'Retrasada',
    suspendido: 'Suspendida',
  };
  return labels[status] || status || 'Por definir';
}

function collectReportData(activities) {
  const metadataRows = activities.map(activity => ({ activity, metadata: getActivityMetadata(activity) }));
  const indicators = uniqueList(metadataRows.flatMap(row => row.metadata.indicators || []).filter(item => item !== 'Por definir'));
  const evidenceExpected = uniqueList(metadataRows.flatMap(row => row.metadata.expectedEvidence || []));
  const axes = groupCounts(metadataRows.flatMap(row => row.metadata.territorialAxis || []).filter(item => item !== 'Por definir'));
  const careers = groupCounts(metadataRows.map(row => row.metadata.career || row.activity.careers?.name || 'Por definir'));
  const pending = metadataRows
    .filter(row => row.metadata.pending || row.metadata.nextAction)
    .map(row => ({
      title: row.activity.title,
      stage: row.metadata.stage || 'Sin etapa',
      pending: row.metadata.pending || row.metadata.nextAction,
    }));

  return { indicators, evidenceExpected, axes, careers, pending };
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
  const now = new Date();
  const sortedActivities = sortByStage(activities);
  const active = activities.filter(activity => activity.status === 'en_curso').length;
  const pendingCount = activities.filter(activity => activity.status === 'pendiente').length;
  const finished = activities.filter(activity => activity.status === 'finalizado').length;
  const data = collectReportData(sortedActivities);
  const pdf = new PremiumPdf({ project, modeLabel, monthLabel });

  pdf.coverPage({
    now,
    summary: {
      total: activities.length,
      avgProgress,
      noEvidence: noEvidence.length,
    },
  });

  pdf.addPage();
  pdf.section('Lectura ejecutiva del estado del proyecto', 'Resumen academico');
  pdf.multiText(
    'Este informe consolida el estado operativo del Proyecto Iconico 2026, sus etapas de implementacion, sus actividades disciplinares e interdisciplinarias, la trazabilidad de evidencias y los indicadores asociados para seguimiento institucional.',
    { size: 9.4, color: COLORS.slate, maxChars: 98, leading: 13 }
  );
  pdf.y -= 10;

  const rowY = pdf.y - 72;
  pdf.metricCard({ x: MARGIN, y: rowY, width: 118, label: 'Actividades', value: String(activities.length), note: 'incorporadas al prompt', accent: COLORS.gold });
  pdf.metricCard({ x: MARGIN + 130, y: rowY, width: 118, label: 'Avance global', value: `${avgProgress}%`, note: 'promedio general', accent: COLORS.cyan });
  pdf.metricCard({ x: MARGIN + 260, y: rowY, width: 118, label: 'En ejecucion', value: String(active), note: 'proceso activo', accent: COLORS.green });
  pdf.metricCard({ x: MARGIN + 390, y: rowY, width: 120, label: 'Pendientes', value: String(pendingCount), note: 'por activar/cerrar', accent: COLORS.red });
  pdf.y = rowY - 28;

  pdf.stageTimeline(sortedActivities);

  pdf.section('Indicadores de control', 'Gobernanza y reportabilidad');
  pdf.infoTable([
    { dimension: 'Finalizadas', valor: String(finished), lectura: 'Cierre formal registrado en plataforma.' },
    { dimension: 'Evidencias cargadas', valor: String(evidence.length), lectura: 'Archivos o respaldos documentales disponibles.' },
    { dimension: 'Evidencias pendientes', valor: String(noEvidence.length), lectura: 'Actividades que requieren trazabilidad documental.' },
    { dimension: 'Indicadores asociados', valor: String(withIndicators), lectura: 'Actividades con indicadores declarados.' },
    { dimension: 'Cierres cercanos', valor: String(upcomingClose.length), lectura: 'Actividades que deben monitorearse en el corto plazo.' },
  ], [
    { key: 'dimension', label: 'Dimension', width: 150, maxChars: 24 },
    { key: 'valor', label: 'Valor', width: 62, maxChars: 8 },
    { key: 'lectura', label: 'Lectura ejecutiva', width: CONTENT_WIDTH - 212, maxChars: 62 },
  ]);

  pdf.section('Matriz de actividades', 'Cartera vigente');
  pdf.infoTable(sortedActivities.map(activity => {
    const metadata = getActivityMetadata(activity);
    const period = metadata.period || [activity.start_date, activity.end_date].filter(Boolean).join(' a ') || 'Pendiente';
    return {
      stage: metadata.stage || 'S/E',
      title: activity.title,
      career: metadata.career || activity.careers?.name || 'Por definir',
      status: statusLabel(activity.status),
      progress: `${activity.progress_percent || 0}%`,
      period,
    };
  }), [
    { key: 'stage', label: 'Etapa', width: 48, maxChars: 9 },
    { key: 'title', label: 'Actividad', width: 190, maxChars: 36 },
    { key: 'career', label: 'Carrera', width: 86, maxChars: 17 },
    { key: 'status', label: 'Estado', width: 62, maxChars: 12 },
    { key: 'progress', label: 'Av.', width: 42, maxChars: 6 },
    { key: 'period', label: 'Periodo', width: CONTENT_WIDTH - 428, maxChars: 16 },
  ]);

  pdf.section('Ejes, carreras e indicadores', 'Mapa academico-territorial');
  const axesRows = data.axes.slice(0, 8).map(([axis, count]) => ({ dimension: axis, valor: String(count), lectura: 'Eje critico con actividades asociadas.' }));
  pdf.infoTable(axesRows, [
    { key: 'dimension', label: 'Eje critico territorial', width: 268, maxChars: 42 },
    { key: 'valor', label: 'Act.', width: 48, maxChars: 6 },
    { key: 'lectura', label: 'Lectura', width: CONTENT_WIDTH - 316, maxChars: 36 },
  ]);

  pdf.section('Indicadores y evidencias esperadas', 'Trazabilidad');
  pdf.multiText(`Indicadores declarados: ${data.indicators.join('; ') || 'Pendiente de confirmar.'}`, { size: 8.8, color: COLORS.slate, maxChars: 104, leading: 12 });
  pdf.y -= 6;
  pdf.multiText(`Evidencias esperadas: ${data.evidenceExpected.join('; ') || 'Pendiente de confirmar.'}`, { size: 8.8, color: COLORS.slate, maxChars: 104, leading: 12 });
  pdf.y -= 10;
  pdf.infoTable(data.careers.slice(0, 8).map(([career, count]) => ({
    dimension: career,
    valor: String(count),
    lectura: 'Participacion registrada en actividades del proyecto.',
  })), [
    { key: 'dimension', label: 'Carrera / disciplina', width: 235, maxChars: 36 },
    { key: 'valor', label: 'Act.', width: 48, maxChars: 6 },
    { key: 'lectura', label: 'Lectura', width: CONTENT_WIDTH - 283, maxChars: 42 },
  ]);

  pdf.section('Pendientes criticos y proximas acciones', 'Plan de seguimiento');
  pdf.infoTable(data.pending.slice(0, 12), [
    { key: 'stage', label: 'Etapa', width: 58, maxChars: 9 },
    { key: 'title', label: 'Actividad', width: 178, maxChars: 34 },
    { key: 'pending', label: 'Pendiente / accion requerida', width: CONTENT_WIDTH - 236, maxChars: 54, maxLines: 3 },
  ]);

  pdf.y -= 8;
  pdf.fill(COLORS.softGold, MARGIN, pdf.y - 72, CONTENT_WIDTH, 72);
  pdf.stroke('0.92 0.84 0.63', MARGIN, pdf.y - 72, CONTENT_WIDTH, 72, 0.6);
  pdf.text('Nota de uso', MARGIN + 14, pdf.y - 22, { size: 10.5, font: 'F2', color: COLORS.ink });
  pdf.multiBlock(
    'El informe se genera desde los datos vivos de la plataforma. Nuevos archivos, prompts o instrucciones entregados al administrador pueden incorporarse como actualizaciones trazables del Proyecto Iconico 2026.',
    MARGIN + 14,
    pdf.y - 39,
    90,
    { size: 8.4, color: COLORS.slate, leading: 11, maxLines: 3 }
  );

  const documentText = buildPdfDocument(pdf.finish());
  const blob = new Blob([documentText], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `informe_premium_icono_control_${new Date().toISOString().slice(0, 10)}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

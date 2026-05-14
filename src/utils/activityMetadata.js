export const METADATA_START = '--- Seguimiento Proyecto Iconico 2026 ---';
export const METADATA_END = '--- Fin Seguimiento Proyecto Iconico 2026 ---';

export const METADATA_LABELS = {
  projectName: 'Proyecto',
  stage: 'Etapa',
  period: 'Periodo',
  activityType: 'Tipo',
  year: 'Ano',
  territory: 'Territorio',
  institutionPartner: 'Institucion vinculada',
  targetPopulation: 'Poblacion objetivo',
  career: 'Carrera(s)',
  courseName: 'Asignatura(s)',
  semester: 'Semestre',
  responsiblePerson: 'Responsable',
  instrument: 'Instrumento asociado',
  associatedObjective: 'Objetivo asociado',
  territorialAxis: 'Ejes criticos',
  expectedEvidence: 'Evidencias esperadas',
  indicators: 'Indicadores',
  nextAction: 'Proxima accion',
  pending: 'Datos pendientes',
  sourceObservation: 'Observacion base',
};

const LABEL_TO_KEY = Object.entries(METADATA_LABELS).reduce((acc, [key, label]) => {
  acc[label] = key;
  return acc;
}, {});

const ARRAY_KEYS = new Set(['territorialAxis', 'expectedEvidence', 'indicators']);

export function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function toList(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/\r?\n|;/)
    .map(item => item.trim())
    .filter(Boolean);
}

function formatValue(key, value) {
  if (ARRAY_KEYS.has(key)) return toList(value).join('; ');
  return value == null ? '' : String(value).trim();
}

export function formatMetadataBlock(metadata = {}) {
  const lines = Object.entries(METADATA_LABELS)
    .map(([key, label]) => {
      const formatted = formatValue(key, metadata[key]);
      return formatted ? `${label}: ${formatted}` : null;
    })
    .filter(Boolean);

  return lines.length ? [METADATA_START, ...lines, METADATA_END].join('\n') : '';
}

export function stripMetadataBlock(observations = '') {
  const text = observations || '';
  const start = text.indexOf(METADATA_START);
  const end = text.indexOf(METADATA_END);

  if (start === -1 || end === -1 || end < start) return text.trim();

  return `${text.slice(0, start)}${text.slice(end + METADATA_END.length)}`.trim();
}

export function mergeMetadataIntoObservations(observations = '', metadata = {}) {
  const block = formatMetadataBlock(metadata);
  const rest = stripMetadataBlock(observations);
  return [block, rest].filter(Boolean).join('\n\n');
}

export function parseMetadataFromObservations(observations = '') {
  const text = observations || '';
  const start = text.indexOf(METADATA_START);
  const end = text.indexOf(METADATA_END);

  if (start === -1 || end === -1 || end < start) return {};

  const block = text.slice(start + METADATA_START.length, end);

  return block.split(/\r?\n/).reduce((acc, line) => {
    const separator = line.indexOf(':');
    if (separator === -1) return acc;

    const label = line.slice(0, separator).trim();
    const key = LABEL_TO_KEY[label];
    if (!key) return acc;

    const value = line.slice(separator + 1).trim();
    acc[key] = ARRAY_KEYS.has(key) ? toList(value) : value;
    return acc;
  }, {});
}

export function getActivityMetadata(activity = {}) {
  return parseMetadataFromObservations(activity.observations);
}

export function metadataIncludes(metadata, key, expectedValue) {
  if (!expectedValue) return true;
  const value = metadata?.[key];
  const expected = normalizeText(expectedValue);

  if (Array.isArray(value)) {
    return value.some(item => normalizeText(item).includes(expected));
  }

  return normalizeText(value || '').includes(expected);
}

export function uniqueMetadataOptions(activities, key) {
  const values = new Map();

  activities.forEach(activity => {
    const metadata = getActivityMetadata(activity);
    const raw = metadata[key];
    const list = Array.isArray(raw) ? raw : [raw];

    list.filter(Boolean).forEach(value => {
      const normalized = normalizeText(value);
      if (normalized && normalized !== 'por definir' && !values.has(normalized)) {
        values.set(normalized, value);
      }
    });
  });

  return [...values.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

export function listToTextarea(value) {
  return toList(value).join('\n');
}

export function textareaToList(value) {
  return String(value || '')
    .split(/\r?\n|;/)
    .map(item => item.trim())
    .filter(Boolean);
}

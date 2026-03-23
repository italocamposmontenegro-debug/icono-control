const LOCALE = 'es-CL';

export function parseDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const [year, month, day] = String(value).split('-').map(Number);
  if ([year, month, day].every(Number.isFinite)) {
    return new Date(year, month - 1, day);
  }

  return new Date(value);
}

export function formatDateOnly(value, options = {}) {
  const date = parseDateOnly(value);
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(LOCALE, options);
}

export function formatDateTime(value, options = {}) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(LOCALE, options);
}

export function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

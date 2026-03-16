/**
 * Minimal CSV parser (RFC 4180 style): quoted fields, "" escape, newlines inside quotes.
 * Used so we don't need the csv-parse dependency for OFF and review CSV.
 */

export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let i = 0;
  const len = content.length;
  let inQuotes = false;

  while (i < len) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < len && content[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (c === '\n' || c === '\r') {
      row.push(field);
      field = '';
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      if (c === '\r' && i + 1 < len && content[i + 1] === '\n') i++;
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field !== '' || row.length > 0) row.push(field);
  if (row.length > 0) rows.push(row);
  return rows;
}

export function csvToObjects(content: string): Record<string, string>[] {
  const rows = parseCsv(content);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] !== undefined ? r[i].trim() : '';
    });
    return obj;
  });
}

/** Escape a field for RFC 4180 CSV (quote if contains comma, newline, or "). */
function escapeCsvField(val: unknown): string {
  const s = val === undefined || val === null ? '' : String(val);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Write an array of objects to CSV string (first object's keys = header). */
export function objectsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]!);
  const lines = [headers.map(escapeCsvField).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvField(row[h])).join(','));
  }
  return lines.join('\n');
}

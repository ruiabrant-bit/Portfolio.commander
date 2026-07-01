import Papa from 'papaparse';

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parses raw CSV text into headers + row objects. Delimiter is
 * auto-detected (PapaParse handles comma, semicolon and tab, which
 * covers the common Trade Republic export variants without hardcoding
 * one specific format).
 */
export function parseCSV(text: string): ParsedCSV {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const headers = result.meta.fields ?? [];
  const rows = result.data.filter((row) =>
    Object.values(row).some((v) => v !== undefined && v !== ''),
  );

  return { headers, rows };
}

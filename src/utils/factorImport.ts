/**
 * Parse official emission-factor tables (CSV or a sheet read from XLSX) into import candidates.
 * Values always come from the user's file. Nothing is hard-coded here, so every factor keeps
 * the provenance of the dataset it was read from.
 */
export type Grid = (string | number | null | undefined)[][];

export interface Candidate {
  key: string; name: string; unit: string; kgPerUnit: number;
  scope: 1 | 2 | 3 | null; ref?: string; gasUnit?: string;
}
export interface Mapping { header: number; name: number[]; unit: number; value: number; scope?: number; ref?: number; multiplier: number }

const txt = (v: unknown) => (v == null ? '' : String(v).trim());
const low = (v: unknown) => txt(v).toLowerCase();

export function parseCsv(text: string): Grid {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

export const toNumber = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = txt(v).replace(/,/g, '').replace(/\s/g, '');
  if (s === '' || s === '-' || s === '—') return null;
  const n = Number(s); return Number.isFinite(n) ? n : null;
};
export const scopeOf = (v: unknown): 1 | 2 | 3 | null => { const m = /scope\s*([123])\b/i.exec(txt(v)); return m ? (Number(m[1]) as 1 | 2 | 3) : null; };

/* ── UK DESNZ / Defra "flat file" layout ── */
export interface DesnzLayout { header: number; id: number; scope: number; levels: number[]; colText: number; uom: number; gasUnit: number; value: number; year: string }
export function detectDesnz(g: Grid): DesnzLayout | null {
  for (let r = 0; r < Math.min(g.length, 40); r++) {
    const row = g[r].map(low);
    const f = (pred: (s: string) => boolean) => row.findIndex(pred);
    const l1 = f((s) => s === 'level 1'), uom = f((s) => s === 'uom'), gas = f((s) => s === 'ghg/unit'), val = f((s) => s.startsWith('ghg conversion factor'));
    if (l1 >= 0 && uom >= 0 && gas >= 0 && val >= 0) {
      return { header: r, id: f((s) => s === 'id'), scope: f((s) => s === 'scope'), colText: f((s) => s === 'column text'),
        levels: ['level 1', 'level 2', 'level 3', 'level 4'].map((k) => f((s) => s === k)).filter((i) => i >= 0),
        uom, gasUnit: gas, value: val, year: (/(\d{4})/.exec(txt(g[r][val])) ?? ['', ''])[1] };
    }
  }
  return null;
}
export function desnzCandidates(g: Grid, L: DesnzLayout): Candidate[] {
  const out: Candidate[] = [];
  for (let r = L.header + 1; r < g.length; r++) {
    const row = g[r]; const v = toNumber(row[L.value]); if (v == null) continue;
    const parts = L.levels.map((i) => txt(row[i])).filter(Boolean);
    const ct = L.colText >= 0 ? txt(row[L.colText]) : '';
    const name = parts.join(' › ') + (ct ? ` · ${ct}` : '');
    out.push({ key: `d${r}`, name, unit: txt(row[L.uom]), kgPerUnit: v, scope: L.scope >= 0 ? scopeOf(row[L.scope]) : null,
      ref: L.id >= 0 && txt(row[L.id]) ? `ID ${txt(row[L.id])}` : `row ${r + 1}`, gasUnit: txt(row[L.gasUnit]) });
  }
  return out;
}

/* ── Generic table with user-chosen columns ── */
export const guessHeader = (g: Grid) => Math.max(0, g.findIndex((r) => r.filter((c) => typeof c === 'string' && c.trim() && toNumber(c) == null).length >= 3));
export function genericCandidates(g: Grid, m: Mapping): Candidate[] {
  const out: Candidate[] = [];
  for (let r = m.header + 1; r < g.length; r++) {
    const row = g[r]; const v = toNumber(row[m.value]); if (v == null) continue;
    const name = m.name.map((i) => txt(row[i])).filter(Boolean).join(' › ');
    if (!name) continue;
    out.push({ key: `g${r}`, name, unit: txt(row[m.unit]) || 'unit', kgPerUnit: v * m.multiplier,
      scope: m.scope != null && m.scope >= 0 ? scopeOf(row[m.scope]) : null,
      ref: m.ref != null && m.ref >= 0 && txt(row[m.ref]) ? txt(row[m.ref]) : `row ${r + 1}` });
  }
  return out;
}

/**
 * IGBC narrative engine (ported from the IGBC Narrative Builder).
 * Templates use {{NamedRange|format}} for figures read from the filled calculation workbook
 * and [[hint]] for facts the team types and confirms. Edit keys match the builder:
 * `<creditId>:<part><index>:<n>` with part intent|approach|evidence|result.
 */
import { unzipSync, strFromU8 } from 'fflate';

export interface NCredit { id: string; name: string; pts: string; tab: string; intent: string; approach: string[]; evidence: string[]; result: string; preempt?: string[]; sc?: string[] }
export interface NSection { title: string; credits: NCredit[] }
export interface NSource {
  rating: string; values: Record<string, string>; labels: Record<string, string>; targets: Record<string, string>;
  project: string; sample: boolean; uncached?: boolean; blank: number; total: number; file?: string;
  totals: { pts?: unknown; level?: unknown; mand?: unknown; stage?: unknown };
}
/** facts: no calculation workbook; the project's figures are typed once in a Project facts form. */
export interface NRating { title: string; sections: NSection[]; tokens: [string, string][]; sample: Omit<NSource, 'rating'>; facts?: boolean; family?: string }
export type NData = Record<string, NRating>;

export const TOK = /\{\{([A-Za-z0-9_]+)\|([^}]*)\}\}|\[\[(.+?)\]\]/g;

/** Excel-like number formatting used by the templates (Indian digit grouping). */
export function nfmt(v: unknown, f: string): string {
  if (v === null || v === undefined || v === '') return '';
  if (f === '@' || typeof v === 'string') return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  let x = Number(v); if (!Number.isFinite(x)) return String(v);
  const pct = f.endsWith('%'); if (pct) { x *= 100; f = f.slice(0, -1); }
  const dec = f.includes('.') ? f.split('.')[1].length : 0;
  return x.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: f.includes(',') }) + (pct ? '%' : '');
}

export type Seg = { t: 'text'; s: string } | { t: 'val'; name: string; fmt: string; v: string; label: string } | { t: 'fill'; key: string; hint: string; v: string };
/** Split one template string into text, workbook values and fill-ins. */
export function segments(text: string, cid: string, part: string, src: NSource, edits: Record<string, string>): Seg[] {
  const out: Seg[] = []; let last = 0, k = 0; let m: RegExpExecArray | null;
  const re = new RegExp(TOK.source, 'g');
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: 'text', s: text.slice(last, m.index) });
    last = re.lastIndex;
    if (m[1]) out.push({ t: 'val', name: m[1], fmt: m[2], v: src.values[`${m[1]}|${m[2]}`] ?? '', label: src.labels[m[1]] || m[1] });
    else { const key = `${cid}:${part}:${k++}`; out.push({ t: 'fill', key, hint: m[3], v: edits[key] ?? '' }); }
  }
  if (last < text.length) out.push({ t: 'text', s: text.slice(last) });
  return out;
}
export const parts = (c: NCredit): [string, string[]][] => [['intent', [c.intent]], ['approach', c.approach], ['evidence', c.evidence], ['result', [c.result]]];

/** fills = facts to type, done = typed, miss = workbook figures still blank. */
export function creditCounts(c: NCredit, src: NSource, edits: Record<string, string>) {
  let fills = 0, done = 0, miss = 0;
  for (const [p, arr] of parts(c)) arr.forEach((t, i) => {
    for (const s of segments(t, c.id, p + i, src, edits)) {
      if (s.t === 'fill') { fills++; if (s.v.trim()) done++; } else if (s.t === 'val' && !s.v) miss++;
    }
  });
  return { fills, done, miss };
}
export const isTargeted = (c: NCredit, src: NSource) => c.id === 'Project' || (c.sc ?? [c.id]).some((i) => (src.targets[i] ?? 'Yes') !== 'No');

/** Plain text and Word-friendly HTML for one credit (fill-ins left as [[hint]] when not typed). */
export function creditDoc(c: NCredit, src: NSource, edits: Record<string, string>) {
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
  const flat = (t: string, p: string) => segments(t, c.id, p, src, edits).map((s) => (s.t === 'text' ? s.s : s.t === 'val' ? (s.v || `[${s.label.split(' (')[0]}]`) : (s.v.trim() || `[[${s.hint}]]`))).join('');
  const head = `${c.id} ${c.name}${c.pts ? ` (${c.pts})` : ''}`;
  const P = (s: string, b = false) => `<p style="font-family:'Times New Roman';font-size:12pt;margin:${b ? '6pt 0 0' : '0'}${b ? ';font-weight:bold' : ''}">${esc(s)}</p>`;
  const UL = (xs: string[]) => `<ul style="font-family:'Times New Roman';font-size:12pt;margin:0">${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const intent = flat(c.intent, 'intent0'), result = flat(c.result, 'result0');
  const ap = c.approach.map((a, i) => flat(a, 'approach' + i)), ev = c.evidence.map((a, i) => flat(a, 'evidence' + i));
  const text = [head, 'Intent', intent, 'Approach', ...ap.map((x) => '• ' + x), 'Supporting documents', ...ev.map((x) => '• ' + x), 'Result', result].join('\n') + '\n';
  const html = `<h3 style="font-family:'Times New Roman';font-size:14pt">${esc(head)}</h3>${P('Intent', true)}${P(intent)}${P('Approach', true)}${UL(ap)}${P('Supporting documents', true)}${UL(ev)}${P('Result', true)}${P(result)}`;
  return { text, html };
}

/* ── Workbook reading (no SheetJS): defined names → cached cell values ── */
// Decode XML entities, including numeric references (&#8211; &#x20B9;) that some Excel writers use for non-ASCII text.
const unxml = (s: string) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const attr = (tag: string, a: string) => { const m = new RegExp(`\\b${a}="([^"]*)"`).exec(tag); return m ? unxml(m[1]) : undefined; };
export function parseRef(ref: string) {
  const m = /^'?(.*?)'?!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?$/.exec(ref || '');
  return m ? { sheet: m[1].replace(/''/g, "'"), c1: m[2], r1: +m[3], c2: m[4], r2: m[5] ? +m[5] : null } : null;
}

export interface Workbook { names: Record<string, string>; cell: (sheet: string, addr: string) => unknown }
export function openXlsx(buf: Uint8Array): Workbook {
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(buf); } catch { throw new Error('This is not an .xlsx workbook (or it is password-protected).'); }
  const txt = (p: string) => (files[p] ? strFromU8(files[p]) : '');
  const wbx = txt('xl/workbook.xml'); if (!wbx) throw new Error('Workbook part missing: not an Excel .xlsx/.xlsm file.');
  const rels: Record<string, string> = {};
  for (const m of txt('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)) { const id = attr(m[0], 'Id'), t = attr(m[0], 'Target'); if (id && t) rels[id] = t.replace(/^\/?xl\//, '').replace(/^\//, ''); }
  const sheetPath: Record<string, string> = {};
  for (const m of wbx.matchAll(/<sheet\b[^>]*>/g)) { const n = attr(m[0], 'name'), id = attr(m[0], 'r:id'); if (n && id && rels[id]) sheetPath[n] = 'xl/' + rels[id]; }
  const names: Record<string, string> = {};
  for (const m of wbx.matchAll(/<definedName\b([^>]*)>([^<]*)<\/definedName>/g)) { if (attr(m[1], 'localSheetId') !== undefined) continue; const n = attr(m[1], 'name'); if (n) names[n] = unxml(m[2]); }
  const shared: string[] = [];
  for (const m of txt('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(unxml([...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join('')));
  const cache: Record<string, Record<string, unknown>> = {};
  const sheet = (name: string) => {
    if (cache[name]) return cache[name];
    const out: Record<string, unknown> = {}; const x = txt(sheetPath[name] ?? '');
    for (const m of x.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const r = attr(m[1], 'r'); if (!r) continue; const t = attr(m[1], 't'); const body = m[2] ?? '';
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      if (t === 'inlineStr') { const s = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((q) => q[1]).join(''); out[r] = unxml(s); continue; }
      if (v === undefined) continue;                       // formula with no cached value
      out[r] = t === 's' ? shared[+v] : t === 'b' ? v === '1' : t === 'str' || t === 'e' ? unxml(v) : Number(v);
    }
    return (cache[name] = out);
  };
  return { names, cell: (s, a) => sheet(s)[a] };
}

/** Read a filled IGBC calculation workbook into a narrative source. */
export function readIgbcWorkbook(buf: Uint8Array, DATA: NData): NSource {
  const wb = openXlsx(buf);
  const get = (n: string) => { const p = parseRef(wb.names[n]); if (!p || p.c2) return undefined; return wb.cell(p.sheet, p.c1 + p.r1); };
  const col = (n: string) => { const p = parseRef(wb.names[n]); if (!p) return []; const out: unknown[] = []; for (let r = p.r1; r <= (p.r2 ?? p.r1); r++) out.push(wb.cell(p.sheet, p.c1 + r)); return out; };
  const N = wb.names;
  const rating = N.SV_Type ? 'svc' : N.WH_Category ? 'wh' : N.Fac_Type ? 'fac' : N.SA1_Meet ? 'nb3' : N.Num_DU ? 'homes' : N.BLD_NAME ? 'nb' : null;
  if (!rating || !DATA[rating]) throw new Error('This file has no IGBC workbook names. Open a filled calculation workbook from the set (New Buildings V4.0 / V3.0, Homes V3.0, Factory V2.0, Logistics Parks & Warehouses V1.0, Service Buildings).');
  const values: Record<string, string> = {}; let blank = 0, total = 0;
  for (const [name, f] of DATA[rating].tokens) { const v = get(name); total++; if (v === undefined) blank++; values[`${name}|${f}`] = nfmt(v, f); }
  const labels: Record<string, string> = {};
  for (let r = 4; r < 3000; r++) { const b = wb.cell('Name Index', 'B' + r); if (b === undefined) { if (r > 10) break; continue; } labels[String(b)] = `${wb.cell('Name Index', 'C' + r) ?? ''} (${wb.cell('Name Index', 'D' + r) ?? ''})`; }
  const ids = col('SC_ID'), tg = col('SC_TARGET'); const targets: Record<string, string> = {};
  ids.forEach((id, i) => { if (id) targets[String(id)] = String(tg[i] || 'Yes'); });
  return { rating, values, labels, targets, project: String(get('Proj_Name') || 'the project'), sample: false, uncached: get('Total_Points') === undefined, blank, total,
    totals: { pts: get('Total_Points'), level: get('Cert_Level'), mand: get('Mandatory_All'), stage: get('Proj_Stage') } };
}

/* ── Documentation workflow ── */
export const DOC_STATUSES = ['Not started', 'Drafting', 'Internal review', 'Awaiting client', 'Ready to submit', 'Submitted', 'Reviewer query', 'Approved'] as const;
export type DocStatus = typeof DOC_STATUSES[number];
export const DOC_DONE: DocStatus[] = ['Ready to submit', 'Submitted', 'Approved'];

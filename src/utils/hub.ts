import type { GhgYear, CertProject, Lever, HubSettings, S2Method, EmissionFactor, Activity } from '../types/hub';

export const s2 = (y: GhgYear, m: S2Method) => (m === 'market' && y.scope2m != null ? y.scope2m : y.scope2);
export const s12 = (y: GhgYear, m: S2Method = 'location') => y.scope1 + s2(y, m);
export const total = (y: GhgYear, m: S2Method = 'location') => s12(y, m) + y.scope3;
export const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
export const uid = () => Math.random().toString(36).slice(2, 10);

/** Years where market-based was requested but is missing (location-based used instead). */
export const missingMarket = (ghg: GhgYear[], m: S2Method) => (m === 'market' ? ghg.filter((g) => g.scope2m == null).map((g) => g.year) : []);

export interface PathPoint { year: number; actual: number | null; pathway: number }

/** Linear absolute-contraction pathway for Scope 1+2 from the base year (first year in data). */
export function buildPathway(ghg: GhgYear[], s: HubSettings): PathPoint[] {
  if (!ghg.length) return [];
  const base = ghg[0], base12 = s12(base, s.s2Method);
  const end = Math.max(s.targetYear, ghg[ghg.length - 1].year);
  const out: PathPoint[] = [];
  for (let yr = base.year; yr <= end; yr++) {
    const row = ghg.find((g) => g.year === yr);
    out.push({ year: yr, actual: row ? s12(row, s.s2Method) : null,
      pathway: Math.max(base12 * (1 - (s.annualPct / 100) * (yr - base.year)), 0) });
  }
  return out;
}

export interface HubMetrics {
  latest: GhgYear; prev: GhgYear | null; base: GhgYear;
  latestTotal: number; totalYoY: number | null; s12VsBase: number; scope3Share: number;
  pathwayNow: number; gapNow: number; pathwayTarget: number; gapTarget: number;
  leverS12: number; leverCoverage: number;
}

export function metrics(ghg: GhgYear[], levers: Lever[], s: HubSettings): HubMetrics | null {
  if (!ghg.length) return null;
  const m = s.s2Method;
  const latest = ghg[ghg.length - 1], base = ghg[0];
  const prev = ghg.length > 1 ? ghg[ghg.length - 2] : null;
  const base12 = s12(base, m);
  const pw = (yr: number) => Math.max(base12 * (1 - (s.annualPct / 100) * (yr - base.year)), 0);
  const gapTarget = Math.max(s12(latest, m) - pw(s.targetYear), 0);
  // Implemented levers are already in actual emissions; counting them would double-count.
  const leverS12 = levers.filter((l) => l.scope !== 3 && l.status !== 'Implemented').reduce((a, l) => a + l.abatement, 0);
  const lt = total(latest, m);
  return {
    latest, prev, base, latestTotal: lt,
    totalYoY: prev && total(prev, m) ? ((lt - total(prev, m)) / total(prev, m)) * 100 : null,
    s12VsBase: base12 ? ((s12(latest, m) - base12) / base12) * 100 : 0,
    scope3Share: lt ? (latest.scope3 / lt) * 100 : 0,
    pathwayNow: pw(latest.year), gapNow: s12(latest, m) - pw(latest.year),
    pathwayTarget: pw(s.targetYear), gapTarget,
    leverS12, leverCoverage: gapTarget > 0 ? (leverS12 / gapTarget) * 100 : 100,
  };
}

export const projectGap = (p: CertProject) => Math.max(p.needed - p.secured, 0);
export const atRisk = (p: CertProject) => p.stage !== 'Certified' && p.secured + p.likely < p.needed;
export const onTrack = (p: CertProject) => p.secured >= p.needed;

/* ── Activity data → emissions ── */
export const activityT = (a: Activity, f?: EmissionFactor) => (f ? (a.quantity * f.kgPerUnit) / 1000 : 0); // tCO2e

export interface ActivityRollup { year: number; scope1: number; scope2: number; scope2m: number; hasMarket: boolean; scope3: number; count: number }
export function rollupActivities(acts: Activity[], factors: EmissionFactor[]): ActivityRollup[] {
  const by = new Map<number, ActivityRollup>();
  for (const a of acts) {
    const f = factors.find((x) => x.id === a.factorId); if (!f) continue;
    const r = by.get(a.year) ?? { year: a.year, scope1: 0, scope2: 0, scope2m: 0, hasMarket: false, scope3: 0, count: 0 };
    const t = activityT(a, f);
    if (f.scope === 1) r.scope1 += t;
    else if (f.scope === 3) r.scope3 += t;
    else if (f.s2basis === 'market') { r.scope2m += t; r.hasMarket = true; }
    else r.scope2 += t;
    r.count++; by.set(a.year, r);
  }
  return [...by.values()].sort((a, b) => a.year - b.year);
}

/* ── CSV ── */
const num = (v: string | undefined) => (v === undefined || v === '' ? null : Number(v));

/** Parse "year,scope1,scope2,scope3[,scope2_market]" CSV (header required). Throws with a readable message. */
export function parseGhgCsv(text: string): GhgYear[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error('File needs a header row and at least one data row.');
  const head = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const idx = ['year', 'scope1', 'scope2', 'scope3'].map((k) => head.indexOf(k));
  const im = head.indexOf('scope2_market');
  if (idx.some((i) => i < 0)) throw new Error('Header must include: year,scope1,scope2,scope3 (optional: scope2_market)');
  const rows = lines.slice(1).map((ln, i) => {
    const c = ln.split(',').map((v) => v.trim());
    const nums = idx.map((j) => Number(c[j]));
    if (nums.some((n) => !Number.isFinite(n) || n < 0)) throw new Error(`Row ${i + 2}: values must be non-negative numbers.`);
    const mk = im >= 0 ? num(c[im]) : null;
    if (mk !== null && (!Number.isFinite(mk) || mk < 0)) throw new Error(`Row ${i + 2}: scope2_market must be a non-negative number or blank.`);
    return { year: nums[0], scope1: nums[1], scope2: nums[2], scope2m: mk, scope3: nums[3] };
  });
  const years = rows.map((r) => r.year);
  if (new Set(years).size !== years.length) throw new Error('Each year may appear only once.');
  return rows.sort((a, b) => a.year - b.year);
}

const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCsv = (head: string[], rows: unknown[][]) => [head, ...rows].map((r) => r.map(esc).join(',')).join('\n') + '\n';

export const GHG_TEMPLATE = 'year,scope1,scope2,scope3,scope2_market\n2022,0,0,0,\n2023,0,0,0,\n2024,0,0,0,\n';

export const download = (name: string, text: string, type = 'text/csv') => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

/** LEED v4 / v4.1 BD+C (New Construction) category maxima — 110 points total. */
export const LEED_BDC_CATEGORIES = [
  ['Integrative Process', 1], ['Location & Transport', 16], ['Sustainable Sites', 10], ['Water Efficiency', 11],
  ['Energy & Atmosphere', 33], ['Materials & Resources', 13], ['Indoor Env. Quality', 16], ['Innovation', 6], ['Regional Priority', 4],
].map(([name, max]) => ({ name: name as string, max: max as number, secured: 0, likely: 0 }));

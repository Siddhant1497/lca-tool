import { REVENUE_UNITS, S3_CATEGORIES, type GhgYear, type CertProject, type Lever, type HubSettings, type S2Method, type EmissionFactor, type Activity } from '../types/hub';

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

export interface ActivityRollup { year: number; scope1: number; scope2: number; scope2m: number; hasMarket: boolean; scope3: number; s3cats: Record<number, number>; count: number }
export function rollupActivities(acts: Activity[], factors: EmissionFactor[]): ActivityRollup[] {
  const by = new Map<number, ActivityRollup>();
  for (const a of acts) {
    const f = factors.find((x) => x.id === a.factorId); if (!f) continue;
    const r = by.get(a.year) ?? { year: a.year, scope1: 0, scope2: 0, scope2m: 0, hasMarket: false, scope3: 0, s3cats: {}, count: 0 };
    const t = activityT(a, f);
    if (f.scope === 1) r.scope1 += t;
    else if (f.scope === 3) { r.scope3 += t; if (f.s3cat) r.s3cats[f.s3cat] = (r.s3cats[f.s3cat] ?? 0) + t; }
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


/* ── Scope 3 categories ── */
export const s3Sum = (c?: Partial<Record<number, number>>) => Object.values(c ?? {}).reduce<number>((a, v) => a + (v ?? 0), 0);
export const hasS3Cats = (g?: GhgYear) => !!g?.s3cats && Object.values(g.s3cats).some((v) => (v ?? 0) > 0);
export const s3Rows = (g: GhgYear) => S3_CATEGORIES.map((c) => ({ ...c, value: g.s3cats?.[c.n] ?? 0 })).filter((c) => c.value > 0).sort((a, b) => b.value - a.value);

/* ── Intensity ── */
export interface Intensity { year: number; perM2: number | null; perFte: number | null; perRev: number | null; perRupee: number | null }
/** S1+2 intensities. perM2 in kgCO2e/m², perFte in tCO2e/FTE, perRev in tCO2e per revenue unit, perRupee in tCO2e per ₹ (BRSR). */
export function intensities(ghg: GhgYear[], s: HubSettings): Intensity[] {
  const ru = REVENUE_UNITS.find((u) => u.id === s.revenueUnit);
  return ghg.map((g) => {
    const e = s12(g, s.s2Method), d = g.denom ?? {};
    return {
      year: g.year,
      perM2: d.area ? (e * 1000) / d.area : null,
      perFte: d.fte ? e / d.fte : null,
      perRev: d.revenue ? e / d.revenue : null,
      perRupee: d.revenue && ru?.base === '₹' ? e / (d.revenue * ru.mult) : null,
    };
  });
}

/* ── Lever delivery projection ── */
export interface ProjPoint { year: number; projected: number }
/** Latest Scope 1+2 minus open (non-implemented) S1+2 levers whose delivery year has arrived. */
export function leverProjection(ghg: GhgYear[], levers: Lever[], s: HubSettings): { points: ProjPoint[]; undated: number } {
  if (!ghg.length) return { points: [], undated: 0 };
  const latest = ghg[ghg.length - 1], start = s12(latest, s.s2Method);
  const open = levers.filter((l) => l.scope !== 3 && l.status !== 'Implemented');
  const dated = open.filter((l) => l.year);
  const points: ProjPoint[] = [];
  for (let y = latest.year; y <= Math.max(s.targetYear, latest.year); y++) {
    const cut = dated.filter((l) => (l.year as number) <= y && y > latest.year).reduce((a, l) => a + l.abatement, 0);
    points.push({ year: y, projected: Math.max(start - cut, 0) });
  }
  return { points, undated: open.length - dated.length };
}

/* ── MACC ── */
export interface MaccBar { id: string; name: string; x0: number; x1: number; cost: number; scope: number; status: string }
/** Marginal abatement cost curve: levers with a cost, cheapest first, width = abatement. */
export function macc(levers: Lever[]): MaccBar[] {
  let x = 0;
  return levers.filter((l) => l.costPerT != null && l.abatement > 0 && l.status !== 'Implemented')
    .sort((a, b) => (a.costPerT as number) - (b.costPerT as number))
    .map((l) => { const b = { id: l.id, name: l.name, x0: x, x1: x + l.abatement, cost: l.costPerT as number, scope: l.scope, status: l.status }; x += l.abatement; return b; });
}

/* ── Disclosures ── */
export type DStatus = 'ok' | 'partial' | 'missing';
export interface DLine { ref: string; item: string; value: string; prev?: string; unit: string; status: DStatus; note?: string; num?: number | null; prevNum?: number | null }
export interface DFramework { id: string; name: string; scope: string; lines: DLine[] }

const v = (n: number | null | undefined, d = 0) => (n == null || !Number.isFinite(n) ? '—' : fmt(n, d));
const sci = (n: number | null) => (n == null ? '—' : n.toExponential(3));

export function disclosures(ghg: GhgYear[], s: HubSettings, year: number): DFramework[] {
  const i = ghg.findIndex((g) => g.year === year);
  const g = ghg[i], p = i > 0 ? ghg[i - 1] : undefined, base = ghg[0];
  if (!g) return [];
  const ints = intensities(ghg, s), it = ints[i], ip = i > 0 ? ints[i - 1] : undefined;
  const mk = g.scope2m != null, cats = hasS3Cats(g);
  const st = (ok: boolean, partial = false): DStatus => (ok ? 'ok' : partial ? 'partial' : 'missing');
  const red = s12(base, s.s2Method) - s12(g, s.s2Method);
  const catList = cats ? 'Cat ' + s3Rows(g).map((c) => c.n).sort((a, b) => a - b).join(', ') : '';
  const out: DFramework[] = [
    { id: 'ghgp', name: 'GHG Protocol Corporate Standard', scope: 'Inventory reporting', lines: [
      { ref: 'Scope 1', item: 'Direct emissions', value: v(g.scope1), prev: p && v(p.scope1), unit: 'tCO₂e', status: 'ok' },
      { ref: 'Scope 2', item: 'Location-based', value: v(g.scope2), prev: p && v(p.scope2), unit: 'tCO₂e', status: 'ok' },
      { ref: 'Scope 2', item: 'Market-based', value: mk ? v(g.scope2m) : '—', prev: p?.scope2m != null ? v(p.scope2m) : undefined, unit: 'tCO₂e', status: st(mk), note: mk ? undefined : 'Dual reporting is required where contractual instruments exist' },
      { ref: 'Scope 3', item: 'Value-chain emissions', value: v(g.scope3), prev: p && v(p.scope3), unit: 'tCO₂e', status: st(cats, g.scope3 > 0), note: cats ? `Categories: ${catList}` : 'Report by category and explain exclusions' },
      { ref: 'Base year', item: `Base year ${base.year} Scope 1+2`, value: v(s12(base, s.s2Method)), unit: 'tCO₂e', status: 'ok', note: 'State the recalculation policy' },
    ] },
    { id: 'gri', name: 'GRI 305: Emissions (2016)', scope: 'Sustainability report', lines: [
      { ref: '305-1', item: 'Direct (Scope 1) GHG emissions', value: v(g.scope1), prev: p && v(p.scope1), unit: 'tCO₂e', status: 'ok' },
      { ref: '305-2', item: 'Energy indirect (Scope 2), location-based', value: v(g.scope2), prev: p && v(p.scope2), unit: 'tCO₂e', status: 'ok' },
      { ref: '305-2', item: 'Energy indirect (Scope 2), market-based', value: mk ? v(g.scope2m) : '—', prev: p?.scope2m != null ? v(p.scope2m) : undefined, unit: 'tCO₂e', status: st(mk) },
      { ref: '305-3', item: 'Other indirect (Scope 3) GHG emissions', value: v(g.scope3), prev: p && v(p.scope3), unit: 'tCO₂e', status: st(cats, g.scope3 > 0), note: cats ? catList : 'List the categories included' },
      { ref: '305-4', item: 'GHG intensity (S1+2 per m²)', value: v(it.perM2, 1), prev: ip && v(ip.perM2, 1), unit: 'kgCO₂e/m²', status: st(it.perM2 != null) },
      { ref: '305-4', item: `GHG intensity (S1+2 per ${s.revenueUnit})`, value: v(it.perRev, 2), prev: ip && v(ip.perRev, 2), unit: `tCO₂e/${s.revenueUnit}`, status: st(it.perRev != null) },
      { ref: '305-5', item: `Reduction vs base year ${base.year} (S1+2)`, value: v(red), unit: 'tCO₂e', status: base.year === g.year ? 'partial' : 'ok', note: red < 0 ? 'Emissions increased vs base year' : undefined },
    ] },
    { id: 'brsr', name: 'BRSR · Principle 6', scope: 'SEBI listed entities (India)', lines: [
      { ref: 'P6 · E7', item: 'Total Scope 1 emissions', value: v(g.scope1), prev: p && v(p.scope1), unit: 'tCO₂e', status: 'ok', note: 'Gas-wise break-up (CO₂, CH₄, N₂O, HFCs…) if available' },
      { ref: 'P6 · E7', item: 'Total Scope 2 emissions', value: v(s2(g, s.s2Method)), prev: p && v(s2(p, s.s2Method)), unit: 'tCO₂e', status: 'ok', note: `${s.s2Method}-based` },
      { ref: 'P6 · E7', item: 'Scope 1+2 per rupee of turnover', value: sci(it.perRupee), prev: ip && sci(ip.perRupee), unit: 'tCO₂e/₹', status: st(it.perRupee != null), note: it.perRupee == null ? 'Needs turnover in a ₹ unit' : 'Add the PPP-adjusted figure if you report BRSR Core' },
      { ref: 'P6 · E7', item: 'Scope 1+2 intensity, physical (per m²)', value: v(it.perM2, 1), prev: ip && v(ip.perM2, 1), unit: 'kgCO₂e/m²', status: st(it.perM2 != null) },
      { ref: 'P6 · L2', item: 'Total Scope 3 emissions', value: v(g.scope3), prev: p && v(p.scope3), unit: 'tCO₂e', status: st(g.scope3 > 0) },
    ] },
    { id: 'issb', name: 'IFRS S2 (ISSB)', scope: 'Climate-related disclosures', lines: [
      { ref: '¶29(a)', item: 'Absolute gross Scope 1', value: v(g.scope1), unit: 'tCO₂e', status: 'ok' },
      { ref: '¶29(a)', item: 'Absolute gross Scope 2 (location-based)', value: v(g.scope2), unit: 'tCO₂e', status: 'ok', note: 'Add information on contractual instruments' },
      { ref: '¶29(a)', item: 'Absolute gross Scope 3, with categories included', value: v(g.scope3), unit: 'tCO₂e', status: st(cats, g.scope3 > 0), note: cats ? catList : 'Category list required' },
      { ref: '¶33–36', item: `Target: ${s.annualPct}%/yr linear to ${s.targetYear}`, value: v(Math.max(s12(base, s.s2Method) * (1 - (s.annualPct / 100) * (s.targetYear - base.year)), 0)), unit: 'tCO₂e S1+2', status: 'partial', note: 'Describe target scope, base year and progress' },
    ] },
  ];
  // Machine-readable copies of each value for spreadsheet export.
  const toNum = (x?: string) => (x == null || x === '—' ? null : Number(x.replace(/,/g, '')));
  for (const f of out) for (const l of f.lines) { l.num = toNum(l.value); l.prevNum = toNum(l.prev); }
  return out;
}

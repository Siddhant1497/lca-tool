import type { GhgYear, CertProject, Lever, HubSettings } from '../types/hub';

export const total = (y: GhgYear) => y.scope1 + y.scope2 + y.scope3;
export const s12 = (y: GhgYear) => y.scope1 + y.scope2;
export const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });

export interface PathPoint { year: number; actual: number | null; pathway: number }

/** Linear absolute-contraction pathway for Scope 1+2 from the base year (first year in data). */
export function buildPathway(ghg: GhgYear[], s: HubSettings): PathPoint[] {
  if (!ghg.length) return [];
  const base = ghg[0];
  const base12 = s12(base);
  const end = Math.max(s.targetYear, ghg[ghg.length - 1].year);
  const out: PathPoint[] = [];
  for (let yr = base.year; yr <= end; yr++) {
    const row = ghg.find((g) => g.year === yr);
    out.push({
      year: yr,
      actual: row ? s12(row) : null,
      pathway: Math.max(base12 * (1 - (s.annualPct / 100) * (yr - base.year)), 0),
    });
  }
  return out;
}

export interface HubMetrics {
  latest: GhgYear; prev: GhgYear | null; base: GhgYear;
  totalYoY: number | null; s12VsBase: number; scope3Share: number;
  pathwayNow: number; gapNow: number;               // + = above pathway (behind)
  pathwayTarget: number; gapTarget: number;         // required cut from latest to target-year pathway
  leverS12: number; leverCoverage: number;          // coverage of gapTarget by Scope 1+2 levers
}

export function metrics(ghg: GhgYear[], levers: Lever[], s: HubSettings): HubMetrics | null {
  if (!ghg.length) return null;
  const latest = ghg[ghg.length - 1], base = ghg[0];
  const prev = ghg.length > 1 ? ghg[ghg.length - 2] : null;
  const base12 = s12(base);
  const pw = (yr: number) => Math.max(base12 * (1 - (s.annualPct / 100) * (yr - base.year)), 0);
  const gapTarget = Math.max(s12(latest) - pw(s.targetYear), 0);
  // Implemented levers are already in actual emissions; counting them would double-count.
  const leverS12 = levers.filter((l) => l.scope !== 3 && l.status !== 'Implemented').reduce((a, l) => a + l.abatement, 0);
  return {
    latest, prev, base,
    totalYoY: prev ? ((total(latest) - total(prev)) / total(prev)) * 100 : null,
    s12VsBase: base12 ? ((s12(latest) - base12) / base12) * 100 : 0,
    scope3Share: total(latest) ? (latest.scope3 / total(latest)) * 100 : 0,
    pathwayNow: pw(latest.year), gapNow: s12(latest) - pw(latest.year),
    pathwayTarget: pw(s.targetYear), gapTarget,
    leverS12, leverCoverage: gapTarget > 0 ? Math.min((leverS12 / gapTarget) * 100, 999) : 100,
  };
}

export const projectGap = (p: CertProject) => Math.max(p.needed - p.secured, 0);
export const atRisk = (p: CertProject) => p.stage !== 'Certified' && p.secured + p.likely < p.needed;
export const onTrack = (p: CertProject) => p.secured >= p.needed;

/** Parse "year,scope1,scope2,scope3" CSV (header required). Throws with a readable message. */
export function parseGhgCsv(text: string): GhgYear[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('File needs a header row and at least one data row.');
  const head = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = ['year', 'scope1', 'scope2', 'scope3'].map((k) => head.indexOf(k));
  if (idx.some((i) => i < 0)) throw new Error('Header must be: year,scope1,scope2,scope3');
  const rows = lines.slice(1).map((ln, i) => {
    const c = ln.split(',').map((v) => v.trim());
    const nums = idx.map((j) => Number(c[j]));
    if (nums.some((n) => !Number.isFinite(n) || n < 0)) throw new Error(`Row ${i + 2}: values must be non-negative numbers.`);
    return { year: nums[0], scope1: nums[1], scope2: nums[2], scope3: nums[3] };
  });
  return rows.sort((a, b) => a.year - b.year);
}

export const GHG_TEMPLATE = 'year,scope1,scope2,scope3\n2022,0,0,0\n2023,0,0,0\n2024,0,0,0\n';

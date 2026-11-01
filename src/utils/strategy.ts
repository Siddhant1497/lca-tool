import type { GhgYear, HubSettings, Lever, EmissionFactor, Activity } from '../types/hub';
import { S3_CATEGORIES } from '../types/hub';
import { s12, s2, activityT, hasS3Cats } from './hub';
import { sourceKeyOf, type SourceKey } from '../data/measures';

/**
 * Two-stage target trajectory: linear near-term reduction from the base year, then linear to the
 * long-term residual (base × (1 − nzPct)) at the net-zero year, flat after that.
 */
export function targetAt(base: number, baseYear: number, ratePct: number, nearYear: number, nzYear: number, nzPct: number, year: number) {
  const residual = base * (1 - nzPct / 100);
  const near = Math.max(base * (1 - (ratePct / 100) * (nearYear - baseYear)), residual);
  if (year <= baseYear) return base;
  if (year <= nearYear) return Math.max(base * (1 - (ratePct / 100) * (year - baseYear)), residual);
  if (year >= nzYear) return residual;
  return near + ((residual - near) * (year - nearYear)) / (nzYear - nearYear);
}

export interface TrajPoint { year: number; s12: number | null; s3: number | null; s12t: number; s3t: number }
export function trajectory(ghg: GhgYear[], s: HubSettings): TrajPoint[] {
  if (!ghg.length) return [];
  const b = ghg[0], b12 = s12(b, s.s2Method), b3 = b.scope3;
  const out: TrajPoint[] = [];
  for (let y = b.year; y <= Math.max(s.netZeroYear, s.targetYear); y++) {
    const g = ghg.find((x) => x.year === y);
    out.push({ year: y, s12: g ? s12(g, s.s2Method) : null, s3: g ? g.scope3 : null,
      s12t: targetAt(b12, b.year, s.annualPct, s.targetYear, s.netZeroYear, s.nzPct, y),
      s3t: targetAt(b3, b.year, s.s3Pct, s.targetYear, s.netZeroYear, s.nzPct, y) });
  }
  return out;
}

export interface ScopeGap { label: string; base: number; latest: number; target: number; cut: number; levers: number; coverage: number; residual: number }
export function scopeGaps(ghg: GhgYear[], levers: Lever[], s: HubSettings): ScopeGap[] {
  if (!ghg.length) return [];
  const b = ghg[0], l = ghg[ghg.length - 1];
  const open = (f: (x: Lever) => boolean) => levers.filter((x) => x.status !== 'Implemented' && f(x)).reduce((a, x) => a + x.abatement, 0);
  const mk = (label: string, base: number, latest: number, rate: number, lev: number): ScopeGap => {
    const target = targetAt(base, b.year, rate, s.targetYear, s.netZeroYear, s.nzPct, s.targetYear);
    const cut = Math.max(latest - target, 0);
    return { label, base, latest, target, cut, levers: lev, coverage: cut > 0 ? (lev / cut) * 100 : 100, residual: base * (1 - s.nzPct / 100) };
  };
  return [
    mk('Scope 1+2', s12(b, s.s2Method), s12(l, s.s2Method), s.annualPct, open((x) => x.scope !== 3)),
    mk('Scope 3', b.scope3, l.scope3, s.s3Pct, open((x) => x.scope === 3)),
  ];
}

export interface Hotspot { key: SourceKey; label: string; value: number; share: number; scope: 1 | 2 | 3 }
/**
 * Where emissions come from in the latest year. Uses activity data when it exists for that year
 * (finest grain), otherwise the inventory split (Scope 1, Scope 2, Scope 3 categories).
 */
export function hotspots(ghg: GhgYear[], factors: EmissionFactor[], acts: Activity[], s: HubSettings): Hotspot[] {
  if (!ghg.length) return [];
  const l = ghg[ghg.length - 1];
  const m = new Map<SourceKey, { value: number; scope: 1 | 2 | 3; label?: string }>();
  const add = (k: SourceKey, v: number, scope: 1 | 2 | 3, label?: string) => { const c = m.get(k) ?? { value: 0, scope, label }; c.value += v; m.set(k, c); };
  const yActs = acts.filter((a) => a.year === l.year);
  const covered = new Set<number>();
  for (const a of yActs) {
    const f = factors.find((x) => x.id === a.factorId); if (!f || (f.scope === 2 && f.s2basis !== s.s2Method && f.s2basis)) continue;
    add(sourceKeyOf(f.name, f.scope, f.s3cat), activityT(a, f), f.scope); covered.add(f.scope);
  }
  if (!covered.has(1) && l.scope1 > 0) add('fuel', l.scope1, 1, 'Scope 1 (fuels, refrigerants, fleet)');
  if (!covered.has(2) && s2(l, s.s2Method) > 0) add('electricity', s2(l, s.s2Method), 2);
  if (!covered.has(3) && l.scope3 > 0) {
    if (hasS3Cats(l)) for (const c of S3_CATEGORIES) { const v = l.s3cats?.[c.n] ?? 0; if (v > 0) add(([1, 2, 3, 4, 5, 6, 7, 11, 13].includes(c.n) ? `cat${c.n}` : 'cat1') as SourceKey, v, 3); }
    else add('cat1', l.scope3, 3, 'Scope 3 (not split by category)');
  }
  const tot = [...m.values()].reduce((a, x) => a + x.value, 0) || 1;
  return [...m.entries()].map(([key, x]) => ({ key, label: x.label ?? '', value: x.value, share: (x.value / tot) * 100, scope: x.scope })).sort((a, b) => b.value - a.value);
}

export type Phase = 'Now' | 'Next' | 'Later' | 'Unscheduled';
export const phaseOf = (l: Lever, latestYear: number): Phase => (!l.year ? 'Unscheduled' : l.year <= latestYear + 2 ? 'Now' : l.year <= latestYear + 5 ? 'Next' : 'Later');

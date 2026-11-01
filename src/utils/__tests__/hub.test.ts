import { describe, it, expect } from 'vitest';
import {
  s2, s12, total, buildPathway, metrics, parseGhgCsv, rollupActivities, activityT, leverProjection, macc,
  intensities, disclosures, atRisk, onTrack, s3Sum, toCsv, missingMarket,
} from '../hub';
import { migrate } from '../../context/HubContext';
import type { GhgYear, HubSettings, Lever, EmissionFactor, Activity, CertProject } from '../../types/hub';

const S: HubSettings = { targetYear: 2030, annualPct: 4.2, s2Method: 'location', revenueUnit: '₹ crore', currency: '₹', orgName: '', modules: { certs: true, lca: true }, s3Pct: 2.5, netZeroYear: 2050, nzPct: 90 };
const G: GhgYear[] = [
  { year: 2019, scope1: 1000, scope2: 4000, scope3: 10000 },
  { year: 2024, scope1: 800, scope2: 3000, scope2m: 2000, scope3: 9000, denom: { area: 50000, fte: 1000, revenue: 500 } },
];

describe('scope helpers', () => {
  it('uses market-based Scope 2 only when present', () => {
    expect(s2(G[1], 'market')).toBe(2000);
    expect(s2(G[0], 'market')).toBe(4000); // falls back to location
    expect(s12(G[1], 'market')).toBe(2800);
    expect(total(G[1])).toBe(12800);
  });
  it('flags years missing market-based', () => {
    expect(missingMarket(G, 'market')).toEqual([2019]);
    expect(missingMarket(G, 'location')).toEqual([]);
  });
});

describe('pathway & metrics', () => {
  it('builds a linear pathway from the base year', () => {
    const p = buildPathway(G, S);
    expect(p[0]).toMatchObject({ year: 2019, actual: 5000, pathway: 5000 });
    const y2030 = p.find((x) => x.year === 2030)!;
    expect(y2030.pathway).toBeCloseTo(5000 * (1 - 0.042 * 11), 6);
    expect(y2030.actual).toBeNull();
  });
  it('never goes below zero', () => {
    const p = buildPathway(G, { ...S, annualPct: 20, targetYear: 2030 });
    expect(Math.min(...p.map((x) => x.pathway))).toBe(0);
  });
  it('excludes implemented levers from gap coverage (no double count)', () => {
    const lv: Lever[] = [
      { id: 'a', name: 'done', scope: 2, abatement: 500, status: 'Implemented' },
      { id: 'b', name: 'open', scope: 1, abatement: 300, status: 'Planned' },
      { id: 'c', name: 's3', scope: 3, abatement: 900, status: 'Planned' },
    ];
    const m = metrics(G, lv, S)!;
    expect(m.leverS12).toBe(300);
    expect(m.gapTarget).toBeCloseTo(3800 - 5000 * (1 - 0.042 * 11), 6);
    expect(m.s12VsBase).toBeCloseTo(-24, 6);
  });
  it('returns null without data', () => expect(metrics([], [], S)).toBeNull());
});

describe('lever projection & MACC', () => {
  const lv: Lever[] = [
    { id: 'a', name: 'A', scope: 2, abatement: 400, status: 'Planned', year: 2026, costPerT: 500 },
    { id: 'b', name: 'B', scope: 1, abatement: 200, status: 'Planned', year: 2028, costPerT: -1000 },
    { id: 'c', name: 'C', scope: 2, abatement: 100, status: 'Identified' },
    { id: 'd', name: 'D', scope: 2, abatement: 999, status: 'Implemented', year: 2025, costPerT: -50 },
  ];
  it('steps down as dated levers deliver', () => {
    const { points, undated } = leverProjection(G, lv, S);
    expect(undated).toBe(1);
    expect(points.find((p) => p.year === 2024)!.projected).toBe(3800);
    expect(points.find((p) => p.year === 2026)!.projected).toBe(3400);
    expect(points.find((p) => p.year === 2030)!.projected).toBe(3200);
  });
  it('orders MACC cheapest first with cumulative widths, skipping implemented and uncosted', () => {
    const m = macc(lv);
    expect(m.map((b) => b.id)).toEqual(['b', 'a']);
    expect(m[0]).toMatchObject({ x0: 0, x1: 200, cost: -1000 });
    expect(m[1]).toMatchObject({ x0: 200, x1: 600 });
  });
});

describe('CSV import', () => {
  it('parses, sorts and reads optional market column', () => {
    const r = parseGhgCsv('year,scope1,scope2,scope3,scope2_market\n2024,1,2,3,1.5\n2023,4,5,6,\n');
    expect(r.map((x) => x.year)).toEqual([2023, 2024]);
    expect(r[1].scope2m).toBe(1.5);
    expect(r[0].scope2m).toBeNull();
  });
  it('rejects bad headers, negatives and duplicate years', () => {
    expect(() => parseGhgCsv('a,b\n1,2')).toThrow(/Header/);
    expect(() => parseGhgCsv('year,scope1,scope2,scope3\n2024,-1,2,3')).toThrow(/non-negative/);
    expect(() => parseGhgCsv('year,scope1,scope2,scope3\n2024,1,2,3\n2024,1,2,3')).toThrow(/once/);
  });
  it('escapes CSV output', () => expect(toCsv(['a'], [['x,"y"']])).toBe('a\n"x,""y"""\n'));
});

describe('activity calculator', () => {
  const F: EmissionFactor[] = [
    { id: 'e', name: 'grid', unit: 'kWh', kgPerUnit: 0.5, scope: 2, s2basis: 'location', source: 't' },
    { id: 'm', name: 'green', unit: 'kWh', kgPerUnit: 0.1, scope: 2, s2basis: 'market', source: 't' },
    { id: 'c', name: 'steel', unit: 'kg', kgPerUnit: 2, scope: 3, s3cat: 1, source: 't' },
  ];
  const A: Activity[] = [
    { id: '1', year: 2024, factorId: 'e', description: '', quantity: 10000 },
    { id: '2', year: 2024, factorId: 'm', description: '', quantity: 10000 },
    { id: '3', year: 2024, factorId: 'c', description: '', quantity: 500 },
  ];
  it('converts kg to tonnes', () => expect(activityT(A[0], F[0])).toBe(5));
  it('rolls up by scope, Scope 2 basis and Scope 3 category', () => {
    const [r] = rollupActivities(A, F);
    expect(r).toMatchObject({ scope2: 5, scope2m: 1, hasMarket: true, scope3: 1, count: 3 });
    expect(r.s3cats[1]).toBe(1);
  });
});

describe('intensity & disclosures', () => {
  it('computes S1+2 intensities, BRSR per rupee for ₹ units only', () => {
    const it2024 = intensities(G, S)[1];
    expect(it2024.perM2).toBeCloseTo(76, 6);           // 3800 t → kg / 50 000 m²
    expect(it2024.perFte).toBeCloseTo(3.8, 6);
    expect(it2024.perRupee).toBeCloseTo(3800 / (500 * 1e7), 15);
    expect(intensities(G, { ...S, revenueUnit: 'USD million' })[1].perRupee).toBeNull();
  });
  it('marks missing items honestly', () => {
    const f = disclosures(G, S, 2019);
    const gri = f.find((x) => x.id === 'gri')!;
    expect(gri.lines.find((l) => l.item.includes('market'))!.status).toBe('missing');
    expect(gri.lines.find((l) => l.ref === '305-4')!.status).toBe('missing');
    const g24 = disclosures(G, S, 2024).find((x) => x.id === 'gri')!;
    expect(g24.lines.find((l) => l.item.includes('market'))!.status).toBe('ok');
  });
  it('sums Scope 3 categories', () => expect(s3Sum({ 1: 10, 4: 2.5 })).toBe(12.5));
});

describe('certification status', () => {
  const p = (o: Partial<CertProject>): CertProject => ({ id: 'x', name: 'x', system: 'LEED', version: '', targetLabel: 'Gold', needed: 60, secured: 40, likely: 10, max: 110, unit: 'pts', stage: 'Design', next: '', ...o });
  it('at risk when secured + likely < needed', () => {
    expect(atRisk(p({}))).toBe(true);
    expect(atRisk(p({ likely: 20 }))).toBe(false);
    expect(atRisk(p({ stage: 'Certified' }))).toBe(false);
    expect(onTrack(p({ secured: 60 }))).toBe(true);
  });
});

describe('saved-state migration', () => {
  it('fills fields added in later versions', () => {
    const m = migrate({ ghg: [G[1], G[0]], projects: [] } as never);
    expect(m.ghg[0].year).toBe(2019);
    expect(m.factors).toEqual([]);
    expect(m.settings.revenueUnit).toBe('₹ crore');
    expect(m.settings.s2Method).toBe('location');
  });
});

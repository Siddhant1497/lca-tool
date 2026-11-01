import { describe, it, expect } from 'vitest';
import { targetAt, scopeGaps, hotspots, phaseOf, trajectory } from '../strategy';
import { parseCsv, detectDesnz, desnzCandidates, genericCandidates, toNumber, scopeOf } from '../factorImport';
import { sourceKeyOf, MEASURES } from '../../data/measures';
import { reducer, EMPTY } from '../../context/HubContext';
import type { GhgYear, HubSettings, Lever, EmissionFactor, Activity } from '../../types/hub';

const S: HubSettings = { targetYear: 2030, annualPct: 4.2, s2Method: 'location', revenueUnit: '₹ crore', currency: '₹', orgName: '',
  modules: { certs: true, lca: true }, s3Pct: 2.5, netZeroYear: 2050, nzPct: 90 };
const G: GhgYear[] = [{ year: 2020, scope1: 1000, scope2: 3000, scope3: 10000 }, { year: 2024, scope1: 900, scope2: 2600, scope3: 9800, s3cats: { 1: 6000, 2: 3000, 6: 800 } }];

describe('target trajectory', () => {
  it('is linear to the near-term year, then linear to the residual, then flat', () => {
    expect(targetAt(1000, 2020, 4.2, 2030, 2050, 90, 2020)).toBe(1000);
    expect(targetAt(1000, 2020, 4.2, 2030, 2050, 90, 2030)).toBeCloseTo(580, 9);
    expect(targetAt(1000, 2020, 4.2, 2030, 2050, 90, 2040)).toBeCloseTo((580 + 100) / 2, 9);
    expect(targetAt(1000, 2020, 4.2, 2030, 2050, 90, 2050)).toBeCloseTo(100, 9);
    expect(targetAt(1000, 2020, 4.2, 2030, 2050, 90, 2060)).toBeCloseTo(100, 9);
  });
  it('never drops below the residual even with an aggressive near-term rate', () => {
    expect(targetAt(1000, 2020, 20, 2030, 2050, 90, 2030)).toBeCloseTo(100, 9);
  });
  it('covers base year to net-zero year', () => {
    const t = trajectory(G, S);
    expect(t[0].year).toBe(2020); expect(t[t.length - 1].year).toBe(2050);
    expect(t.find((x) => x.year === 2024)!.s12).toBe(3500);
  });
});

describe('scope gaps', () => {
  it('counts open levers per scope and computes coverage', () => {
    const lv: Lever[] = [
      { id: 'a', name: 'a', scope: 2, abatement: 500, status: 'Planned' },
      { id: 'b', name: 'b', scope: 3, abatement: 700, status: 'Identified' },
      { id: 'c', name: 'c', scope: 1, abatement: 999, status: 'Implemented' },
    ];
    const [g12, g3] = scopeGaps(G, lv, S);
    expect(g12.target).toBeCloseTo(4000 * (1 - 0.042 * 10), 9);   // 2320
    expect(g12.cut).toBeCloseTo(3500 - 2320, 9);
    expect(g12.levers).toBe(500);
    expect(g3.target).toBeCloseTo(10000 * (1 - 0.025 * 10), 9);   // 7500
    expect(g3.levers).toBe(700);
    expect(g3.residual).toBeCloseTo(1000, 9);
  });
});

describe('hotspots', () => {
  it('falls back to inventory split by Scope 3 category', () => {
    const h = hotspots(G, [], [], S);
    expect(h.map((x) => x.key)).toEqual(['cat1', 'cat2', 'electricity', 'fuel', 'cat6']);
    expect(h.reduce((a, x) => a + x.share, 0)).toBeCloseTo(100, 9);
  });
  it('uses activity data where it exists for the latest year', () => {
    const F: EmissionFactor[] = [{ id: 'd', name: 'Diesel (100% mineral)', unit: 'litres', kgPerUnit: 2.5, scope: 1, source: 'x' },
      { id: 'r', name: 'Refrigerant R-410A', unit: 'kg', kgPerUnit: 2000, scope: 1, source: 'x' }];
    const A: Activity[] = [{ id: '1', year: 2024, factorId: 'd', description: '', quantity: 100000 }, { id: '2', year: 2024, factorId: 'r', description: '', quantity: 50 }];
    const h = hotspots(G, F, A, S);
    expect(h.find((x) => x.key === 'fuel')!.value).toBe(250);
    expect(h.find((x) => x.key === 'refrigerant')!.value).toBe(100);
  });
  it('classifies factor names into sources', () => {
    expect(sourceKeyOf('Refrigerant R-410A', 1)).toBe('refrigerant');
    expect(sourceKeyOf('Passenger vehicles › Cars (by size) · Medium car', 1)).toBe('fleet');
    expect(sourceKeyOf('Fuels › Liquid fuels › Diesel', 1)).toBe('fuel');
    expect(sourceKeyOf('anything', 2)).toBe('electricity');
    expect(sourceKeyOf('Flights', 3, 6)).toBe('cat6');
    expect(sourceKeyOf('Business travel- air › Flights › Long-haul', 3)).toBe('cat6');
    expect(sourceKeyOf('Freighting goods › HGV', 3)).toBe('cat4');
    expect(sourceKeyOf('Waste disposal › Landfill', 3)).toBe('cat5');
    expect(sourceKeyOf('WTT- fuels › Diesel', 3)).toBe('cat3');
    expect(sourceKeyOf('Steel sections', 3)).toBe('cat1');
  });
  it('has measures for every source key used', () => {
    for (const k of ['electricity', 'fuel', 'refrigerant', 'fleet', 'cat1', 'cat2', 'cat3', 'cat4', 'cat5', 'cat6', 'cat7', 'cat11', 'cat13', 'general'])
      expect(MEASURES.some((m) => m.applies.includes(k as never))).toBe(true);
  });
  it('phases levers by delivery year', () => {
    const l = (year?: number): Lever => ({ id: 'x', name: 'x', scope: 1, abatement: 1, status: 'Planned', year });
    expect(phaseOf(l(2026), 2024)).toBe('Now'); expect(phaseOf(l(2029), 2024)).toBe('Next');
    expect(phaseOf(l(2035), 2024)).toBe('Later'); expect(phaseOf(l(), 2024)).toBe('Unscheduled');
  });
});

describe('official factor import', () => {
  it('parses quoted CSV', () => {
    expect(parseCsv('a,"b, c","d ""q"""\n1,2,3\n')).toEqual([['a', 'b, c', 'd "q"'], ['1', '2', '3']]);
  });
  it('reads numbers and scopes', () => {
    expect(toNumber('1,234.5')).toBe(1234.5); expect(toNumber('-')).toBeNull(); expect(toNumber(0.25)).toBe(0.25);
    expect(scopeOf('Scope 3')).toBe(3); expect(scopeOf('Outside of scopes')).toBeNull();
  });
  it('recognises a DESNZ-style flat file and keeps values exactly as in the file', () => {
    // Synthetic grid in the flat-file column layout; the numbers are placeholders, not real factors.
    const g = [
      ['UK Government GHG Conversion Factors for Company Reporting'], [],
      ['ID', 'Scope', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Column Text', 'UOM', 'GHG/Unit', 'GHG Conversion Factor 2099'],
      ['101', 'Scope 1', 'Fuels', 'Liquid fuels', 'Diesel', '', '', 'litres', 'kg CO2e', '1.2345'],
      ['102', 'Scope 1', 'Fuels', 'Liquid fuels', 'Diesel', '', '', 'litres', 'kg CO2', '1.2'],
      ['103', 'Scope 3', 'Business travel- air', 'Flights', 'Long-haul', '', 'With RF', 'passenger.km', 'kg CO2e', '0.5'],
    ];
    const L = detectDesnz(g)!;
    expect(L.header).toBe(2); expect(L.year).toBe('2099');
    const c = desnzCandidates(g, L);
    expect(c).toHaveLength(3);
    expect(c[0]).toMatchObject({ name: 'Fuels › Liquid fuels › Diesel', unit: 'litres', kgPerUnit: 1.2345, scope: 1, ref: 'ID 101', gasUnit: 'kg CO2e' });
    expect(c[2].name).toBe('Business travel- air › Flights › Long-haul · With RF');
  });
  it('maps generic tables and converts t→kg', () => {
    const g = [['Year', 'Grid', 'Unit', 'tCO2 per MWh'], ['FY', 'All India', 'MWh', '0.5']];
    const c = genericCandidates(g, { header: 0, name: [1], unit: 2, value: 3, multiplier: 1000 });
    expect(c[0]).toMatchObject({ name: 'All India', unit: 'MWh', kgPerUnit: 500 });
  });
  it('clears the official tag when an imported value is edited', () => {
    const f: EmissionFactor = { id: 'f', name: 'x', unit: 'kWh', kgPerUnit: 0.5, scope: 2, source: 'CEA v99', official: true, pack: 'CEA v99' };
    let st = reducer(EMPTY, { type: 'ADD_FACTORS', items: [f] });
    st = reducer(st, { type: 'UPSERT_FACTOR', item: { ...f, name: 'renamed' } });
    expect(st.factors[0].official).toBe(true);
    st = reducer(st, { type: 'UPSERT_FACTOR', item: { ...f, kgPerUnit: 0.6 } });
    expect(st.factors[0].official).toBe(false);
    expect(st.factors[0].source).toMatch(/edited/);
  });
  it('keeps module choices when switching to sample or clearing', () => {
    let st = reducer(EMPTY, { type: 'START_EMPTY', modules: { certs: false, lca: false } });
    expect(st.settings.modules).toEqual({ certs: false, lca: false });
    st = reducer(st, { type: 'LOAD_SAMPLE' });
    expect(st.settings.modules).toEqual({ certs: false, lca: false });
    st = reducer(st, { type: 'CLEAR' });
    expect(st.settings.modules).toEqual({ certs: false, lca: false });
  });
});

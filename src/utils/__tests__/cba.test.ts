import { describe, it, expect } from 'vitest';
import { npv, irr, payback, evalMeasure, evalPackage, defaultCba, type CbaState } from '../cba';
import { CBA_MEASURES, CBA_SOURCES, DEFAULT_BASIS, TARIFF_PRESETS, type CbaBasis } from '../../data/cba';

const flat: CbaBasis = { ...DEFAULT_BASIS, escalation: 0, waterEsc: 0, cpi: 0, gridDecline: 0, dutyPct: 0, carbonPrice: 0, years: 10, discount: 10 };
const M = (id: string) => CBA_MEASURES.find((m) => m.id === id)!;

describe('finance functions', () => {
  it('NPV, IRR and payback match hand calculations', () => {
    const flows = [-1000, 300, 300, 300, 300, 300];
    expect(npv(0.1, flows)).toBeCloseTo(137.24, 2);          // 300 × 3.7908 − 1000
    expect(irr(flows)!).toBeCloseTo(0.15238, 4);
    expect(payback(flows)).toBeCloseTo(3.333, 3);
    expect(payback(flows, 0.1)).toBeCloseTo(4.26, 2);
    expect(irr([-100, -10])).toBeNull();
    expect(payback([-100, 1, 1])).toBe(Infinity);
    expect(irr([-1, 100, 100])).toBe(Infinity);          // > 1,000%/yr
  });
});

describe('measure library', () => {
  it('every measure and default cites a known source', () => {
    const ids = new Set(CBA_SOURCES.map((s) => s.id));
    for (const m of CBA_MEASURES) {
      for (const s of [...m.src, ...m.cost.src, ...m.inputs.map((i) => i.src).filter(Boolean) as string[]]) expect(ids.has(s), `${m.id}: ${s}`).toBe(true);
      expect(m.cost.low).toBeLessThanOrEqual(m.cost.typical);
      expect(m.cost.typical).toBeLessThanOrEqual(m.cost.high);
    }
    for (const t of TARIFF_PRESETS) expect(ids.has(t.source)).toBe(true);
  });
  it('MSEDCL FY 2026-27 presets match the MERC order', () => {
    const ht = TARIFF_PRESETS.find((t) => t.id === 'msedcl-ht2-27')!;
    expect(ht.energy).toBeCloseTo(8.83 + 0.60, 6); expect(ht.demand).toBe(560);
    const lt = TARIFF_PRESETS.find((t) => t.id === 'msedcl-lt2c-27')!;
    expect(lt.energy).toBeCloseTo(12.16 + 1.14, 6); expect(lt.demand).toBe(525);
  });
});

describe('measure results', () => {
  it('chiller upgrade: TR × EFLH × Δ(kWh/TRh), priced at the tariff', () => {
    const r = evalMeasure(M('chiller'), { on: true, v: {} }, flat);
    const kwh = 435 * 2500 * (1.007 - 0.79);
    expect(r.kwh).toBeCloseTo(kwh, 6);
    expect(r.capex).toBe(435 * 8000);
    const kva = 435 * 0.10 / 0.95;
    expect(r.yr1).toBeCloseTo(kwh * 9.43 + kva * 560 * 12, 4);
    expect(r.simple).toBeCloseTo(r.capex / r.yr1, 6);
    expect(r.co2Yr).toBeCloseTo(kwh * 0.675 / 1000, 6);
  });
  it('LED: area × ΔLPD × hours plus the cooling it avoids', () => {
    const r = evalMeasure(M('led'), { on: true, v: {} }, flat);
    const light = 10000 * 3.5 * 2750 / 1000;
    expect(r.kwh).toBeCloseTo(light + light * 0.8 / 3.517 * 1.007, 4);
  });
  it('solar PV degrades 0.5%/yr and is replaced only after its 25-year life', () => {
    const r = evalMeasure(M('pv'), { on: true, v: { kwp: 100, yield: 1400, om: 0 } }, flat);
    expect(r.capex).toBe(4_500_000);
    expect(r.flows[1]).toBeCloseTo(140000 * 9.43, 4);
    expect(r.flows[2]).toBeCloseTo(140000 * 0.995 * 9.43, 4);
    expect(r.flows.length).toBe(11);
  });
  it('a 10-year analysis replaces an 8-year measure once and credits residual value', () => {
    const r = evalMeasure(M('cx'), { on: true, v: {} }, flat);
    const save = 1_500_000 * 0.05 * 9.43;
    expect(r.flows[8]).toBeCloseTo(save - r.capex, 4);
    expect(r.flows[10]).toBeCloseTo(save + r.capex * (1 - 2 / 8), 4);
  });
  it('cheaper low-carbon materials pay back immediately and report embodied carbon', () => {
    const r = evalMeasure(M('scm'), { on: true, v: {} }, flat);
    expect(r.capex).toBeLessThan(0);
    expect(r.simple).toBe(0);
    expect(r.embodiedT).toBeCloseTo(4000 * 350 * 0.3 * 0.8 / 1000, 6);
    expect(r.costPerT!).toBeLessThan(0);
  });
  it('a simulated kWh from the energy model overrides the formula', () => {
    const r = evalMeasure(M('model'), { on: true, v: {}, kwh: 123456 }, flat);
    expect(r.kwh).toBe(123456); expect(r.overridden).toBe(true);
  });
  it('capex case switches between low, typical and high unit costs', () => {
    expect(evalMeasure(M('pv'), { on: true, v: { kwp: 10 } }, { ...flat, capexCase: 'low' }).capex).toBe(380000);
    expect(evalMeasure(M('pv'), { on: true, v: { kwp: 10 } }, { ...flat, capexCase: 'high' }).capex).toBe(520000);
  });
});

describe('package', () => {
  it('does not double-count cooling: chiller serves the load left after envelope and lighting', () => {
    const s: CbaState = { ...defaultCba(), basis: flat };
    for (const id of Object.keys(s.rows)) s.rows[id] = { on: ['led', 'coolroof', 'chiller'].includes(id), v: {} };
    const { pkg, rows } = evalPackage(s);
    const sum = rows.filter((r) => ['led', 'coolroof', 'chiller'].includes(r.id)).reduce((a, r) => a + r.kwh, 0);
    expect(pkg!.kwh).toBeLessThan(sum);
    expect(pkg!.interactionKwh).toBeLessThan(0);
    // check the physics directly
    const led = evalMeasure(M('led'), undefined, flat).effect, roof = evalMeasure(M('coolroof'), undefined, flat).effect;
    const trh = 435 * 2500, left = trh - (led.trh! + roof.trh!);
    expect(pkg!.kwh).toBeCloseTo(led.kwh! + trh * 1.007 - left * 0.79, 4);
    expect(pkg!.capex).toBeCloseTo(rows.filter((r) => ['led', 'coolroof', 'chiller'].includes(r.id)).reduce((a, r) => a + r.capex, 0), 6);
  });
  it('custom measures from the energy model add straight in', () => {
    const s: CbaState = { ...defaultCba(), basis: flat, custom: [{ id: 'c1', name: 'Shading fins (DesignBuilder run 7)', cat: 'Envelope', capex: 500000, kwh: 60000, kl: 0, om: 0, life: 25, on: true }] };
    for (const id of Object.keys(s.rows)) s.rows[id].on = false;
    const { pkg } = evalPackage(s);
    expect(pkg!.kwh).toBe(60000);
    expect(pkg!.simple).toBeCloseTo(500000 / (60000 * 9.43), 6);
  });
  it('nothing selected → no package', () => {
    const s = defaultCba(); for (const id of Object.keys(s.rows)) s.rows[id].on = false;
    expect(evalPackage(s).pkg).toBeNull();
  });
});

import { CBA_MEASURES, DEFAULT_BASIS, type CbaBasis, type CbaMeasure, type MeasureEffect, type CbaCategory } from '../data/cba';

/** Saved per client workspace. */
export interface CbaRow { on: boolean; v: Record<string, number>; capex?: number; kwh?: number; life?: number }
export interface CbaCustom { id: string; name: string; cat: CbaCategory; capex: number; kwh: number; kl: number; om: number; life: number; on: boolean; note?: string }
export interface CbaState { basis: CbaBasis; rows: Record<string, CbaRow>; custom: CbaCustom[] }

export const defaultCba = (): CbaState => ({
  basis: { ...DEFAULT_BASIS },
  rows: Object.fromEntries(CBA_MEASURES.map((m) => [m.id, { on: !!m.defaultOn, v: {} }])),
  custom: [],
});

export interface MeasureResult {
  id: string; name: string; cat: CbaCategory; custom?: boolean;
  qty: number | null; qtyUnit: string; capex: number; life: number;
  kwh: number;            // electricity saved, kWh/yr (stand-alone, year 1)
  kva: number; kl: number; om: number; embodiedT: number;
  yr1: number;            // net year-1 saving, ₹
  simple: number;         // simple payback, years (Infinity = never, 0 = immediate)
  discounted: number;     // discounted payback, years (Infinity = not within the period)
  npv: number; irr: number | null; sir: number;
  co2Yr: number;          // tCO2e/yr year 1 (operational)
  co2Life: number;        // tCO2e over the analysis period incl. one-time embodied saving
  costPerT: number | null;// ₹/tCO2e (−NPV ÷ lifetime tCO2e); negative = saves money
  flows: number[];        // net cash flow, year 0..N (₹)
  steps: string[]; effect: MeasureEffect; overridden: boolean;
}

const val = (m: CbaMeasure, row: CbaRow | undefined, b: CbaBasis) =>
  Object.fromEntries(m.inputs.map((i) => [i.key, row?.v?.[i.key] ?? i.def(b)]));

export const unitCost = (m: CbaMeasure, b: CbaBasis) => m.cost[b.capexCase];

export function measureCapex(m: CbaMeasure, row: CbaRow | undefined, b: CbaBasis) {
  if (row?.capex != null) return { capex: row.capex, qty: null as number | null };
  const v = val(m, row, b);
  const qty = m.cost.qty ? (m.cost.qty === 'gfa' ? b.gfa : v[m.cost.qty]) : null;
  return { capex: unitCost(m, b) * (qty ?? 1), qty };
}

/** Year-t (1-based) monetary saving for a set of yearly physical savings. */
function yearSaving(b: CbaBasis, t: number, e: { kwh: number; kva: number; kl: number; om: number; degrade?: number }) {
  const esc = (1 + b.escalation / 100) ** (t - 1), wes = (1 + b.waterEsc / 100) ** (t - 1), inf = (1 + b.cpi / 100) ** (t - 1);
  const deg = (1 - (e.degrade ?? 0) / 100) ** (t - 1);
  const ef = b.gridEF * (1 - b.gridDecline / 100) ** (t - 1);           // tCO2/MWh
  const kwh = e.kwh * deg;
  const energy = kwh * b.energyRate * (1 + b.dutyPct / 100) * esc;
  const demand = e.kva * b.demandRate * 12 * esc;
  const water = e.kl * b.waterRate * wes;
  const co2 = kwh * ef / 1000;
  const carbon = co2 * b.carbonPrice * inf;
  return { money: energy + demand + water + carbon - e.om * inf, co2 };
}

/** Net cash flows year 0..N including like-for-like replacement at end of life and straight-line residual value. */
function cashFlows(b: CbaBasis, capex: number, life: number, phys: { kwh: number; kva: number; kl: number; om: number; degrade?: number }) {
  const N = Math.max(1, Math.round(b.years)), L = Math.max(1, Math.round(life));
  const flows = [-capex]; let co2 = 0;
  for (let t = 1; t <= N; t++) {
    const y = yearSaving(b, t, phys);
    let f = y.money; co2 += y.co2;
    if (t % L === 0 && t < N) f -= capex * (1 + b.cpi / 100) ** t;                 // replacement
    if (t === N) { const used = N % L; if (used) f += capex * (1 + b.cpi / 100) ** (N - used) * (1 - used / L); }   // residual value
    flows.push(f);
  }
  return { flows, co2 };
}

export const npv = (rate: number, flows: number[]) => flows.reduce((a, f, t) => a + f / (1 + rate) ** t, 0);

/** IRR by bisection; null when the flows never change sign, Infinity when it is above 1,000%/yr. */
export function irr(flows: number[]): number | null {
  if (!flows.some((f) => f < 0) || !flows.some((f) => f > 0)) return null;
  let lo = -0.99, hi = 10; const f = (r: number) => npv(r, flows);
  if (f(hi) > 0 && flows[0] < 0) return Infinity;
  if (f(lo) * f(hi) > 0) return null;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid; }
  return (lo + hi) / 2;
}

/** Years until cumulative (discounted) cash flow turns positive, interpolated within the year. */
export function payback(flows: number[], rate = 0): number {
  if (flows[0] >= 0) return 0;
  let cum = flows[0];
  for (let t = 1; t < flows.length; t++) {
    const d = flows[t] / (1 + rate) ** t;
    if (cum + d >= 0) return t - 1 + (d > 0 ? -cum / d : 0);
    cum += d;
  }
  return Infinity;
}

function finish(b: CbaBasis, base: Omit<MeasureResult, 'yr1' | 'simple' | 'discounted' | 'npv' | 'irr' | 'sir' | 'co2Yr' | 'co2Life' | 'costPerT' | 'flows'>, degrade?: number): MeasureResult {
  const phys = { kwh: base.kwh, kva: base.kva, kl: base.kl, om: base.om, degrade };
  const { flows, co2 } = cashFlows(b, base.capex, base.life, phys);
  const r = b.discount / 100;
  const y1 = yearSaving(b, 1, phys);
  const N = npv(r, flows);
  const pvSave = npv(r, [0, ...flows.slice(1)]);
  const co2Life = co2 + base.embodiedT;
  return {
    ...base, flows, yr1: y1.money,
    simple: base.capex <= 0 ? 0 : y1.money > 0 ? base.capex / y1.money : Infinity,
    discounted: payback(flows, r), npv: N, irr: irr(flows),
    sir: base.capex > 0 ? pvSave / base.capex : Infinity,
    co2Yr: y1.co2, co2Life, costPerT: co2Life > 0 ? -N / co2Life : null,
  };
}

/** Stand-alone result for one library measure (cooling savings priced at the baseline plant efficiency). */
export function evalMeasure(m: CbaMeasure, row: CbaRow | undefined, b: CbaBasis): MeasureResult {
  const v = val(m, row, b);
  const e = m.calc(b, v);
  const { capex, qty } = measureCapex(m, row, b);
  const trhBase = b.coolingTR * b.eflh;
  const plantKwh = e.plant != null ? trhBase * (b.baseKwhTRh - e.plant) : 0;
  const calcKwh = (e.kwh ?? 0) + (e.trh ?? 0) * b.baseKwhTRh + plantKwh;
  const overridden = row?.kwh != null;
  return finish(b, {
    id: m.id, name: m.name, cat: m.cat, qty, qtyUnit: m.cost.per, capex, life: row?.life ?? m.life,
    kwh: overridden ? row!.kwh! : calcKwh, kva: e.kva ?? 0, kl: e.kl ?? 0, om: e.om ?? 0, embodiedT: e.embodiedT ?? 0,
    steps: [...e.steps, ...(e.trh ? [`Cooling: ${Math.round(e.trh).toLocaleString('en-IN')} TRh × ${b.baseKwhTRh} kWh/TRh = ${Math.round(e.trh * b.baseKwhTRh).toLocaleString('en-IN')} kWh/yr at the baseline plant`] : []),
      ...(overridden ? [`Overridden with the simulated / measured saving: ${Math.round(row!.kwh!).toLocaleString('en-IN')} kWh/yr`] : [])],
    effect: e, overridden,
  }, e.degrade);
}

export function evalCustom(c: CbaCustom, b: CbaBasis): MeasureResult {
  return finish(b, { id: c.id, name: c.name, cat: c.cat, custom: true, qty: null, qtyUnit: 'lump sum', capex: c.capex, life: c.life,
    kwh: c.kwh, kva: 0, kl: c.kl, om: c.om, embodiedT: 0, steps: [c.note || 'Custom measure: values entered by the team (e.g. from the energy model).'], effect: { steps: [] }, overridden: false });
}

export interface PackageResult extends MeasureResult { sumKwh: number; interactionKwh: number; count: number }

/**
 * The selected measures together. Cooling-load reductions are applied first; the best selected plant efficiency then
 * serves the remaining load, so a chiller upgrade is not credited for load already removed by envelope or lighting.
 */
export function evalPackage(s: CbaState): { rows: MeasureResult[]; pkg: PackageResult | null } {
  const b = s.basis;
  const lib = CBA_MEASURES.map((m) => ({ m, r: evalMeasure(m, s.rows[m.id], b), on: !!s.rows[m.id]?.on }));
  const cus = s.custom.map((c) => ({ c, r: evalCustom(c, b), on: c.on }));
  const rows = [...lib.map((x) => x.r), ...cus.map((x) => x.r)];
  const selLib = lib.filter((x) => x.on), selCus = cus.filter((x) => x.on);
  if (!selLib.length && !selCus.length) return { rows, pkg: null };

  // HVAC interaction: load cuts first, then the best plant efficiency serves what is left.
  const trhBase = b.coolingTR * b.eflh;
  let trhCut = 0, plant = b.baseKwhTRh, hvacSum = 0;
  for (const { m, r } of selLib) {
    if (s.rows[m.id]?.kwh != null) continue;           // a simulated value already includes interactions
    const e = r.effect;
    trhCut += e.trh ?? 0;
    hvacSum += (e.trh ?? 0) * b.baseKwhTRh + (e.plant != null ? trhBase * (b.baseKwhTRh - e.plant) : 0);
    if (e.plant != null) plant = Math.min(plant, e.plant);
  }
  const hvacPkg = trhBase * b.baseKwhTRh - Math.max(0, trhBase - trhCut) * plant;
  const corr = hvacPkg - hvacSum;                      // ≤ 0 when measures overlap

  const sel = [...selLib.map((x) => x.r), ...selCus.map((x) => x.r)];
  const sum = (k: 'capex' | 'kwh' | 'kva' | 'kl' | 'om' | 'embodiedT') => sel.reduce((a, x) => a + x[k], 0);
  const N = Math.max(1, Math.round(b.years)), r = b.discount / 100;
  const flows = new Array(N + 1).fill(0) as number[];
  for (const x of sel) x.flows.forEach((f, t) => { flows[t] += f; });
  let co2Corr = 0;
  for (let t = 1; t <= N; t++) { const y = yearSaving(b, t, { kwh: corr, kva: 0, kl: 0, om: 0 }); flows[t] += y.money; co2Corr += y.co2; }
  const capex = sum('capex'), kwh = sum('kwh') + corr;
  const y1 = sel.reduce((a, x) => a + x.yr1, 0) + yearSaving(b, 1, { kwh: corr, kva: 0, kl: 0, om: 0 }).money;
  const co2Yr = sel.reduce((a, x) => a + x.co2Yr, 0) + yearSaving(b, 1, { kwh: corr, kva: 0, kl: 0, om: 0 }).co2;
  const co2Life = sel.reduce((a, x) => a + x.co2Life, 0) + co2Corr;
  const N0 = npv(r, flows);
  const life = Math.round(sel.reduce((a, x) => a + x.life * Math.max(x.capex, 1), 0) / Math.max(1, sel.reduce((a, x) => a + Math.max(x.capex, 1), 0)));
  const pkg: PackageResult = {
    id: 'package', name: `Selected package (${sel.length} measures)`, cat: 'Design & process', qty: null, qtyUnit: '', capex, life,
    kwh, kva: sum('kva'), kl: sum('kl'), om: sum('om'), embodiedT: sum('embodiedT'), yr1: y1,
    simple: capex <= 0 ? 0 : y1 > 0 ? capex / y1 : Infinity, discounted: payback(flows, r), npv: N0, irr: irr(flows),
    sir: capex > 0 ? npv(r, [0, ...flows.slice(1)]) / capex : Infinity,
    co2Yr, co2Life, costPerT: co2Life > 0 ? -N0 / co2Life : null, flows, steps: [], effect: { steps: [] }, overridden: false,
    sumKwh: sum('kwh'), interactionKwh: corr, count: sel.length,
  };
  return { rows, pkg };
}

export const fmtYears = (y: number) => (y === 0 ? 'Immediate' : Number.isFinite(y) ? `${y.toFixed(1)} yr` : '> period');
export const inr = (n: number) => {
  const a = Math.abs(n), s = n < 0 ? '−' : '';
  if (a >= 1e7) return `${s}₹${(a / 1e7).toFixed(2)} cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)} L`;
  return `${s}₹${Math.round(a).toLocaleString('en-IN')}`;
};

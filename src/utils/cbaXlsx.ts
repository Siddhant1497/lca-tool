import { evalPackage, type CbaState } from './cba';
import { CBA_MEASURES, CBA_SOURCES, TARIFF_PRESETS, USE_LABEL, sourceById } from '../data/cba';
import { saveFile } from './platform';

/* Cost–benefit workbook: assumptions, measure results, package cash flow and sources. */
type C = Record<string, unknown> | string | number | null | undefined;
const H = (value: string): C => ({ value, fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: '#0F766E', borderColor: '#0B5E57', borderStyle: 'thin', wrap: true, alignVertical: 'center' });
const T = (value: string, span: number): C => ({ value, fontWeight: 'bold', fontSize: 14, columnSpan: span, textColor: '#0E1A17' });
const N = (value: number | null | undefined, format = '#,##0'): C => (value == null || !Number.isFinite(value) ? null : { value, type: Number, format });
const S = (value: string | undefined | null): C => (value == null || value === '' ? null : { value: String(value), type: String });
const B = (value: number | null | undefined, format = '#,##0'): C => (value == null || !Number.isFinite(value) ? null : { value, type: Number, format, fontWeight: 'bold', backgroundColor: '#EEF6F4' });

export async function exportCbaWorkbook(cba: CbaState, org: string) {
  const { default: write } = await import('write-excel-file/browser');
  const b = cba.basis, today = new Date().toISOString().slice(0, 10);
  const { rows, pkg } = evalPackage(cba);
  const tariff = TARIFF_PRESETS.find((t) => t.id === b.tariffPreset);
  const on = (id: string) => cba.rows[id]?.on ?? cba.custom.find((c) => c.id === id)?.on ?? false;

  const ass: C[][] = [[T(`${org || 'Project'} — cost–benefit analysis: ${b.name}`, 4)], [S(`Generated ${today} by SustainHub. Market and estimate values are indicative; replace with quotes and energy-model results.`)], [],
    [H('Assumption'), H('Value'), H('Unit'), H('Source / note')],
    [S('Building use'), S(USE_LABEL[b.use]), null, null], [S('Gross floor area'), N(b.gfa), S('m²'), null],
    [S('Baseline electricity'), N(b.annualKwh), S('kWh/yr'), S('Energy model baseline or bills')],
    [S('Cooling capacity'), N(b.coolingTR), S('TR'), null], [S('Baseline cooling system efficiency'), N(b.baseKwhTRh, '0.000'), S('kWh/TRh'), S('BEE/GIZ 2025, Table 2')],
    [S('Equivalent full-load hours'), N(b.eflh), S('h/yr'), S('BEE/GIZ 2025, Table 1')], [S('Lighting hours'), N(b.lightHours), S('h/yr'), null],
    [S('Tariff'), S(tariff?.label), null, S(tariff?.note)], [S('Energy + wheeling'), N(b.energyRate, '0.00'), S('₹/kWh'), null], [S('Demand charge'), N(b.demandRate), S('₹/kVA·month'), null],
    [S('Electricity duty / tax'), N(b.dutyPct, '0.0'), S('%'), null], [S('Tariff escalation'), N(b.escalation, '0.0'), S('%/yr'), null],
    [S('Water cost'), N(b.waterRate), S('₹/kL'), null], [S('Water escalation'), N(b.waterEsc, '0.0'), S('%/yr'), null],
    [S('Discount rate (nominal)'), N(b.discount, '0.0'), S('%'), null], [S('O&M inflation'), N(b.cpi, '0.0'), S('%/yr'), S('RBI FY 2026-27 CPI projection')],
    [S('Analysis period'), N(b.years, '0'), S('years'), null], [S('Grid emission factor'), N(b.gridEF, '0.000'), S('tCO₂/MWh'), S('CEA v22.0, FY 2025-26')],
    [S('Grid decarbonisation'), N(b.gridDecline, '0.0'), S('%/yr'), null], [S('Internal carbon price'), N(b.carbonPrice), S('₹/tCO₂e'), null], [S('Capex case'), S(b.capexCase), null, null]];

  const res: C[][] = [[H('Included'), H('Measure'), H('Category'), H('Capex ₹'), H('Basis'), H('Year-1 saving ₹'), H('kWh/yr'), H('kVA'), H('kL/yr'), H('Simple payback (yr)'), H('Discounted payback (yr)'), H('NPV ₹'), H('IRR'), H('SIR'), H('tCO₂e/yr'), H('Embodied tCO₂e (once)'), H('₹/tCO₂e'), H('Life (yr)'), H('Credits'), H('Calculation')],
    ...rows.map((r) => { const m = CBA_MEASURES.find((x) => x.id === r.id);
      return [S(on(r.id) ? 'Yes' : 'No'), S(r.name), S(r.cat), N(r.capex), S(r.custom ? 'custom' : r.overridden ? `${m?.cost.basis}; kWh from energy model` : m?.cost.basis), N(r.yr1), N(r.kwh), N(r.kva), N(r.kl),
        N(Number.isFinite(r.simple) ? r.simple : null, '0.0'), N(Number.isFinite(r.discounted) ? r.discounted : null, '0.0'), N(r.npv), r.irr === Infinity ? S('>999%') : N(r.irr, '0.0%'), N(Number.isFinite(r.sir) ? r.sir : null, '0.00'),
        N(r.co2Yr, '#,##0.0'), N(r.embodiedT || null, '#,##0.0'), N(r.costPerT), N(r.life, '0'), S(m?.credits), S(r.steps.join(' | '))]; })];
  if (pkg) res.push([S('Package'), { value: pkg.name, fontWeight: 'bold' }, S('With cooling interactions'), B(pkg.capex), null, B(pkg.yr1), B(pkg.kwh), B(pkg.kva), B(pkg.kl),
    B(Number.isFinite(pkg.simple) ? pkg.simple : null, '0.0'), B(Number.isFinite(pkg.discounted) ? pkg.discounted : null, '0.0'), B(pkg.npv), pkg.irr === Infinity ? S('>999%') : B(pkg.irr, '0.0%'), B(Number.isFinite(pkg.sir) ? pkg.sir : null, '0.00'), B(pkg.co2Yr, '#,##0.0'), B(pkg.embodiedT || null, '#,##0.0'), B(pkg.costPerT), B(pkg.life, '0'), null, S(`Interaction ${Math.round(pkg.interactionKwh)} kWh/yr`)]);

  const cf: C[][] = [[H('Year'), H('Net cash flow ₹'), H('Cumulative ₹'), H(`Discounted @ ${b.discount}% ₹`), H('Cumulative discounted ₹')]];
  if (pkg) { let c = 0, cd = 0; pkg.flows.forEach((f, t) => { c += f; const d = f / (1 + b.discount / 100) ** t; cd += d; cf.push([N(t, '0'), N(f), N(c), N(d), B(cd)]); }); }

  const src: C[][] = [[H('Tier'), H('Source'), H('Publisher'), H('Date'), H('Used for'), H('URL')],
    ...CBA_SOURCES.map((s) => [S(s.tier), S(s.title), S(s.publisher), S(s.date), S(s.note), S(s.url)])];
  const lib: C[][] = [[H('Measure'), H('Unit cost basis'), H('Low ₹'), H('Typical ₹'), H('High ₹'), H('Incremental / full'), H('Cost sources'), H('Life (yr)')],
    ...CBA_MEASURES.map((m) => [S(m.name), S(m.cost.per), N(m.cost.low), N(m.cost.typical), N(m.cost.high), S(m.cost.basis), S(m.cost.src.map((x) => sourceById(x)?.publisher).join('; ')), N(m.life, '0')])];

  const w = (...ws: number[]) => ws.map((width) => ({ width }));
  const blob = await write([
    { data: ass as never, sheet: 'Assumptions', columns: w(36, 30, 14, 60), showGridLines: false },
    { data: res as never, sheet: 'Measures', columns: w(9, 46, 16, 14, 26, 14, 12, 9, 10, 10, 11, 14, 8, 7, 10, 12, 11, 7, 32, 90), stickyRowsCount: 1, stickyColumnsCount: 2 },
    { data: cf as never, sheet: 'Package cash flow', columns: w(8, 18, 18, 20, 22), stickyRowsCount: 1 },
    { data: lib as never, sheet: 'Cost library', columns: w(52, 34, 11, 11, 11, 14, 50, 8), stickyRowsCount: 1 },
    { data: src as never, sheet: 'Sources', columns: w(10, 60, 40, 22, 90, 60), stickyRowsCount: 1 },
  ] as never, { fontFamily: 'Calibri', fontSize: 11 } as never).toBlob();
  const name = `${(b.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-cost-benefit-${today}.xlsx`;
  return saveFile(name, blob);
}

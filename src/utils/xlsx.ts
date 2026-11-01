import type { HubState } from '../types/hub';
import { S3_CATEGORIES } from '../types/hub';
import { total, s12, s2, intensities, disclosures, activityT } from './hub';
import { scopeGaps, trajectory, phaseOf } from './strategy';
import { saveFile } from './platform';

/* Styled multi-sheet Excel workbook. The library is lazy-loaded on click so it never weighs on first paint. */
type C = Record<string, unknown> | string | number | null | undefined;
const H = (value: string): C => ({ value, fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: '#0F766E', borderColor: '#0B5E57', borderStyle: 'thin', wrap: true, alignVertical: 'center' });
const T = (value: string, span: number): C => ({ value, fontWeight: 'bold', fontSize: 14, columnSpan: span, textColor: '#0E1A17' });
const N = (value: number | null | undefined, format = '#,##0'): C => (value == null || !Number.isFinite(value) ? null : { value, type: Number, format });
const S = (value: string | undefined | null): C => (value == null || value === '' ? null : { value: String(value), type: String });
const B = (value: number | null | undefined, format = '#,##0'): C => (value == null ? null : { value, type: Number, format, fontWeight: 'bold', backgroundColor: '#EEF6F4' });

const numOrText = (n: number | null | undefined, t: string): C => (n != null && Number.isFinite(n) ? { value: n, type: Number, format: Math.abs(n) < 0.01 && n !== 0 ? '0.000E+00' : Number.isInteger(n) ? '#,##0' : '#,##0.00' } : S(t === '—' ? '' : t));

export async function exportWorkbook(hub: HubState) {
  const { default: write } = await import('write-excel-file/browser');
  const s = hub.settings, m = s.s2Method;
  const today = new Date().toISOString().slice(0, 10);
  const org = s.orgName || 'Organisation';
  const latest = hub.ghg[hub.ghg.length - 1];
  const ints = intensities(hub.ghg, s);

  const summary: C[][] = [
    [T(`${org} — GHG & certification workbook`, 4)],
    [S(`Generated ${today} by SustainHub${hub.isSample ? ' · ILLUSTRATIVE SAMPLE DATA, NOT REAL' : ''}`)],
    [],
    [H('Item'), H('Value'), H('Unit'), H('Note')],
    [S('Base year'), N(hub.ghg[0]?.year, '0'), null, S('Earliest inventory year')],
    [S('Latest year'), N(latest?.year, '0'), null, null],
    [S('Scope 2 method used for totals'), S(m === 'market' ? 'Market-based' : 'Location-based'), null, null],
    [S('Latest total (S1+S2+S3)'), B(latest ? total(latest, m) : null), S('tCO₂e'), null],
    [S('Latest Scope 1+2'), B(latest ? s12(latest, m) : null), S('tCO₂e'), null],
    [S('Pathway'), S(`${s.annualPct}%/yr linear of base-year S1+2 to ${s.targetYear}`), null, S('SBTi 1.5°C-aligned default rate for Scope 1+2')],
    [S('Certification projects'), N(hub.projects.length, '0'), null, null],
    [S('Decarbonisation levers'), N(hub.levers.length, '0'), null, null],
  ];

  const inv: C[][] = [[H('Year'), H('Scope 1'), H('Scope 2 location'), H('Scope 2 market'), H('Scope 3'), H('Total (location)'), H('Total (market)'), H('Floor area m²'), H('FTE'), H(`Turnover (${s.revenueUnit})`)],
    ...hub.ghg.map((g) => [N(g.year, '0'), N(g.scope1), N(g.scope2), N(g.scope2m ?? null), N(g.scope3), B(total(g, 'location')), B(g.scope2m != null ? total(g, 'market') : null), N(g.denom?.area ?? null), N(g.denom?.fte ?? null), N(g.denom?.revenue ?? null, '#,##0.00')])];

  const s3: C[][] = [[H('Cat'), H('Category'), H('Stream'), ...hub.ghg.map((g) => H(String(g.year)))],
    ...S3_CATEGORIES.map((c) => [N(c.n, '0'), S(c.name), S(c.stream), ...hub.ghg.map((g) => N(g.s3cats?.[c.n] ?? null))]),
    [null, { value: 'Scope 3 total', fontWeight: 'bold' }, null, ...hub.ghg.map((g) => B(g.scope3))]];

  const inten: C[][] = [[H('Year'), H(`S1+2 (${m}) tCO₂e`), H('kgCO₂e / m²'), H('tCO₂e / FTE'), H(`tCO₂e / ${s.revenueUnit}`), H('tCO₂e / ₹ (BRSR)')],
    ...hub.ghg.map((g, i) => [N(g.year, '0'), N(s12(g, m)), N(ints[i].perM2, '#,##0.0'), N(ints[i].perFte, '#,##0.00'), N(ints[i].perRev, '#,##0.00'), N(ints[i].perRupee, '0.000E+00')])];

  const disc: C[][] = [[H('Framework'), H('Reference'), H('Disclosure'), H(`${latest?.year ?? ''}`), H('Previous year'), H('Unit'), H('Status'), H('Note')]];
  if (latest) for (const f of disclosures(hub.ghg, s, latest.year)) for (const l of f.lines)
    disc.push([S(f.name), S(l.ref), S(l.item), numOrText(l.num, l.value), numOrText(l.prevNum, l.prev ?? ''), S(l.unit), { value: l.status === 'ok' ? 'Available' : l.status === 'partial' ? 'Partial' : 'Missing', textColor: l.status === 'ok' ? '#15803D' : l.status === 'partial' ? '#B45309' : '#DC2626', fontWeight: 'bold' }, S(l.note)]);

  const proj: C[][] = [[H('Project'), H('System'), H('Version'), H('Target'), H('Needed'), H('Secured'), H('Likely'), H('Max'), H('Unit'), H('Stage'), H('Status'), H('Next action')],
    ...hub.projects.map((p) => [S(p.name), S(p.system), S(p.version), S(p.targetLabel), N(p.needed, '0'), N(p.secured, '0'), N(p.likely, '0'), N(p.max, '0'), S(p.unit), S(p.stage),
      S(p.secured >= p.needed ? 'Target met' : p.stage !== 'Certified' && p.secured + p.likely < p.needed ? 'At risk' : 'On track'), S(p.next)])];

  const lev: C[][] = [[H('Lever'), H('Scope'), H('Abatement tCO₂e/yr'), H('Delivery year'), H(`Cost ${s.currency}/tCO₂e`), H(`Annual cost ${s.currency}`), H('Status')],
    ...hub.levers.map((l) => [S(l.name), N(l.scope, '0'), N(l.abatement), N(l.year ?? null, '0'), N(l.costPerT ?? null), N(l.costPerT != null ? l.costPerT * l.abatement : null), S(l.status)])];

  const fac: C[][] = [[H('Factor'), H('Scope'), H('Basis / category'), H('kgCO₂e per unit'), H('Unit'), H('Provenance'), H('Dataset / edition'), H('Row ref.'), H('Source'), H('URL')],
    ...hub.factors.map((f) => [S(f.name), N(f.scope, '0'), S(f.scope === 2 ? f.s2basis : f.s3cat ? `Cat ${f.s3cat}` : ''), N(f.kgPerUnit, '0.000000'), S(f.unit), S(f.official ? 'Official file' : 'Manual entry'), S(f.pack), S(f.ref), S(f.source), S(f.url)])];
  const act: C[][] = [[H('Year'), H('Site'), H('Activity'), H('Quantity'), H('Unit'), H('Factor'), H('kgCO₂e/unit'), H('tCO₂e'), H('Data quality'), H('Source')],
    ...hub.activities.map((a) => { const f = hub.factors.find((x) => x.id === a.factorId); return [N(a.year, '0'), S(a.site), S(a.description), N(a.quantity, '#,##0.00'), S(f?.unit), S(f?.name), N(f?.kgPerUnit, '0.000000'), N(activityT(a, f), '#,##0.000'), S(a.quality ?? 'Measured'), S(f?.source)]; })];

  const gaps = scopeGaps(hub.ghg, hub.levers, s);
  const strat: C[][] = [[T('Decarbonisation strategy', 6)],
    [S(`Near-term ${s.targetYear}: Scope 1+2 ${s.annualPct}%/yr, Scope 3 ${s.s3Pct}%/yr linear from base year · Net zero ${s.netZeroYear}: ≥${s.nzPct}% reduction, residual neutralised by removals`)], [],
    [H('Scope'), H('Base'), H('Latest'), H(`Target ${s.targetYear}`), H('Still to cut'), H('In plan (open levers)'), H('Coverage'), H(`Residual ${s.netZeroYear}`)],
    ...gaps.map((g) => [S(g.label), N(g.base), N(g.latest), N(g.target), B(g.cut), N(g.levers), N(g.coverage / 100, '0%'), N(g.residual)]), [],
    [H('Roadmap phase'), H('Lever'), H('Scope'), H('tCO₂e/yr'), H('Delivery year'), H('Status')],
    ...hub.levers.filter((l) => l.status !== 'Implemented').map((l) => [S(latest ? phaseOf(l, latest.year) : ''), S(l.name), N(l.scope, '0'), N(l.abatement), N(l.year ?? null, '0'), S(l.status)]), [],
    [H('Year'), H('S1+2 actual'), H('S1+2 target'), H('S3 actual'), H('S3 target')],
    ...trajectory(hub.ghg, s).map((t) => [N(t.year, '0'), N(t.s12), N(t.s12t), N(t.s3), N(t.s3t)])];

  const w = (...ws: number[]) => ws.map((width) => ({ width }));
  const blob = await write([
    { data: summary as never, sheet: 'Summary', columns: w(36, 34, 12, 50), showGridLines: false },
    { data: inv as never, sheet: 'Inventory', columns: w(8, 12, 16, 16, 12, 16, 16, 14, 10, 18), stickyRowsCount: 1 },
    { data: s3 as never, sheet: 'Scope 3 categories', columns: w(6, 40, 12, ...hub.ghg.map(() => 11)), stickyRowsCount: 1, stickyColumnsCount: 2 },
    { data: inten as never, sheet: 'Intensity', columns: w(8, 18, 14, 14, 18, 18), stickyRowsCount: 1 },
    { data: disc as never, sheet: 'Disclosures', columns: w(30, 12, 44, 14, 14, 16, 11, 50), stickyRowsCount: 1 },
    { data: strat as never, sheet: 'Strategy', columns: w(16, 40, 10, 14, 14, 18, 11, 14), showGridLines: false },
    ...(s.modules.certs ? [{ data: proj as never, sheet: 'Certifications', columns: w(30, 9, 18, 12, 9, 9, 9, 8, 7, 13, 12, 44), stickyRowsCount: 1 }] : []),
    { data: lev as never, sheet: 'Levers', columns: w(36, 7, 18, 13, 16, 18, 13), stickyRowsCount: 1 },
    { data: fac as never, sheet: 'Emission factors', columns: w(40, 7, 14, 16, 10, 14, 36, 12, 50, 40), stickyRowsCount: 1 },
    { data: act as never, sheet: 'Activities', columns: w(8, 18, 36, 14, 10, 36, 14, 12, 13, 50), stickyRowsCount: 1 },
  ] as never, { fontFamily: 'Calibri', fontSize: 11 } as never).toBlob();

  const name = `${(s.orgName || 'sustainhub').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-ghg-workbook-${today}.xlsx`;
  return saveFile(name, blob);
}

export { s2 };

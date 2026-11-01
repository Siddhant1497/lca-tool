import type { HubState } from '../types/hub';
import { S3_CATEGORIES } from '../types/hub';
import { total, s12, s2, intensities, disclosures, activityT } from './hub';

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

  const fac: C[][] = [[H('Factor'), H('Scope'), H('Basis / category'), H('kgCO₂e per unit'), H('Unit'), H('Source')],
    ...hub.factors.map((f) => [S(f.name), N(f.scope, '0'), S(f.scope === 2 ? f.s2basis : f.s3cat ? `Cat ${f.s3cat}` : ''), N(f.kgPerUnit, '0.000000'), S(f.unit), S(f.source)])];
  const act: C[][] = [[H('Year'), H('Activity'), H('Quantity'), H('Unit'), H('Factor'), H('tCO₂e'), H('Source')],
    ...hub.activities.map((a) => { const f = hub.factors.find((x) => x.id === a.factorId); return [N(a.year, '0'), S(a.description), N(a.quantity, '#,##0.00'), S(f?.unit), S(f?.name), N(activityT(a, f), '#,##0.000'), S(f?.source)]; })];

  const w = (...ws: number[]) => ws.map((width) => ({ width }));
  const blob = await write([
    { data: summary as never, sheet: 'Summary', columns: w(36, 34, 12, 50), showGridLines: false },
    { data: inv as never, sheet: 'Inventory', columns: w(8, 12, 16, 16, 12, 16, 16, 14, 10, 18), stickyRowsCount: 1 },
    { data: s3 as never, sheet: 'Scope 3 categories', columns: w(6, 40, 12, ...hub.ghg.map(() => 11)), stickyRowsCount: 1, stickyColumnsCount: 2 },
    { data: inten as never, sheet: 'Intensity', columns: w(8, 18, 14, 14, 18, 18), stickyRowsCount: 1 },
    { data: disc as never, sheet: 'Disclosures', columns: w(30, 12, 44, 14, 14, 16, 11, 50), stickyRowsCount: 1 },
    { data: proj as never, sheet: 'Certifications', columns: w(30, 9, 18, 12, 9, 9, 9, 8, 7, 13, 12, 44), stickyRowsCount: 1 },
    { data: lev as never, sheet: 'Levers', columns: w(36, 7, 18, 13, 16, 18, 13), stickyRowsCount: 1 },
    { data: fac as never, sheet: 'Emission factors', columns: w(32, 7, 16, 16, 10, 60), stickyRowsCount: 1 },
    { data: act as never, sheet: 'Activities', columns: w(8, 36, 14, 10, 32, 12, 60), stickyRowsCount: 1 },
  ] as never, { fontFamily: 'Calibri', fontSize: 11 } as never).toBlob();

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(s.orgName || 'sustainhub').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-ghg-workbook-${today}.xlsx`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

export { s2 };

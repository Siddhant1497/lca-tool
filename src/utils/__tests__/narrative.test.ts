import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { nfmt, segments, creditCounts, creditDoc, openXlsx, readIgbcWorkbook, parseRef, type NData } from '../narrative';
import { summarise } from '../docsProgress';
import DATA_RAW from '../../data/narratives/igbc.json';
const DATA = DATA_RAW as unknown as NData;

/** Minimal but real-format .xlsx: workbook with defined names, shared strings, a formula with cached value. */
function makeXlsx() {
  const sheet1 = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
    <row r="3"><c r="C3" t="s"><v>0</v></c></row>
    <row r="4"><c r="C4"><v>12500.5</v></c><c r="D4"><f>C4*2</f><v>25001</v></c><c r="E4"><f>X</f></c></row>
    <row r="5"><c r="C5"><v>0.4567</v></c><c r="D5" t="str"><f>"Gold"</f><v>Gold</v></c><c r="E5" t="inlineStr"><is><t>Pune &amp; Co</t></is></c></row>
    <row r="6"><c r="B6" t="s"><v>1</v></c><c r="C6" t="s"><v>2</v></c></row>
    <row r="7"><c r="B7" t="s"><v>3</v></c><c r="C7" t="s"><v>4</v></c></row>
  </sheetData></worksheet>`;
  const names = `<sheet name="Name Index" sheetId="2" r:id="rId2"/>`;
  const ni = `<?xml version="1.0"?><worksheet><sheetData>
    <row r="4"><c r="B4" t="s"><v>5</v></c><c r="C4" t="s"><v>6</v></c><c r="D4" t="s"><v>7</v></c></row></sheetData></worksheet>`;
  const wb = `<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>
    <sheet name="Project Inputs" sheetId="1" r:id="rId1"/>${names}</sheets><definedNames>
    <definedName name="BLD_NAME">'Project Inputs'!$C$3</definedName>
    <definedName name="Proj_Name">'Project Inputs'!$C$3</definedName>
    <definedName name="Site_Area">'Project Inputs'!$C$4</definedName>
    <definedName name="BUA_Total">'Project Inputs'!$D$4</definedName>
    <definedName name="Total_Points">'Project Inputs'!$D$4</definedName>
    <definedName name="Uncached">'Project Inputs'!$E$4</definedName>
    <definedName name="SSP2_Share">'Project Inputs'!$C$5</definedName>
    <definedName name="Cert_Level">'Project Inputs'!$D$5</definedName>
    <definedName name="Proj_City">'Project Inputs'!$E$5</definedName>
    <definedName name="SC_ID">'Project Inputs'!$B$6:$B$7</definedName>
    <definedName name="SC_TARGET">'Project Inputs'!$C$6:$C$7</definedName>
    <definedName name="Local" localSheetId="0">'Project Inputs'!$C$4</definedName>
  </definedNames></workbook>`;
  const rels = `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="x" Target="/xl/worksheets/sheet2.xml"/></Relationships>`;
  const ss = `<?xml version="1.0"?><sst><si><t>Test Tower</t></si><si><t>SSP CR1</t></si><si><t>No</t></si><si><t>SSP CR2</t></si><si><r><t>Ye</t></r><r><t>s</t></r></si><si><t>Site_Area</t></si><si><t>Site area</t></si><si><t>Project Inputs!C4</t></si></sst>`;
  return zipSync({ 'xl/workbook.xml': strToU8(wb), 'xl/_rels/workbook.xml.rels': strToU8(rels), 'xl/worksheets/sheet1.xml': strToU8(sheet1),
    'xl/worksheets/sheet2.xml': strToU8(ni), 'xl/sharedStrings.xml': strToU8(ss) });
}

describe('IGBC templates (from the IGBC Narrative Builder)', () => {
  it('has the six rating systems and their credits', () => {
    expect(Object.keys(DATA).sort()).toEqual(['fac', 'homes', 'nb', 'nb3', 'svc', 'wh']);
    const n = Object.values(DATA).reduce((a, r) => a + r.sections.reduce((b, s) => b + s.credits.length, 0), 0);
    expect(n).toBe(271);
    expect(DATA.nb.title).toBe('IGBC Green New Buildings V4.0');
  });
  it('formats like the builder (Indian grouping, %, decimals, text)', () => {
    expect(nfmt(1234567, '#,##0')).toBe('12,34,567');
    expect(nfmt(0.4567, '0.0%')).toBe('45.7%');
    expect(nfmt(2.5, '0.00')).toBe('2.50');
    expect(nfmt('Gold', '@')).toBe('Gold');
    expect(nfmt(undefined, '0')).toBe('');
  });
  it('splits templates into text, workbook values and numbered fill-ins with builder-compatible keys', () => {
    const src = { ...DATA.nb.sample, rating: 'nb', sample: true } as never;
    const segs = segments('A {{Site_Area|#,##0}} m2 at [[place]] and [[date]].', 'SSP MR1', 'approach0', src, { 'SSP MR1:approach0:1': '1 Jan' });
    expect(segs.map((s) => s.t)).toEqual(['text', 'val', 'text', 'fill', 'text', 'fill', 'text']);
    const fills = segs.filter((s) => s.t === 'fill') as { key: string; v: string }[];
    expect(fills.map((f) => f.key)).toEqual(['SSP MR1:approach0:0', 'SSP MR1:approach0:1']);
    expect(fills[1].v).toBe('1 Jan');
  });
});

describe('workbook reader (no SheetJS)', () => {
  it('resolves defined names to cached cell values', () => {
    const wb = openXlsx(makeXlsx());
    expect(parseRef(wb.names.SC_ID)).toMatchObject({ sheet: 'Project Inputs', c1: 'B', r1: 6, c2: 'B', r2: 7 });
    expect(wb.cell('Project Inputs', 'C3')).toBe('Test Tower');     // shared string
    expect(wb.cell('Project Inputs', 'D4')).toBe(25001);            // cached formula value
    expect(wb.cell('Project Inputs', 'E4')).toBeUndefined();        // formula never calculated
    expect(wb.cell('Project Inputs', 'D5')).toBe('Gold');           // t="str"
    expect(wb.cell('Project Inputs', 'E5')).toBe('Pune & Co');      // inline string, entity decoded
    expect(wb.cell('Project Inputs', 'C7')).toBe('Yes');            // rich-text shared string
    expect(wb.names.Local).toBeUndefined();                          // sheet-local names ignored, as in the builder
  });
  it('reads an IGBC NB V4.0 workbook into a narrative source', () => {
    const src = readIgbcWorkbook(makeXlsx(), DATA);
    expect(src.rating).toBe('nb');
    expect(src.project).toBe('Test Tower');
    expect(src.values['Site_Area|#,##0']).toBe('12,501');
    expect(src.values['SSP2_Share|0.0%']).toBe('45.7%');
    expect(src.targets).toEqual({ 'SSP CR1': 'No', 'SSP CR2': 'Yes' });
    expect(src.labels.Site_Area).toBe('Site area (Project Inputs!C4)');
    expect(src.totals.level).toBe('Gold');
    expect(src.total).toBe(DATA.nb.tokens.length);
    expect(src.blank).toBeGreaterThan(0);
  });
  it('rejects files that are not IGBC workbooks', () => {
    expect(() => readIgbcWorkbook(new Uint8Array([1, 2, 3]), DATA)).toThrow(/xlsx/);
    const plain = zipSync({ 'xl/workbook.xml': strToU8('<workbook><sheets/></workbook>') });
    expect(() => readIgbcWorkbook(plain, DATA)).toThrow(/IGBC workbook names/);
  });
});

describe('documentation progress', () => {
  it('counts facts, copies for Word and summarises without narrative text', () => {
    const src = readIgbcWorkbook(makeXlsx(), DATA);
    const c = DATA.nb.sections.flatMap((s) => s.credits).find((x) => x.id === 'SSP CR2')!;
    const before = creditCounts(c, src, {});
    expect(before.fills).toBeGreaterThan(0); expect(before.done).toBe(0);
    const key = segments(c.approach[1], c.id, 'approach1', src, {}).find((s) => s.t === 'fill') as { key: string };
    const after = creditCounts(c, src, { [key.key]: '12 x 7.4 kW AC chargers' });
    expect(after.done).toBe(1);
    const d = creditDoc(c, src, { [key.key]: '12 x 7.4 kW AC chargers' });
    expect(d.text).toContain('SSP CR2 Electric Vehicle Charging');
    expect(d.text).toContain('12 x 7.4 kW AC chargers');
    expect(d.html).toContain('<li>');
    const sum = summarise({ id: 'd', name: 'Tower', rating: 'nb', updatedAt: '', src, edits: {}, meta: { 'SSP CR2': { status: 'Approved' } } }, DATA)!;
    expect(sum.credits.some((x) => x.id === 'SSP CR1')).toBe(false);   // targeted "No" → excluded
    expect(sum.credits.find((x) => x.id === 'SSP CR2')!.status).toBe('Approved');
    expect(JSON.stringify(sum)).not.toContain('Intent');
  });
});

describe('live portal update', async () => {
  const { buildPayload } = await import('../share');
  const { buildPortalUpdate } = await import('../portal');
  const { SAMPLE } = await import('../../data/hubSample');
  const hub = { ...SAMPLE, loaded: true, isSample: true, factors: [{ id: 'f', name: 'SECRET', unit: 'kWh', kgPerUnit: 1, scope: 2 as const, source: 's' }], activities: [], docs: [] };
  const cfg = { frameworks: [], projectIds: [SAMPLE.projects[1].id], title: 'T', preparedBy: 'P', note: '', createdAt: '', docIds: ['d1'] };
  const docSum = { id: 'd1', name: 'Set', system: 'IGBC', project: 'X', updatedAt: '', totals: {}, credits: [{ id: 'SSP MR1', name: 'Local', pts: 'Mandatory', section: 'SSP', status: 'Awaiting client' as const, done: 0, fills: 2, miss: 0 }], byStatus: {} as never, pctReady: 0, pctFacts: 0 };
  it('carries only the chosen sections, in the portal format', () => {
    const u = buildPortalUpdate(buildPayload(hub, 'Client A', { ...cfg, sections: ['kpis', 'pathway', 'strategy', 'certs', 'docs'] }, [docSum]));
    expect(u.kind).toBe('sustainhub-portal');
    expect(u.kpis!.year).toBe(2024); expect(u.kpis!.baseYear).toBe(2019);
    expect(u.trajectory![0].year).toBe(2019); expect(u.trajectory![u.trajectory!.length - 1].year).toBe(2050);
    expect(u.roadmap!.find((r) => r.status === 'Implemented')!.phase).toBe('Done');
    expect(u.certs!.map((c) => c.id)).toEqual([SAMPLE.projects[1].id]);
    expect(u.docs![0].credits[0].status).toBe('Awaiting client');
    expect(JSON.stringify(u)).not.toContain('SECRET');
    expect(JSON.stringify(u).length).toBeLessThan(240000);
  });
  it('omits what was not ticked', () => {
    const u = buildPortalUpdate(buildPayload(hub, 'Client A', { ...cfg, sections: ['kpis'] }, [docSum]));
    expect(u.trajectory).toBeUndefined(); expect(u.certs).toBeUndefined(); expect(u.docs).toBeUndefined(); expect(u.roadmap).toBeUndefined();
  });
});

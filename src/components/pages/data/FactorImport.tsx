import React, { useMemo, useState } from 'react';
import { useHub } from '../../../context/HubContext';
import { uid } from '../../../utils/hub';
import { parseCsv, detectDesnz, desnzCandidates, genericCandidates, guessHeader, type Grid, type Candidate, type Mapping } from '../../../utils/factorImport';
import { S3_CATEGORIES } from '../../../types/hub';
import { OFFICIAL_SOURCES } from '../../../data/officialSources';
import type { OfficialPack } from '../../../data/packs';
import Modal from '../../ui/Modal';
import Icon from '../../ui/Icon';
import { useToast } from '../../ui/Toast';
import { Field } from './fields';

const MULT = [{ v: 1, l: 'kgCO₂e per unit' }, { v: 1000, l: 'tCO₂e per unit (×1000)' }, { v: 0.001, l: 'gCO₂e per unit (÷1000)' }];
const SHOW = 300;

/** Import factors from an official dataset file. The user reviews and ticks every row before anything is added. */
/** With `preset`, rows come from a bundled official pack (no file needed); otherwise from the user's file. */
const FactorImport: React.FC<{ onClose: () => void; sourceId?: string; preset?: { pack: OfficialPack; rows: Candidate[] } }> = ({ onClose, sourceId, preset }) => {
  const { dispatch } = useHub();
  const toast = useToast();
  const src = OFFICIAL_SOURCES.find((x) => x.id === (preset?.pack.sourceId ?? sourceId));
  const [sheets, setSheets] = useState<{ sheet: string; data: Grid }[] | null>(null);
  const [si, setSi] = useState(0);
  const [fileName, setFileName] = useState('');
  const [err, setErr] = useState('');
  const [map, setMap] = useState<Mapping | null>(null);
  const [pack, setPack] = useState(preset ? preset.pack.publisher : src ? `${src.publisher.split(' (')[0]} · ${src.dataset}` : '');
  const [edition, setEdition] = useState(preset ? `${preset.pack.edition}, ${preset.pack.published}` : '');
  const [url, setUrl] = useState(preset?.pack.url ?? src?.url ?? '');
  const [defScope, setDefScope] = useState<1 | 2 | 3>(src?.id === 'cea' ? 2 : 1);
  const [s2basis, setS2basis] = useState<'location' | 'market'>('location');
  const [s3cat, setS3cat] = useState('');
  const [q, setQ] = useState('');
  const [co2eOnly, setCo2eOnly] = useState(true);
  const [sel, setSel] = useState<Set<string>>(new Set());

  const grid = sheets?.[si]?.data ?? [];
  const desnz = useMemo(() => detectDesnz(grid), [grid]);
  const cands = useMemo<Candidate[]>(() => {
    if (preset) return preset.rows;
    if (!grid.length) return [];
    if (desnz) return desnzCandidates(grid, desnz);
    return map ? genericCandidates(grid, map) : [];
  }, [grid, desnz, map, preset]);
  const shown = cands.filter((c) => (!desnz || !co2eOnly || (c.gasUnit ?? '').trim().toLowerCase() === 'kg co2e') && (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.unit.toLowerCase().includes(q.toLowerCase())));

  const load = async (f?: File) => {
    if (!f) return;
    setErr(''); setSel(new Set()); setFileName(f.name); setMap(null);
    try {
      let all: { sheet: string; data: Grid }[];
      if (/\.xlsx$/i.test(f.name)) {
        const { default: read } = await import('read-excel-file/browser');
        all = (await read(f)) as unknown as { sheet: string; data: Grid }[];
      } else if (/\.(csv|txt)$/i.test(f.name)) all = [{ sheet: 'CSV', data: parseCsv(await f.text()) }];
      else throw new Error('Use an .xlsx or .csv file (save .xls as .xlsx first).');
      if (!all.length || !all.some((s) => s.data.length > 1)) throw new Error('No data found in this file.');
      // Prefer a sheet that looks like the DESNZ flat file, otherwise the largest sheet.
      const d = all.findIndex((s) => detectDesnz(s.data));
      const idx = d >= 0 ? d : all.reduce((b, s, i) => (s.data.length > all[b].data.length ? i : b), 0);
      setSheets(all); setSi(idx);
      const L = detectDesnz(all[idx].data);
      if (L) { setPack('UK DESNZ · GHG reporting conversion factors'); setEdition(L.year); setUrl(OFFICIAL_SOURCES.find((x) => x.id === 'desnz')!.url); }
      else initMap(all[idx].data);
    } catch (e) { setErr((e as Error).message); setSheets(null); }
  };
  const initMap = (g: Grid) => { const h = guessHeader(g); setMap({ header: h, name: [0], unit: 1, value: 2, scope: -1, ref: -1, multiplier: 1 }); };
  const heads = map ? (grid[map.header] ?? []).map((h, i) => `${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''} · ${String(h ?? '').slice(0, 40) || '(blank)'}`) : [];

  const toggle = (k: string) => setSel((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const ready = pack.trim() && edition.trim() && sel.size > 0;
  const doImport = () => {
    if (!ready) return;
    const chosen = cands.filter((c) => sel.has(c.key));
    const items = chosen.map((c) => {
      const scope = c.scope ?? defScope;
      return { id: uid(), name: c.name, unit: c.unit, kgPerUnit: c.kgPerUnit, scope,
        s2basis: scope === 2 ? s2basis : undefined, s3cat: scope === 3 ? (s3cat ? Number(s3cat) : c.s3cat) : undefined,
        source: `${pack.trim()} ${edition.trim()} · ${c.ref ?? ''}`.trim(), official: true, pack: `${pack.trim()} ${edition.trim()}`, ref: c.ref, url: url.trim() || undefined };
    });
    dispatch({ type: 'ADD_FACTORS', items });
    toast(`Imported ${items.length} factor${items.length > 1 ? 's' : ''} from ${pack} ${edition}`);
    onClose();
  };

  return (
    <Modal wide title={src ? `Import from ${src.dataset}` : 'Import official emission factors'} onClose={onClose}
      footer={<>
        <span className="cell-sub grow">{sel.size ? `${sel.size} selected` : 'Tick the factors you will use'}</span>
        <button className="btn btn-out" onClick={onClose}>Cancel</button>
        <button className="btn btn-pri" disabled={!ready} onClick={doImport} title={!pack || !edition ? 'Enter dataset and edition' : ''}><Icon name="download" size={15} />Import {sel.size || ''} factor{sel.size === 1 ? '' : 's'}</button>
      </>}>
      {preset && <div className="notice info"><Icon name="check" size={16} /><span className="grow"><b>{preset.pack.title}</b> — {preset.pack.edition}, {preset.pack.published}. {preset.pack.note} Values are exactly as published; tick the rows you will use.{preset.pack.licence ? ` ${preset.pack.licence}` : ''}</span></div>}
      {!preset && src && <div className="notice info"><Icon name="info" size={16} /><span className="grow"><b>{src.publisher}.</b> {src.howTo} <a href={src.url} target="_blank" rel="noreferrer">Open publisher site ↗</a></span></div>}

      {!preset && <div className="row" style={{ marginBottom: 14 }}>
        <label className="btn btn-pri" style={{ cursor: 'pointer' }}>
          <Icon name="upload" size={15} />{fileName ? 'Choose another file' : 'Choose .xlsx or .csv'}
          <input type="file" accept=".xlsx,.csv,text/csv" hidden data-testid="factor-file" onChange={(e) => load(e.target.files?.[0])} />
        </label>
        {fileName && <span className="cell-sub">{fileName}</span>}
        {sheets && sheets.length > 1 && (
          <label className="mini">Sheet <select value={si} onChange={(e) => { const i = Number(e.target.value); setSi(i); setSel(new Set()); if (!detectDesnz(sheets[i].data)) initMap(sheets[i].data); }}>
            {sheets.map((s, i) => <option key={i} value={i}>{s.sheet}</option>)}</select></label>
        )}
        {desnz && <span className="badge b-pass">DESNZ flat file recognised</span>}
      </div>}
      {err && <div className="notice err-n" role="alert"><Icon name="alert" size={16} /><span>{err}</span></div>}

      {(sheets || preset) && (<>
        <div className="form-grid">
          <Field label="Dataset / publisher" hint="e.g. CEA CO₂ Baseline Database, UK DESNZ conversion factors"><input value={pack} onChange={(e) => setPack(e.target.value)} className={!pack.trim() ? 'invalid' : ''} /></Field>
          <Field label="Edition / version / year" hint="Must match your reporting period"><input value={edition} onChange={(e) => setEdition(e.target.value)} placeholder="e.g. 2025 or v21.0" className={!edition.trim() ? 'invalid' : ''} /></Field>
          <Field label="Source URL"><input value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
          <Field label="Scope for rows without one"><select value={defScope} onChange={(e) => setDefScope(Number(e.target.value) as 1 | 2 | 3)}><option value={1}>Scope 1</option><option value={2}>Scope 2</option><option value={3}>Scope 3</option></select></Field>
          <Field label="Scope 2 basis"><select value={s2basis} onChange={(e) => setS2basis(e.target.value as 'location' | 'market')}><option value="location">Location-based</option><option value="market">Market-based</option></select></Field>
          <Field label="Scope 3 category for imported rows" hint={preset ? 'Blank keeps each row\'s own category' : undefined}><select value={s3cat} onChange={(e) => setS3cat(e.target.value)}><option value="">{preset ? 'As tagged in pack' : 'Not specified'}</option>{S3_CATEGORIES.map((c) => <option key={c.n} value={c.n}>{c.n}. {c.name}</option>)}</select></Field>
        </div>

        {!desnz && map && (<>
          <div className="divider" />
          <div style={{ marginBottom: 8 }}><b>Map columns</b> <span className="cell-sub">tell SustainHub where the name, unit and factor are</span></div>
          <div className="form-grid">
            <Field label="Header row"><input type="number" min={1} value={map.header + 1} onChange={(e) => setMap({ ...map, header: Math.max(0, Number(e.target.value) - 1) })} /></Field>
            <Field label="Name column(s)" hint="Ctrl/⌘-click to join several"><select multiple size={4} value={map.name.map(String)} onChange={(e) => setMap({ ...map, name: [...e.target.selectedOptions].map((o) => Number(o.value)) })}>{heads.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></Field>
            <Field label="Unit column"><select value={map.unit} onChange={(e) => setMap({ ...map, unit: Number(e.target.value) })}>{heads.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></Field>
            <Field label="Factor value column"><select value={map.value} onChange={(e) => setMap({ ...map, value: Number(e.target.value) })}>{heads.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></Field>
            <Field label="Value is in"><select value={map.multiplier} onChange={(e) => setMap({ ...map, multiplier: Number(e.target.value) })}>{MULT.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}</select></Field>
            <Field label="Scope column (optional)"><select value={map.scope ?? -1} onChange={(e) => setMap({ ...map, scope: Number(e.target.value) })}><option value={-1}>None</option>{heads.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></Field>
            <Field label="Reference / ID column (optional)"><select value={map.ref ?? -1} onChange={(e) => setMap({ ...map, ref: Number(e.target.value) })}><option value={-1}>Row number</option>{heads.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></Field>
          </div>
        </>)}

        <div className="divider" />
        <div className="row" style={{ marginBottom: 10 }}>
          <div className="inp-ic grow"><Icon name="search" size={15} /><input className="inp" placeholder={`Search ${cands.length.toLocaleString()} rows (e.g. diesel, electricity, flight, hotel)`} value={q} onChange={(e) => setQ(e.target.value)} /></div>
          {desnz && <label className="row cell-sub" style={{ gap: 6 }}><input type="checkbox" checked={co2eOnly} onChange={(e) => setCo2eOnly(e.target.checked)} />kg CO₂e rows only</label>}
          <button className="btn btn-ghost btn-sm" disabled={!shown.length} onClick={() => setSel((s) => new Set([...s, ...shown.map((c) => c.key)]))}>Select {shown.length > SHOW ? `all ${shown.length.toLocaleString()}` : 'shown'}</button>
          <button className="btn btn-ghost btn-sm" disabled={!sel.size} onClick={() => setSel(new Set())}>Clear</button>
        </div>
        <div className="tbl-wrap" style={{ maxHeight: 340, overflowY: 'auto' }}><table>
          <thead><tr><th style={{ width: 34 }} /><th>Factor</th><th>Unit</th><th className="num">kgCO₂e / unit</th><th>Scope</th><th>Ref.</th></tr></thead>
          <tbody>
            {shown.slice(0, SHOW).map((c) => (
              <tr key={c.key} onClick={() => toggle(c.key)} style={{ cursor: 'pointer', background: sel.has(c.key) ? 'var(--pri-lt)' : undefined }}>
                <td><input type="checkbox" checked={sel.has(c.key)} readOnly aria-label={`Select ${c.name}`} /></td>
                <td style={{ fontSize: '.82rem' }}>{c.name}</td><td className="cell-sub">{c.unit}{c.gasUnit && c.gasUnit.trim().toLowerCase() !== 'kg co2e' ? ` (${c.gasUnit})` : ''}</td>
                <td className="num mono">{c.kgPerUnit.toLocaleString('en-US', { maximumSignificantDigits: 8 })}</td>
                <td className="cell-sub">{c.scope ? `S${c.scope}` : `S${defScope}*`}</td><td className="cell-sub mono">{c.ref}</td>
              </tr>))}
            {!shown.length && <tr><td colSpan={6} className="cell-sub" style={{ textAlign: 'center', padding: 20 }}>{cands.length ? 'No rows match' : 'No numeric factor rows found with this mapping'}</td></tr>}
          </tbody>
        </table></div>
        {shown.length > SHOW && <div className="hint" style={{ marginTop: 6 }}>Showing the first {SHOW} of {shown.length.toLocaleString()} matches; refine the search to see more.</div>}
        <div className="hint" style={{ marginTop: 6 }}>Values are exactly as {preset ? 'published in the source document' : 'in your file'}. Each imported factor records dataset, edition and row so it can be traced, and editing a value later removes its "official" tag.</div>
      </>)}
    </Modal>
  );
};
export default FactorImport;

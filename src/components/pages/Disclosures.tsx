import React, { useState } from 'react';
import { useHub } from '../../context/HubContext';
import { useLCA } from '../../context/LCAContext';
import { disclosures, type DStatus } from '../../utils/hub';
import Icon from '../ui/Icon';
import EmptyState from '../ui/EmptyState';
import { useToast } from '../ui/Toast';

const BADGE: Record<DStatus, [string, string]> = { ok: ['b-pass', 'Available'], partial: ['b-warn', 'Partial'], missing: ['b-fail', 'Missing'] };

const Disclosures: React.FC = () => {
  const { hub } = useHub();
  const { dispatch } = useLCA();
  const toast = useToast();
  const years = hub.ghg.map((g) => g.year);
  const [year, setYear] = useState<number | null>(years.length ? years[years.length - 1] : null);
  const [busy, setBusy] = useState(false);
  const yr = year != null && years.includes(year) ? year : years[years.length - 1];
  const fw = yr != null ? disclosures(hub.ghg, hub.settings, yr) : [];
  const prevYear = yr != null ? years[years.indexOf(yr) - 1] : undefined;

  const copy = async (id: string) => {
    const f = fw.find((x) => x.id === id)!;
    const tsv = [['Reference', 'Disclosure', String(yr), prevYear ? String(prevYear) : 'Previous', 'Unit', 'Status', 'Note'],
      ...f.lines.map((l) => [l.ref, l.item, l.value, l.prev ?? '', l.unit, BADGE[l.status][1], l.note ?? ''])].map((r) => r.join('\t')).join('\n');
    try { await navigator.clipboard.writeText(tsv); toast(`${f.name} copied, ready to paste into Excel or Word`); }
    catch { toast('Clipboard blocked by the browser; use the Excel export instead', 'err'); }
  };
  const xlsx = async () => {
    setBusy(true);
    try { const { exportWorkbook } = await import('../../utils/xlsx'); await exportWorkbook(hub); toast('Excel workbook downloaded'); }
    catch (e) { toast(`Export failed: ${(e as Error).message}`, 'err'); }
    setBusy(false);
  };

  if (!hub.ghg.length) {
    return (
      <div>
        <div className="ph"><div><div className="ph-eyebrow">Portfolio</div><div className="ph-title">Disclosures</div>
          <div className="ph-sub">Report-ready GHG tables for GHG Protocol, GRI 305, BRSR and IFRS S2.</div></div></div>
        <div className="card"><EmptyState icon={<Icon name="clipboard" size={30} />} title="Nothing to disclose yet"
          body="Disclosure tables fill in automatically from your inventory, and gaps are flagged so you know what to collect before the reporting deadline.">
          <button className="btn btn-pri btn-lg" onClick={() => dispatch({ type: 'SET_PAGE', page: 'data' })}><Icon name="database" size={16} />Add inventory data</button>
        </EmptyState></div>
      </div>
    );
  }

  const all = fw.flatMap((f) => f.lines);
  const score = (ls: typeof all) => Math.round((ls.reduce((a, l) => a + (l.status === 'ok' ? 1 : l.status === 'partial' ? 0.5 : 0), 0) / ls.length) * 100);

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Portfolio</div>
          <div className="ph-title">Disclosures</div>
          <div className="ph-sub">{hub.settings.orgName || 'Your organisation'} · values for {yr}{prevYear ? ` with ${prevYear} comparatives` : ''} · Scope 2 {hub.settings.s2Method}-based where one figure is asked for</div>
        </div>
        <div className="ph-actions">
          <label className="mini">Reporting year
            <select value={yr} onChange={(e) => setYear(Number(e.target.value))}>{[...years].reverse().map((y) => <option key={y}>{y}</option>)}</select></label>
          <button className="btn btn-out" onClick={() => window.print()}><Icon name="file" size={16} />Print / PDF</button>
          <button className="btn btn-pri" onClick={xlsx} disabled={busy}><Icon name="sheet" size={16} />{busy ? 'Building…' : 'Export Excel workbook'}</button>
        </div>
      </div>

      {hub.isSample && <div className="notice"><Icon name="alert" size={16} /><span className="grow">These figures come from fictional sample data.</span></div>}
      <div className="notice info"><Icon name="info" size={16} /><span className="grow">References follow GRI 305 (2016), SEBI BRSR Principle 6 and IFRS S2 ¶29. Check them against the framework version you report under; this page maps your data, it does not replace an assurance review.</span></div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {fw.map((f, i) => { const sc = score(f.lines); return (
          <a key={f.id} href={`#fw-${f.id}`} className={`kpi rise tone-${sc >= 90 ? 'acc' : sc >= 60 ? 'warn' : 'err'}`} style={{ ['--i' as string]: i, textDecoration: 'none', color: 'inherit' }}>
            <div className="kpi-top"><span className="kpi-ic"><Icon name="clipboard" size={16} /></span><span className="kpi-lbl">{f.name}</span></div>
            <div className="kpi-val">{sc}%<span className="kpi-unit">ready</span></div>
            <div className="prog" style={{ marginTop: 10 }}><div className="prog-fill" style={{ width: `${sc}%`, background: 'var(--tone)' }} /></div>
            <div className="kpi-sub" style={{ marginTop: 6 }}>{f.lines.filter((l) => l.status !== 'ok').length} item{f.lines.filter((l) => l.status !== 'ok').length === 1 ? '' : 's'} to complete · {f.scope}</div>
          </a>); })}
      </div>

      {fw.map((f, i) => (
        <section key={f.id} id={`fw-${f.id}`} className="card rise" style={{ ['--i' as string]: 4 + i, marginBottom: 16 }}>
          <div className="card-hd">
            <span className="card-ic"><Icon name="clipboard" size={17} /></span>
            <div><div className="t">{f.name}</div><div className="s">{f.scope}</div></div>
            <div className="r"><button className="btn btn-ghost btn-sm" onClick={() => copy(f.id)}><Icon name="copy" size={14} />Copy table</button></div>
          </div>
          <div className="tbl-wrap"><table>
            <thead><tr><th style={{ width: 90 }}>Ref.</th><th>Disclosure</th><th className="num">{yr}</th><th className="num">{prevYear ?? 'Prev.'}</th><th>Unit</th><th>Status</th><th>Note</th></tr></thead>
            <tbody>{f.lines.map((l, k) => (
              <tr key={k}>
                <td><span className="mono cell-sub">{l.ref}</span></td>
                <td className="cell-main" style={{ fontWeight: 500 }}>{l.item}</td>
                <td className="num"><b>{l.value}</b></td>
                <td className="num muted">{l.prev ?? '—'}</td>
                <td className="cell-sub">{l.unit}</td>
                <td><span className={`badge ${BADGE[l.status][0]}`}>{BADGE[l.status][1]}</span></td>
                <td className="cell-sub" style={{ maxWidth: 320 }}>{l.note ?? ''}</td>
              </tr>))}
            </tbody>
          </table></div>
        </section>
      ))}
    </div>
  );
};
export default Disclosures;

import React, { useState } from 'react';
import { useHub } from '../../../context/HubContext';
import { uid, fmt } from '../../../utils/hub';
import { LEVER_STATUSES, type Lever, type LeverStatus } from '../../../types/hub';
import Modal from '../../ui/Modal';
import Icon from '../../ui/Icon';
import EmptyState from '../../ui/EmptyState';
import { useToast } from '../../ui/Toast';
import { STATUS_COL } from '../CommandCenter';
import { Field, Num, Section, n, okNum } from './fields';
import { ask } from '../../../utils/platform';

type D = { id: string; name: string; scope: 1 | 2 | 3; abatement: string; status: LeverStatus; year: string; costPerT: string };

const LeversTab: React.FC = () => {
  const { hub, dispatch } = useHub();
  const toast = useToast();
  const [d, setD] = useState<D | null>(null);
  const [tried, setTried] = useState(false);
  const isNew = d ? !hub.levers.some((l) => l.id === d.id) : false;
  const errs = d ? {
    name: !d.name.trim() && 'Required', abatement: !okNum(d.abatement) && 'Required, ≥ 0',
    year: d.year !== '' && !(Number.isInteger(n(d.year)) && n(d.year) >= 1990 && n(d.year) <= 2100) && 'Year 1990–2100 or blank',
    cost: d.costPerT !== '' && !Number.isFinite(n(d.costPerT)) && 'A number (negative = saving) or blank',
  } : {};
  const save = () => {
    setTried(true);
    if (!d || Object.values(errs).some(Boolean)) return;
    dispatch({ type: 'UPSERT_LEVER', item: { id: d.id, name: d.name.trim(), scope: d.scope, abatement: n(d.abatement), status: d.status,
      year: d.year === '' ? undefined : n(d.year), costPerT: d.costPerT === '' ? undefined : n(d.costPerT) } });
    toast(isNew ? `Added ${d.name}` : `Saved ${d.name}`); setD(null); setTried(false);
  };
  const edit = (l?: Lever) => { setTried(false); setD(l ? { ...l, abatement: String(l.abatement), year: l.year != null ? String(l.year) : '', costPerT: l.costPerT != null ? String(l.costPerT) : '' }
    : { id: uid(), name: '', scope: 2, abatement: '', status: 'Identified', year: '', costPerT: '' }); };
  const tot = (s: (l: Lever) => boolean) => hub.levers.filter(s).reduce((a, l) => a + l.abatement, 0);

  return (
    <>
      <Section title="Decarbonisation levers" sub="Annual abatement once fully delivered. Implemented levers are treated as already in your actuals and not counted toward the remaining gap."
        actions={<button className="btn btn-pri btn-sm" onClick={() => edit()}><Icon name="plus" size={14} />Add lever</button>}>
        {hub.levers.length === 0 ? (
          <EmptyState compact icon={<Icon name="zap" size={22} />} title="No levers yet" body="Typical ones: on-site or open-access solar, heat-pump retrofits, BMS tuning, fleet EVs, low-carbon concrete and steel.">
            <button className="btn btn-pri btn-sm" onClick={() => edit()}><Icon name="plus" size={14} />Add first lever</button>
          </EmptyState>
        ) : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Lever</th><th>Scope</th><th className="num">Abatement (tCO₂e/yr)</th><th className="num">Delivery</th><th className="num">{hub.settings.currency}/tCO₂e</th><th>Status</th><th /></tr></thead>
            <tbody>{[...hub.levers].sort((a, b) => b.abatement - a.abatement).map((l) => (
              <tr key={l.id}>
                <td className="cell-main">{l.name}</td>
                <td><span className="badge b-na">Scope {l.scope}</span></td>
                <td className="num">{fmt(l.abatement)}</td>
                <td className="num">{l.year ?? <span className="muted">—</span>}</td>
                <td className="num" style={{ color: l.costPerT != null && l.costPerT < 0 ? 'var(--acc)' : undefined }}>{l.costPerT != null ? fmt(l.costPerT) : <span className="muted">—</span>}</td>
                <td><span className="row" style={{ gap: 6 }}><span className="sw" style={{ background: STATUS_COL[l.status] }} />{l.status}</span></td>
                <td><div className="row-actions">
                  <button className="icon-btn sm" aria-label={`Edit ${l.name}`} onClick={() => edit(l)}><Icon name="edit" size={15} /></button>
                  <button className="icon-btn sm danger" aria-label={`Delete ${l.name}`} onClick={async () => { if (await ask(`Delete ${l.name}?`)) { dispatch({ type: 'DELETE_LEVER', id: l.id }); toast(`Deleted ${l.name}`, 'info'); } }}><Icon name="trash" size={15} /></button>
                </div></td>
              </tr>))}
            </tbody>
            <tfoot><tr><td colSpan={2}>Open Scope 1+2 (counts toward gap)</td><td className="num">{fmt(tot((l) => l.scope !== 3 && l.status !== 'Implemented'))}</td><td colSpan={4} className="cell-sub">Scope 3 open: {fmt(tot((l) => l.scope === 3 && l.status !== 'Implemented'))}</td></tr></tfoot>
          </table></div>
        )}
      </Section>
      {d && (
        <Modal title={isNew ? 'Add lever' : `Edit ${d.name}`} onClose={() => setD(null)}
          footer={<><button className="btn btn-out" onClick={() => setD(null)}>Cancel</button><button className="btn btn-pri" onClick={save}><Icon name="save" size={15} />Save</button></>}>
          <form className="form-grid" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Field label="Lever" className="full" error={tried && errs.name}><input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. Heat-pump retrofit" className={tried && errs.name ? 'invalid' : ''} /></Field>
            <Field label="Scope"><select value={d.scope} onChange={(e) => setD({ ...d, scope: Number(e.target.value) as 1 | 2 | 3 })}><option value={1}>Scope 1</option><option value={2}>Scope 2</option><option value={3}>Scope 3</option></select></Field>
            <Field label="Abatement (tCO₂e/yr)" error={tried && errs.abatement}><Num value={d.abatement} onChange={(v) => setD({ ...d, abatement: v })} invalid={tried && !!errs.abatement} /></Field>
            <Field label="Delivery year" error={tried && errs.year} hint="Full effect from this year; drives the projection line"><Num value={d.year} onChange={(v) => setD({ ...d, year: v })} invalid={tried && !!errs.year} placeholder="e.g. 2027" /></Field>
            <Field label={`Cost per tonne (${hub.settings.currency}/tCO₂e)`} error={tried && errs.cost} hint="Annualised net cost; negative = saves money. Drives the MACC"><Num value={d.costPerT} onChange={(v) => setD({ ...d, costPerT: v })} invalid={tried && !!errs.cost} placeholder="e.g. -1500" /></Field>
            <Field label="Status"><select value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as LeverStatus })}>{LEVER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <button type="submit" hidden />
          </form>
        </Modal>
      )}
    </>
  );
};
export default LeversTab;

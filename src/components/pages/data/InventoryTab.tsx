import React, { useState } from 'react';
import { useHub } from '../../../context/HubContext';
import { fmt, total, download, GHG_TEMPLATE } from '../../../utils/hub';
import type { GhgYear } from '../../../types/hub';
import Modal from '../../ui/Modal';
import Icon from '../../ui/Icon';
import EmptyState from '../../ui/EmptyState';
import ImportGhg from '../../ui/ImportGhg';
import { useToast } from '../../ui/Toast';
import { Field, Num, Section, n, okNum } from './fields';

type D = { year: string; scope1: string; scope2: string; scope2m: string; scope3: string };
const toD = (g?: GhgYear, year?: number): D => ({
  year: String(g?.year ?? year ?? new Date().getFullYear() - 1), scope1: g ? String(g.scope1) : '', scope2: g ? String(g.scope2) : '',
  scope2m: g?.scope2m != null ? String(g.scope2m) : '', scope3: g ? String(g.scope3) : '',
});

const InventoryTab: React.FC = () => {
  const { hub, dispatch } = useHub();
  const toast = useToast();
  const [edit, setEdit] = useState<{ d: D; orig?: number } | null>(null);
  const [tried, setTried] = useState(false);

  const d = edit?.d;
  const yr = d ? n(d.year) : NaN;
  const errs = d ? {
    year: !(Number.isInteger(yr) && yr >= 1990 && yr <= 2100) ? 'Year between 1990 and 2100'
      : hub.ghg.some((g) => g.year === yr && g.year !== edit!.orig) ? 'This year already exists' : '',
    scope1: !okNum(d.scope1) && 'Required, ≥ 0', scope2: !okNum(d.scope2) && 'Required, ≥ 0', scope3: !okNum(d.scope3) && 'Required, ≥ 0',
    scope2m: d.scope2m !== '' && !okNum(d.scope2m) && 'Must be ≥ 0 or blank',
  } : {};
  const valid = d && !Object.values(errs).some(Boolean);
  const set = (k: keyof D) => (v: string) => setEdit((e) => e && { ...e, d: { ...e.d, [k]: v } });

  const save = () => {
    setTried(true);
    if (!valid || !d) return;
    dispatch({ type: 'UPSERT_GHG', replaceYear: edit!.orig, row: { year: yr, scope1: n(d.scope1), scope2: n(d.scope2), scope2m: d.scope2m === '' ? null : n(d.scope2m), scope3: n(d.scope3) } });
    toast(edit!.orig ? `Updated ${yr}` : `Added ${yr}`);
    setEdit(null); setTried(false);
  };
  const open = (g?: GhgYear) => { setTried(false); setEdit({ d: toD(g, g ? undefined : (hub.ghg[hub.ghg.length - 1]?.year ?? new Date().getFullYear() - 2) + 1), orig: g?.year }); };

  return (
    <>
      <Section title="Yearly GHG inventory" sub="tCO₂e. The first (earliest) year is the base year for the pathway. Report Scope 2 both ways where you can (GHG Protocol dual reporting)."
        actions={<>
          <button className="btn btn-ghost btn-sm" onClick={() => download('ghg-template.csv', GHG_TEMPLATE)}><Icon name="download" size={14} />Template</button>
          <ImportGhg className="btn btn-out btn-sm" />
          <button className="btn btn-pri btn-sm" onClick={() => open()}><Icon name="plus" size={14} />Add year</button>
        </>}>
        {hub.ghg.length === 0 ? (
          <EmptyState compact icon={<Icon name="chart" size={22} />} title="No inventory years yet"
            body="Add your base year first, then each reporting year. Or build totals from activity data in the Calculator tab.">
            <button className="btn btn-pri btn-sm" onClick={() => open()}><Icon name="plus" size={14} />Add base year</button>
          </EmptyState>
        ) : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Year</th><th className="num">Scope 1</th><th className="num">Scope 2 · location</th><th className="num">Scope 2 · market</th><th className="num">Scope 3</th><th className="num">Total (loc.)</th><th /></tr></thead>
            <tbody>
              {hub.ghg.map((g, k) => (
                <tr key={g.year}>
                  <td><span className="cell-main">{g.year}</span>{k === 0 && <span className="badge b-pri" style={{ marginLeft: 8 }}>Base</span>}</td>
                  <td className="num">{fmt(g.scope1)}</td><td className="num">{fmt(g.scope2)}</td>
                  <td className="num">{g.scope2m != null ? fmt(g.scope2m) : <span className="muted">—</span>}</td>
                  <td className="num">{fmt(g.scope3)}</td><td className="num"><b>{fmt(total(g))}</b></td>
                  <td><div className="row-actions">
                    <button className="icon-btn sm" onClick={() => open(g)} aria-label={`Edit ${g.year}`}><Icon name="edit" size={15} /></button>
                    <button className="icon-btn sm danger" aria-label={`Delete ${g.year}`} onClick={() => { if (confirm(`Delete inventory year ${g.year}?`)) { dispatch({ type: 'DELETE_GHG', year: g.year }); toast(`Deleted ${g.year}`, 'info'); } }}><Icon name="trash" size={15} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </Section>

      {edit && d && (
        <Modal title={edit.orig ? `Edit ${edit.orig}` : 'Add inventory year'} onClose={() => setEdit(null)}
          footer={<><button className="btn btn-out" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-pri" onClick={save}><Icon name="save" size={15} />Save</button></>}>
          <form className="form-grid" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Field label="Reporting year" error={tried && errs.year}><Num value={d.year} onChange={set('year')} invalid={tried && !!errs.year} /></Field>
            <Field label="Scope 1 (tCO₂e)" error={tried && errs.scope1} hint="Direct: fuels, refrigerants, fleet"><Num value={d.scope1} onChange={set('scope1')} invalid={tried && !!errs.scope1} step={0.01} /></Field>
            <Field label="Scope 2 location-based (tCO₂e)" error={tried && errs.scope2} hint="Grid-average factor"><Num value={d.scope2} onChange={set('scope2')} invalid={tried && !!errs.scope2} step={0.01} /></Field>
            <Field label="Scope 2 market-based (tCO₂e)" error={tried && errs.scope2m} hint="Optional: contracts, RECs, PPAs"><Num value={d.scope2m} onChange={set('scope2m')} invalid={tried && !!errs.scope2m} step={0.01} placeholder="Leave blank if not reported" /></Field>
            <Field label="Scope 3 (tCO₂e)" error={tried && errs.scope3} hint="Value chain, all reported categories"><Num value={d.scope3} onChange={set('scope3')} invalid={tried && !!errs.scope3} step={0.01} /></Field>
            <button type="submit" hidden />
          </form>
        </Modal>
      )}
    </>
  );
};
export default InventoryTab;

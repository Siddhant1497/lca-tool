import React, { useState } from 'react';
import { useHub } from '../../../context/HubContext';
import { useLCA } from '../../../context/LCAContext';
import { fmt, total, download, GHG_TEMPLATE, hasS3Cats } from '../../../utils/hub';
import { S3_CATEGORIES, REVENUE_UNITS, type GhgYear, type RevenueUnit } from '../../../types/hub';
import Modal from '../../ui/Modal';
import Icon from '../../ui/Icon';
import EmptyState from '../../ui/EmptyState';
import ImportGhg from '../../ui/ImportGhg';
import { useToast } from '../../ui/Toast';
import { Field, Num, Section, n, okNum } from './fields';

type D = {
  year: string; scope1: string; scope2: string; scope2m: string; scope3: string;
  useCats: boolean; cats: Record<number, string>; area: string; fte: string; revenue: string;
};
const str = (x?: number | null) => (x == null ? '' : String(x));
const toD = (g?: GhgYear, year?: number): D => ({
  year: String(g?.year ?? year ?? new Date().getFullYear() - 1), scope1: str(g?.scope1), scope2: str(g?.scope2),
  scope2m: str(g?.scope2m), scope3: str(g?.scope3), useCats: hasS3Cats(g),
  cats: Object.fromEntries(S3_CATEGORIES.map((c) => [c.n, str(g?.s3cats?.[c.n])])),
  area: str(g?.denom?.area), fte: str(g?.denom?.fte), revenue: str(g?.denom?.revenue),
});
const optOk = (s: string) => s === '' || okNum(s);
const optN = (s: string) => (s === '' ? undefined : n(s));

const InventoryTab: React.FC = () => {
  const { hub, dispatch } = useHub();
  const { results } = useLCA();
  const toast = useToast();
  const [edit, setEdit] = useState<{ d: D; orig?: number } | null>(null);
  const [tried, setTried] = useState(false);
  const S = hub.settings;

  const d = edit?.d;
  const yr = d ? n(d.year) : NaN;
  const catSum = d ? S3_CATEGORIES.reduce((a, c) => a + (Number(d.cats[c.n]) || 0), 0) : 0;
  const badCat = d ? S3_CATEGORIES.some((c) => !optOk(d.cats[c.n])) : false;
  const errs = d ? {
    year: !(Number.isInteger(yr) && yr >= 1990 && yr <= 2100) ? 'Year between 1990 and 2100'
      : hub.ghg.some((g) => g.year === yr && g.year !== edit!.orig) ? 'This year already exists' : '',
    scope1: !okNum(d.scope1) && 'Required, ≥ 0', scope2: !okNum(d.scope2) && 'Required, ≥ 0',
    scope3: !d.useCats && !okNum(d.scope3) && 'Required, ≥ 0',
    scope2m: !optOk(d.scope2m) && 'Must be ≥ 0 or blank',
    cats: d.useCats && (badCat ? 'Category values must be ≥ 0 or blank' : catSum <= 0 ? 'Enter at least one category' : ''),
    area: !optOk(d.area) && '≥ 0 or blank', fte: !optOk(d.fte) && '≥ 0 or blank', revenue: !optOk(d.revenue) && '≥ 0 or blank',
  } : {};
  const valid = d && !Object.values(errs).some(Boolean);
  const set = (k: keyof D) => (v: string) => setEdit((e) => e && { ...e, d: { ...e.d, [k]: v } });
  const setCat = (c: number, v: string) => setEdit((e) => e && { ...e, d: { ...e.d, cats: { ...e.d.cats, [c]: v } } });

  const save = () => {
    setTried(true);
    if (!valid || !d) return;
    const s3cats = d.useCats ? Object.fromEntries(S3_CATEGORIES.filter((c) => Number(d.cats[c.n]) > 0).map((c) => [c.n, n(d.cats[c.n])])) : undefined;
    const denom = { area: optN(d.area), fte: optN(d.fte), revenue: optN(d.revenue) };
    dispatch({ type: 'UPSERT_GHG', replaceYear: edit!.orig, row: {
      year: yr, scope1: n(d.scope1), scope2: n(d.scope2), scope2m: d.scope2m === '' ? null : n(d.scope2m),
      scope3: d.useCats ? catSum : n(d.scope3), s3cats,
      denom: Object.values(denom).some((x) => x != null) ? denom : undefined,
    } });
    toast(edit!.orig ? `Updated ${yr}` : `Added ${yr}`);
    setEdit(null); setTried(false);
  };
  const last = hub.ghg[hub.ghg.length - 1];
  const open = (g?: GhgYear) => {
    setTried(false);
    // New years start with the previous year's denominators, which rarely change much.
    const dd = toD(g, g ? undefined : (last?.year ?? new Date().getFullYear() - 2) + 1);
    if (!g && last?.denom) Object.assign(dd, { area: str(last.denom.area), fte: str(last.denom.fte), revenue: str(last.denom.revenue) });
    setEdit({ d: dd, orig: g?.year });
  };
  const lcaA13 = results?.byStage['A1-A3']?.GWP ? results.byStage['A1-A3']!.GWP / 1000 : null;

  return (
    <>
      <Section title="Yearly GHG inventory" sub="tCO₂e. The earliest year is the base year. Report Scope 2 both ways where you can (GHG Protocol dual reporting)."
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
            <thead><tr><th>Year</th><th className="num">Scope 1</th><th className="num">S2 location</th><th className="num">S2 market</th><th className="num">Scope 3</th><th className="num">Total (loc.)</th><th>Detail</th><th /></tr></thead>
            <tbody>
              {hub.ghg.map((g, k) => (
                <tr key={g.year}>
                  <td><span className="cell-main">{g.year}</span>{k === 0 && <span className="badge b-pri" style={{ marginLeft: 8 }}>Base</span>}</td>
                  <td className="num">{fmt(g.scope1)}</td><td className="num">{fmt(g.scope2)}</td>
                  <td className="num">{g.scope2m != null ? fmt(g.scope2m) : <span className="muted">—</span>}</td>
                  <td className="num">{fmt(g.scope3)}</td><td className="num"><b>{fmt(total(g))}</b></td>
                  <td><div className="row" style={{ gap: 4 }}>
                    {hasS3Cats(g) && <span className="badge b-info" title="Scope 3 split by category">S3 {Object.keys(g.s3cats!).length} cats</span>}
                    {g.denom && <span className="badge b-na" title="Intensity denominators entered">Intensity</span>}
                  </div></td>
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

      <Section title="Reporting settings" sub="Used for intensity metrics and disclosure tables.">
        <div className="form-grid">
          <Field label="Organisation name" hint="Shown on exports"><input value={S.orgName} onChange={(e) => dispatch({ type: 'SET_SETTINGS', settings: { orgName: e.target.value } })} /></Field>
          <Field label="Turnover unit" hint="₹ units enable the BRSR per-rupee intensity">
            <select value={S.revenueUnit} onChange={(e) => dispatch({ type: 'SET_SETTINGS', settings: { revenueUnit: e.target.value as RevenueUnit } })}>
              {REVENUE_UNITS.map((u) => <option key={u.id}>{u.id}</option>)}</select></Field>
          <Field label="Currency for lever costs" hint="Used in the MACC"><input value={S.currency} onChange={(e) => dispatch({ type: 'SET_SETTINGS', settings: { currency: e.target.value } })} /></Field>
        </div>
      </Section>

      {edit && d && (
        <Modal wide title={edit.orig ? `Edit ${edit.orig}` : 'Add inventory year'} onClose={() => setEdit(null)}
          footer={<><button className="btn btn-out" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-pri" onClick={save}><Icon name="save" size={15} />Save</button></>}>
          <form onSubmit={(e) => { e.preventDefault(); save(); }}>
            <div className="form-grid">
              <Field label="Reporting year" error={tried && errs.year}><Num value={d.year} onChange={set('year')} invalid={tried && !!errs.year} label="Reporting year" /></Field>
              <Field label="Scope 1 (tCO₂e)" error={tried && errs.scope1} hint="Fuels, refrigerants, fleet"><Num value={d.scope1} onChange={set('scope1')} invalid={tried && !!errs.scope1} step={0.01} label="Scope 1" /></Field>
              <Field label="Scope 2 location-based" error={tried && errs.scope2} hint="Grid-average factor"><Num value={d.scope2} onChange={set('scope2')} invalid={tried && !!errs.scope2} step={0.01} label="Scope 2 location" /></Field>
              <Field label="Scope 2 market-based" error={tried && errs.scope2m} hint="Optional: contracts, RECs, PPAs"><Num value={d.scope2m} onChange={set('scope2m')} invalid={tried && !!errs.scope2m} step={0.01} placeholder="Blank if not reported" label="Scope 2 market" /></Field>
              <Field label={d.useCats ? 'Scope 3 (sum of categories)' : 'Scope 3 (tCO₂e)'} error={tried && errs.scope3} hint={d.useCats ? 'Calculated from the categories below' : 'All reported categories'}>
                {d.useCats ? <input value={fmt(catSum, 2)} readOnly aria-label="Scope 3 total" /> : <Num value={d.scope3} onChange={set('scope3')} invalid={tried && !!errs.scope3} step={0.01} label="Scope 3" />}
              </Field>
            </div>

            <div className="divider" />
            <label className="row" style={{ cursor: 'pointer', marginBottom: 10 }}>
              <input type="checkbox" checked={d.useCats} onChange={(e) => setEdit({ ...edit, d: { ...d, useCats: e.target.checked } })} />
              <b>Break Scope 3 down by GHG Protocol category</b><span className="cell-sub">recommended for GRI 305-3, IFRS S2 and CDP</span>
            </label>
            {d.useCats && (<>
              <div className="cat-grid">
                {S3_CATEGORIES.map((c) => (
                  <label key={c.n} className={`cat-cell${Number(d.cats[c.n]) > 0 ? ' on' : ''}`}>
                    <span className="cat-n">{c.n}</span>
                    <span className="cat-name">{c.name}</span>
                    <input className="inp sm num" type="number" min={0} step={0.01} value={d.cats[c.n]} placeholder="—" aria-label={`Category ${c.n} ${c.name}`} onChange={(e) => setCat(c.n, e.target.value)} />
                    {c.n === 2 && lcaA13 != null && (
                      <button type="button" className="btn btn-ghost btn-sm cat-lca" title="Use the Building LCA A1–A3 result for capital goods acquired this year"
                        onClick={() => setCat(2, String(+(lcaA13 + (Number(d.cats[2]) || 0)).toFixed(2)))}>+ LCA A1–A3 ({fmt(lcaA13, 1)} t)</button>
                    )}
                  </label>
                ))}
              </div>
              {tried && errs.cats && <div className="hint" style={{ color: 'var(--err)', marginTop: 6 }}>{errs.cats}</div>}
              <div className="hint" style={{ marginTop: 8 }}>Leave categories blank if not relevant or not yet quantified, and explain exclusions in your report.</div>
            </>)}

            <div className="divider" />
            <div style={{ marginBottom: 10 }}><b>Intensity denominators</b> <span className="cell-sub">optional · Scope 1+2 intensity per m², per employee and per turnover</span></div>
            <div className="form-grid">
              <Field label="Floor area (m²)" error={tried && errs.area}><Num value={d.area} onChange={set('area')} invalid={tried && !!errs.area} label="Floor area" /></Field>
              <Field label="Employees (FTE)" error={tried && errs.fte}><Num value={d.fte} onChange={set('fte')} invalid={tried && !!errs.fte} label="Employees" /></Field>
              <Field label={`Turnover (${S.revenueUnit})`} error={tried && errs.revenue}><Num value={d.revenue} step={0.01} onChange={set('revenue')} invalid={tried && !!errs.revenue} label="Turnover" /></Field>
            </div>
            <button type="submit" hidden />
          </form>
        </Modal>
      )}
    </>
  );
};
export default InventoryTab;

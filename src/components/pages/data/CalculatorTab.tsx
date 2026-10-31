import React, { useState } from 'react';
import { useHub } from '../../../context/HubContext';
import { uid, fmt, activityT, rollupActivities } from '../../../utils/hub';
import type { EmissionFactor, Activity, GhgYear } from '../../../types/hub';
import Modal from '../../ui/Modal';
import Icon from '../../ui/Icon';
import EmptyState from '../../ui/EmptyState';
import { useToast } from '../../ui/Toast';
import { Field, Num, Section, n, okNum } from './fields';

type FD = { id: string; name: string; unit: string; kgPerUnit: string; scope: 1 | 2 | 3; s2basis: 'location' | 'market'; source: string };
type AD = { id: string; year: string; factorId: string; description: string; quantity: string };

const CalculatorTab: React.FC = () => {
  const { hub, dispatch } = useHub();
  const toast = useToast();
  const [f, setF] = useState<FD | null>(null);
  const [a, setA] = useState<AD | null>(null);
  const [tried, setTried] = useState(false);
  const fac = (id: string) => hub.factors.find((x) => x.id === id);

  const fErr = f ? { name: !f.name.trim() && 'Required', unit: !f.unit.trim() && 'e.g. kWh, litre, kg', kg: !okNum(f.kgPerUnit) && 'Required, ≥ 0', source: !f.source.trim() && 'Cite the source (publisher, dataset, year)' } : {};
  const aErr = a ? { year: !(Number.isInteger(n(a.year)) && n(a.year) >= 1990 && n(a.year) <= 2100) && 'Year 1990–2100', factor: !a.factorId && 'Pick a factor', qty: !okNum(a.quantity) && 'Required, ≥ 0' } : {};

  const saveF = () => {
    setTried(true);
    if (!f || Object.values(fErr).some(Boolean)) return;
    const item: EmissionFactor = { id: f.id, name: f.name.trim(), unit: f.unit.trim(), kgPerUnit: n(f.kgPerUnit), scope: f.scope, s2basis: f.scope === 2 ? f.s2basis : undefined, source: f.source.trim() };
    dispatch({ type: 'UPSERT_FACTOR', item }); toast(`Saved factor ${item.name}`); setF(null); setTried(false);
  };
  const saveA = () => {
    setTried(true);
    if (!a || Object.values(aErr).some(Boolean)) return;
    const item: Activity = { id: a.id, year: n(a.year), factorId: a.factorId, description: a.description.trim(), quantity: n(a.quantity) };
    dispatch({ type: 'UPSERT_ACTIVITY', item }); toast('Activity saved'); setA(null); setTried(false);
  };

  const roll = rollupActivities(hub.activities, hub.factors);
  const has = (yr: number, sc: 1 | 2 | 3, mk?: boolean) => hub.activities.some((x) => {
    const ff = fac(x.factorId); return x.year === yr && ff?.scope === sc && (sc !== 2 || (ff.s2basis === 'market') === !!mk);
  });
  const apply = (r: ReturnType<typeof rollupActivities>[number]) => {
    const cur = hub.ghg.find((g) => g.year === r.year);
    // Only overwrite scopes that this year's activities actually cover; keep the rest.
    const row: GhgYear = {
      year: r.year,
      scope1: has(r.year, 1) ? r.scope1 : cur?.scope1 ?? 0,
      scope2: has(r.year, 2) ? r.scope2 : cur?.scope2 ?? 0,
      scope2m: has(r.year, 2, true) ? r.scope2m : cur?.scope2m ?? null,
      scope3: has(r.year, 3) ? r.scope3 : cur?.scope3 ?? 0,
    };
    if (cur && !confirm(`Overwrite the covered scopes for ${r.year} in your inventory with the calculated values?`)) return;
    dispatch({ type: 'UPSERT_GHG', row }); toast(`Applied calculated totals to ${r.year}`);
  };

  return (
    <>
      <div className="notice info"><Icon name="info" size={16} />
        <span>No emission factors are built in. Add each one with its source (for example your national grid authority's latest CO₂ baseline, a government conversion-factor set, or supplier-specific data) so every number in the inventory can be traced.</span>
      </div>

      <Section title="Emission factor library" sub="kgCO₂e per activity unit"
        actions={<button className="btn btn-pri btn-sm" onClick={() => { setTried(false); setF({ id: uid(), name: '', unit: '', kgPerUnit: '', scope: 2, s2basis: 'location', source: '' }); }}><Icon name="plus" size={14} />Add factor</button>}>
        {hub.factors.length === 0 ? (
          <EmptyState compact icon={<Icon name="calc" size={22} />} title="No factors yet" body="Start with your biggest sources: grid electricity, diesel and natural gas, refrigerant top-ups, then purchased materials." />
        ) : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Factor</th><th>Scope</th><th className="num">kgCO₂e / unit</th><th>Source</th><th className="num">Used</th><th /></tr></thead>
            <tbody>{hub.factors.map((x) => {
              const used = hub.activities.filter((y) => y.factorId === x.id).length;
              return (
                <tr key={x.id}>
                  <td className="cell-main">{x.name}</td>
                  <td><span className="badge b-na">S{x.scope}{x.scope === 2 ? ` · ${x.s2basis}` : ''}</span></td>
                  <td className="num">{x.kgPerUnit.toLocaleString('en-US', { maximumFractionDigits: 6 })} <span className="cell-sub">/ {x.unit}</span></td>
                  <td className="cell-sub" style={{ maxWidth: 320 }}>{x.source}</td>
                  <td className="num">{used}</td>
                  <td><div className="row-actions">
                    <button className="icon-btn sm" aria-label={`Edit ${x.name}`} onClick={() => { setTried(false); setF({ ...x, kgPerUnit: String(x.kgPerUnit), s2basis: x.s2basis ?? 'location' }); }}><Icon name="edit" size={15} /></button>
                    <button className="icon-btn sm danger" aria-label={`Delete ${x.name}`} onClick={() => { if (confirm(used ? `Delete ${x.name} and its ${used} activit${used > 1 ? 'ies' : 'y'}?` : `Delete ${x.name}?`)) { dispatch({ type: 'DELETE_FACTOR', id: x.id }); toast('Factor deleted', 'info'); } }}><Icon name="trash" size={15} /></button>
                  </div></td>
                </tr>);
            })}</tbody>
          </table></div>
        )}
      </Section>

      <Section title="Activity data" sub="Quantity × factor ÷ 1000 = tCO₂e"
        actions={<button className="btn btn-pri btn-sm" disabled={!hub.factors.length} title={hub.factors.length ? '' : 'Add a factor first'}
          onClick={() => { setTried(false); setA({ id: uid(), year: String(hub.ghg[hub.ghg.length - 1]?.year ?? new Date().getFullYear() - 1), factorId: hub.factors[0]?.id ?? '', description: '', quantity: '' }); }}><Icon name="plus" size={14} />Add activity</button>}>
        {hub.activities.length === 0 ? (
          <EmptyState compact icon={<Icon name="layers" size={22} />} title="No activity data yet" body={hub.factors.length ? 'Enter metered or invoiced quantities, e.g. annual kWh per site, litres of diesel, kg of refrigerant.' : 'Add an emission factor above first.'} />
        ) : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Year</th><th>Activity</th><th>Factor</th><th className="num">Quantity</th><th className="num">tCO₂e</th><th /></tr></thead>
            <tbody>{[...hub.activities].sort((x, y) => y.year - x.year).map((x) => {
              const ff = fac(x.factorId);
              return (
                <tr key={x.id}>
                  <td>{x.year}</td><td className="cell-main">{x.description || <span className="muted">—</span>}</td>
                  <td><span className="cell-sub">{ff?.name} · S{ff?.scope}</span></td>
                  <td className="num">{fmt(x.quantity, 2)} <span className="cell-sub">{ff?.unit}</span></td>
                  <td className="num"><b>{fmt(activityT(x, ff), 2)}</b></td>
                  <td><div className="row-actions">
                    <button className="icon-btn sm" aria-label="Edit activity" onClick={() => { setTried(false); setA({ ...x, year: String(x.year), quantity: String(x.quantity) }); }}><Icon name="edit" size={15} /></button>
                    <button className="icon-btn sm danger" aria-label="Delete activity" onClick={() => { dispatch({ type: 'DELETE_ACTIVITY', id: x.id }); toast('Activity deleted', 'info'); }}><Icon name="trash" size={15} /></button>
                  </div></td>
                </tr>);
            })}</tbody>
          </table></div>
        )}
      </Section>

      {roll.length > 0 && (
        <Section title="Calculated totals by year" sub="Applying updates only the scopes that the year's activities cover; other scopes keep their current inventory values.">
          <div className="tbl-wrap"><table>
            <thead><tr><th>Year</th><th className="num">Scope 1</th><th className="num">Scope 2 loc.</th><th className="num">Scope 2 mkt.</th><th className="num">Scope 3</th><th className="num">Activities</th><th /></tr></thead>
            <tbody>{roll.map((r) => (
              <tr key={r.year}>
                <td className="cell-main">{r.year}{hub.ghg.some((g) => g.year === r.year) && <span className="badge b-na" style={{ marginLeft: 6 }}>in inventory</span>}</td>
                <td className="num">{has(r.year, 1) ? fmt(r.scope1, 1) : '—'}</td><td className="num">{has(r.year, 2) ? fmt(r.scope2, 1) : '—'}</td>
                <td className="num">{r.hasMarket ? fmt(r.scope2m, 1) : '—'}</td><td className="num">{has(r.year, 3) ? fmt(r.scope3, 1) : '—'}</td>
                <td className="num">{r.count}</td>
                <td style={{ textAlign: 'right' }}><button className="btn btn-out btn-sm" onClick={() => apply(r)}>Apply to inventory<Icon name="arrowR" size={14} /></button></td>
              </tr>))}
            </tbody>
          </table></div>
        </Section>
      )}

      {f && (
        <Modal title={hub.factors.some((x) => x.id === f.id) ? 'Edit factor' : 'Add emission factor'} onClose={() => setF(null)}
          footer={<><button className="btn btn-out" onClick={() => setF(null)}>Cancel</button><button className="btn btn-pri" onClick={saveF}><Icon name="save" size={15} />Save</button></>}>
          <form className="form-grid" onSubmit={(e) => { e.preventDefault(); saveF(); }}>
            <Field label="Name" className="span2" error={tried && fErr.name}><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Grid electricity – FY2024" /></Field>
            <Field label="Scope"><select value={f.scope} onChange={(e) => setF({ ...f, scope: Number(e.target.value) as 1 | 2 | 3 })}><option value={1}>Scope 1</option><option value={2}>Scope 2</option><option value={3}>Scope 3</option></select></Field>
            {f.scope === 2 && <Field label="Scope 2 basis"><select value={f.s2basis} onChange={(e) => setF({ ...f, s2basis: e.target.value as 'location' | 'market' })}><option value="location">Location-based</option><option value="market">Market-based</option></select></Field>}
            <Field label="Activity unit" error={tried && fErr.unit}><input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="kWh" /></Field>
            <Field label="kgCO₂e per unit" error={tried && fErr.kg}><Num value={f.kgPerUnit} step={0.0001} onChange={(v) => setF({ ...f, kgPerUnit: v })} invalid={tried && !!fErr.kg} /></Field>
            <Field label="Source" className="full" error={tried && fErr.source} hint="Publisher, dataset, version/year, and the page or table"><input value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} /></Field>
            <button type="submit" hidden />
          </form>
        </Modal>
      )}
      {a && (
        <Modal title={hub.activities.some((x) => x.id === a.id) ? 'Edit activity' : 'Add activity'} onClose={() => setA(null)}
          footer={<><button className="btn btn-out" onClick={() => setA(null)}>Cancel</button><button className="btn btn-pri" onClick={saveA}><Icon name="save" size={15} />Save</button></>}>
          <form className="form-grid" onSubmit={(e) => { e.preventDefault(); saveA(); }}>
            <Field label="Year" error={tried && aErr.year}><Num value={a.year} onChange={(v) => setA({ ...a, year: v })} invalid={tried && !!aErr.year} /></Field>
            <Field label="Factor" className="span2" error={tried && aErr.factor}><select value={a.factorId} onChange={(e) => setA({ ...a, factorId: e.target.value })}>
              {hub.factors.map((x) => <option key={x.id} value={x.id}>{x.name} (S{x.scope}, per {x.unit})</option>)}</select></Field>
            <Field label={`Quantity${fac(a.factorId) ? ` (${fac(a.factorId)!.unit})` : ''}`} error={tried && aErr.qty}
              hint={okNum(a.quantity) && fac(a.factorId) ? `= ${fmt((n(a.quantity) * fac(a.factorId)!.kgPerUnit) / 1000, 2)} tCO₂e` : undefined}>
              <Num value={a.quantity} step={0.01} onChange={(v) => setA({ ...a, quantity: v })} invalid={tried && !!aErr.qty} /></Field>
            <Field label="Description" className="full"><input value={a.description} onChange={(e) => setA({ ...a, description: e.target.value })} placeholder="e.g. Pune office – annual meter total" /></Field>
            <button type="submit" hidden />
          </form>
        </Modal>
      )}
    </>
  );
};
export default CalculatorTab;

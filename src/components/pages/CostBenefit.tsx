import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Cell, BarChart } from 'recharts';
import { useHub } from '../../context/HubContext';
import { evalPackage, defaultCba, fmtYears, inr, type CbaState, type CbaRow, type CbaCustom, type MeasureResult } from '../../utils/cba';
import { CBA_MEASURES, CBA_SOURCES, CBA_CATEGORIES, COOLING_PRESETS, TARIFF_PRESETS, USE_LABEL, EFLH, LIGHT_HOURS, BASIS_SOURCES, sourceById,
  type CbaBasis, type CbaCategory, type CbaTier, type BuildingUse } from '../../data/cba';
import type { MaccBar } from '../../utils/hub';
import { uid } from '../../utils/hub';
import { canPrint } from '../../utils/platform';
import Kpi from '../ui/Kpi';
import Macc from '../ui/Macc';
import Icon from '../ui/Icon';
import Modal from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { Field } from './data/fields';

const TIER: Record<CbaTier, { label: string; cls: string; tip: string }> = {
  official: { label: 'Official', cls: 'b-pass', tip: 'Government / regulator document' },
  research: { label: 'Research', cls: 'b-info', tip: 'Peer-reviewed or national-lab study' },
  market: { label: 'Market', cls: 'b-pri', tip: 'Published Indian market prices; replace with quotes' },
  estimate: { label: 'Estimate', cls: 'b-warn', tip: 'Engineering assumption; replace with project data' },
};
const TICK = { fontSize: 11, fill: 'var(--muted)' };
const n0 = (v: number) => Math.round(v).toLocaleString('en-IN');
const pct = (v: number | null) => (v == null ? '—' : v === Infinity ? '> 999%' : `${(v * 100).toFixed(1)}%`);

/** Number box that keeps a draft string so typing "1." or clearing does not jump; commits valid numbers only. */
const NumIn: React.FC<{ value: number; onChange: (v: number) => void; step?: number; min?: number; label: string; width?: number }> = ({ value, onChange, step = 1, min, label, width }) => {
  const [d, setD] = useState(String(value));
  useEffect(() => { if (Number(d) !== value) setD(String(value)); }, [value]);  // eslint-disable-line react-hooks/exhaustive-deps
  const bad = d.trim() === '' || !Number.isFinite(Number(d)) || (min != null && Number(d) < min);
  return <input type="number" inputMode="decimal" step={step} aria-label={label} value={d} className={bad ? 'invalid' : ''} style={width ? { width } : undefined}
    onChange={(e) => { setD(e.target.value); const v = Number(e.target.value); if (e.target.value.trim() !== '' && Number.isFinite(v) && (min == null || v >= min)) onChange(v); }} />;
};

const SrcBadge: React.FC<{ id?: string }> = ({ id }) => {
  const s = id ? sourceById(id) : undefined; if (!s) return null;
  return <span className={`badge ${TIER[s.tier].cls}`} title={`${TIER[s.tier].tip} · ${s.publisher}, ${s.date}`} style={{ marginLeft: 6, fontSize: '.66rem' }}>{TIER[s.tier].label}</span>;
};

const CostBenefit: React.FC = () => {
  const { hub, dispatch } = useHub();
  const toast = useToast();
  const cba: CbaState = hub.cba ?? defaultCba();
  const b = cba.basis;
  const save = (next: CbaState) => dispatch({ type: 'SET_CBA', cba: next });
  const setB = (patch: Partial<CbaBasis>) => save({ ...cba, basis: { ...b, ...patch } });
  const setRow = (id: string, patch: Partial<CbaRow>) => save({ ...cba, rows: { ...cba.rows, [id]: { ...{ on: false, v: {} }, ...cba.rows[id], ...patch } } });
  const [open, setOpen] = useState<string | null>(null);
  const [cat, setCat] = useState<CbaCategory | 'All'>('All');
  const [custom, setCustom] = useState<CbaCustom | null>(null);
  const [showSrc, setShowSrc] = useState(false);

  const { rows, pkg } = useMemo(() => evalPackage(cba), [cba]);
  const sel = (id: string) => (cba.rows[id]?.on ?? cba.custom.find((c) => c.id === id)?.on) ?? false;
  const shown = rows.filter((r) => cat === 'All' || r.cat === cat);

  const cum = useMemo(() => {
    if (!pkg) return [];
    let c = 0, cd = 0; const r = b.discount / 100;
    return pkg.flows.map((f, t) => { c += f; cd += f / (1 + r) ** t; return { year: t, flow: Math.round(f), cum: Math.round(c), disc: Math.round(cd) }; });
  }, [pkg, b.discount]);
  const paybackBars = rows.filter((r) => sel(r.id) && r.capex > 0 && Number.isFinite(r.simple)).sort((a, c) => a.simple - c.simple)
    .map((r) => ({ name: r.name.length > 34 ? r.name.slice(0, 33) + '…' : r.name, simple: +r.simple.toFixed(1), disc: Number.isFinite(r.discounted) ? +r.discounted.toFixed(1) : null }));
  const macc: MaccBar[] = (() => {
    let x = 0;
    return rows.filter((r) => sel(r.id) && r.costPerT != null && r.co2Life > 0).sort((a, c) => (a.costPerT as number) - (c.costPerT as number))
      .map((r) => { const w = r.co2Life / Math.max(1, b.years); const bar = { id: r.id, name: r.name, x0: x, x1: x + w, cost: Math.round(r.costPerT as number), scope: r.embodiedT > 0 && !r.kwh ? 3 : 2, status: 'Identified' }; x += w; return bar; });
  })();

  const toStrategy = () => {
    const picked = rows.filter((r) => sel(r.id) && r.co2Yr > 0);
    let added = 0;
    for (const r of picked) {
      const id = `cba-${r.id}`;
      dispatch({ type: 'UPSERT_LEVER', item: { id, measureId: id, name: r.name, scope: 2, abatement: Math.round(r.co2Yr * 10) / 10, status: 'Identified', costPerT: r.costPerT != null ? Math.round(r.costPerT) : undefined } });
      added++;
    }
    toast(added ? `${added} measures added to the decarbonisation levers (Scope 2, with ₹/tCO₂e for the MACC)` : 'Select measures that save electricity first', added ? 'ok' : 'info');
  };
  const copyTable = async () => {
    const hdr = ['Measure', 'Category', 'Capex ₹', 'Year-1 saving ₹', 'kWh/yr', 'kL/yr', 'Simple payback (yr)', 'Discounted payback (yr)', 'NPV ₹', 'IRR', 'tCO2e/yr', '₹/tCO2e'];
    const lines = rows.filter((r) => sel(r.id)).map((r) => [r.name, r.cat, Math.round(r.capex), Math.round(r.yr1), Math.round(r.kwh), Math.round(r.kl), Number.isFinite(r.simple) ? r.simple.toFixed(1) : '', Number.isFinite(r.discounted) ? r.discounted.toFixed(1) : '', Math.round(r.npv), r.irr == null ? '' : r.irr === Infinity ? '>999%' : (r.irr * 100).toFixed(1) + '%', r.co2Yr.toFixed(1), r.costPerT == null ? '' : Math.round(r.costPerT)].join('\t'));
    if (pkg) lines.push([pkg.name, 'Package (with interactions)', Math.round(pkg.capex), Math.round(pkg.yr1), Math.round(pkg.kwh), Math.round(pkg.kl), Number.isFinite(pkg.simple) ? pkg.simple.toFixed(1) : '', Number.isFinite(pkg.discounted) ? pkg.discounted.toFixed(1) : '', Math.round(pkg.npv), pkg.irr == null ? '' : pkg.irr === Infinity ? '>999%' : (pkg.irr * 100).toFixed(1) + '%', pkg.co2Yr.toFixed(1), pkg.costPerT == null ? '' : Math.round(pkg.costPerT)].join('\t'));
    try { await navigator.clipboard.writeText([hdr.join('\t'), ...lines].join('\n')); toast('Table copied, ready to paste into Excel or Word'); } catch { toast('Copy blocked by the browser', 'err'); }
  };
  const exportXlsx = async () => {
    try { const { exportCbaWorkbook } = await import('../../utils/cbaXlsx'); if (await exportCbaWorkbook(cba, hub.settings.orgName)) toast('Cost–benefit workbook ready'); }
    catch (e) { toast(`Export failed: ${(e as Error).message}`, 'err'); }
  };

  const inp = (label: string, key: keyof CbaBasis, unit: string, step = 1, hint?: string) => (
    <Field label={<>{label}{unit ? ` (${unit})` : ''}<SrcBadge id={BASIS_SOURCES[key]} /></>} hint={hint}>
      <NumIn label={label} value={b[key] as number} step={step} min={0} onChange={(v) => setB({ [key]: v } as Partial<CbaBasis>)} />
    </Field>
  );
  const tariff = TARIFF_PRESETS.find((t) => t.id === b.tariffPreset);

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Carbon & portfolio</div>
          <div className="ph-title">Cost–benefit analysis</div>
          <div className="ph-sub">Capex, savings, payback, NPV and IRR for green building measures, priced for India. Every default shows its source; replace market and estimate values with your quotes and energy-model results.</div>
        </div>
        <div className="ph-actions">
          {canPrint && <button className="btn btn-out" onClick={() => window.print()}><Icon name="file" size={16} />Print / PDF</button>}
          <button className="btn btn-out" onClick={copyTable}><Icon name="copy" size={16} />Copy table</button>
          <button className="btn btn-out" onClick={exportXlsx}><Icon name="sheet" size={16} />Export Excel</button>
          <button className="btn btn-pri" onClick={toStrategy}><Icon name="target" size={16} />Add to strategy</button>
        </div>
      </div>

      <div className="notice">
        <Icon name="info" size={16} />
        <span className="grow">
          Badges show where each number comes from: <span className="badge b-pass">Official</span> tariff orders and BEE/CEA/MNRE documents,{' '}
          <span className="badge b-info">Research</span> studies, <span className="badge b-pri">Market</span> published Indian prices (wide ranges) and{' '}
          <span className="badge b-warn">Estimate</span> engineering assumptions. For a client report, enter quotes and your DesignBuilder savings.{' '}
          <button className="btn-link" onClick={() => setShowSrc(true)}>See all {CBA_SOURCES.length} sources</button>
        </span>
      </div>

      {pkg && (
        <div className="kpi-grid">
          <Kpi i={0} icon="calc" label="Package capex" value={inr(pkg.capex)} foot={`${pkg.count} measures · ${b.capexCase} cost case`} />
          <Kpi i={1} icon="zap" tone="acc" label="Year-1 saving" value={inr(pkg.yr1)} foot={`${n0(pkg.kwh)} kWh · ${n0(pkg.kl)} kL`} />
          <Kpi i={2} icon="trendDown" tone="s2" label="Simple payback" value={fmtYears(pkg.simple)} foot={`Discounted: ${fmtYears(pkg.discounted)}`} />
          <Kpi i={3} icon="pie" tone={pkg.npv >= 0 ? 'acc' : 'err'} label={`NPV @ ${b.discount}%`} value={inr(pkg.npv)} foot={`IRR ${pct(pkg.irr)} · SIR ${Number.isFinite(pkg.sir) ? pkg.sir.toFixed(2) : '—'}`} />
          <Kpi i={4} icon="leaf" tone="s1" label="CO₂e avoided" value={n0(pkg.co2Yr)} unit="t/yr" foot={`${n0(pkg.co2Life)} t over ${b.years} yr${pkg.embodiedT ? ` incl. ${n0(pkg.embodiedT)} t embodied` : ''}`} />
        </div>
      )}
      {pkg && pkg.interactionKwh < -1 && (
        <div className="notice info"><Icon name="check" size={16} /><span className="grow">
          Interactions counted: the measures add up to {n0(pkg.sumKwh)} kWh/yr on their own, but the cooling plant serves a smaller load once envelope and lighting measures are in, so the package saves {n0(pkg.kwh)} kWh/yr ({n0(-pkg.interactionKwh)} kWh/yr less).
        </span></div>
      )}

      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))', gap: 16, marginBottom: 16 }}>
        <section className="card rise">
          <div className="card-hd"><div><div className="t">Project basis</div><div className="s">From the energy model baseline or bills. Defaults are for a 10,000 m² office.</div></div></div>
          <div className="form-grid">
            <Field label="Project"><input value={b.name} onChange={(e) => setB({ name: e.target.value })} /></Field>
            <Field label="Building use">
              <select value={b.use} onChange={(e) => { const u = e.target.value as BuildingUse; setB({ use: u, eflh: EFLH[u], lightHours: LIGHT_HOURS[u] }); }}>
                {(Object.keys(USE_LABEL) as BuildingUse[]).map((u) => <option key={u} value={u}>{USE_LABEL[u]}</option>)}
              </select>
            </Field>
            {inp('Gross floor area', 'gfa', 'm²')}
            {inp('Baseline electricity', 'annualKwh', 'kWh/yr', 1000, `${n0(b.annualKwh / Math.max(1, b.gfa))} kWh/m²·yr. Use the model baseline or 12 months of bills.`)}
            {inp('Cooling capacity', 'coolingTR', 'TR', 1, `${(b.gfa / Math.max(1, b.coolingTR)).toFixed(0)} m²/TR`)}
            <Field label="Baseline cooling system">
              <select value={b.coolingPreset} onChange={(e) => { const p = COOLING_PRESETS.find((x) => x.id === e.target.value); setB({ coolingPreset: e.target.value, ...(p ? { baseKwhTRh: p.kwhTRh } : {}) }); }}>
                {COOLING_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label} · {p.kwhTRh} kWh/TRh</option>)}
                <option value="custom">Custom</option>
              </select>
            </Field>
            {inp('Baseline system efficiency', 'baseKwhTRh', 'kWh/TRh', 0.01)}
            {inp('Equivalent full-load hours', 'eflh', 'h/yr', 50)}
            {inp('Lighting hours', 'lightHours', 'h/yr', 50)}
            {inp('Occupants', 'occupants', 'people')}
            {inp('Working days', 'workDays', 'days/yr')}
            {inp('Roof area', 'roofArea', 'm²')}
          </div>
        </section>

        <section className="card rise">
          <div className="card-hd"><div><div className="t">Tariff and finance</div><div className="s">MERC FY 2026-27 presets; choose Custom for other states.</div></div></div>
          <div className="form-grid">
            <Field label={<>Electricity tariff<SrcBadge id={tariff?.source} /></>} hint={tariff?.note} className="span2">
              <select value={b.tariffPreset} onChange={(e) => { const t = TARIFF_PRESETS.find((x) => x.id === e.target.value)!; setB({ tariffPreset: t.id, ...(t.id !== 'custom' ? { energyRate: t.energy, demandRate: t.demand } : {}) }); }}>
                {TARIFF_PRESETS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            {inp('Energy + wheeling', 'energyRate', '₹/kWh', 0.01)}
            {inp('Demand charge', 'demandRate', '₹/kVA·month')}
            {inp('Electricity duty / tax', 'dutyPct', '%', 0.5, 'Add state electricity duty if not in the rate')}
            {inp('Tariff escalation', 'escalation', '%/yr', 0.5, 'MERC path FY27→FY30 for HT commercial is about −1%/yr; long-run escalation is your assumption')}
            {inp('Water cost', 'waterRate', '₹/kL', 1, 'Municipal non-domestic or tanker rate')}
            {inp('Water escalation', 'waterEsc', '%/yr', 0.5)}
            {inp('Discount rate (nominal)', 'discount', '%', 0.5, 'Your cost of capital; RBI repo 5.25% (Jun 2026)')}
            {inp('O&M inflation', 'cpi', '%/yr', 0.1)}
            {inp('Analysis period', 'years', 'years')}
            {inp('Grid emission factor', 'gridEF', 'tCO₂/MWh', 0.001, 'CEA v22.0, FY 2025-26')}
            {inp('Grid decarbonisation', 'gridDecline', '%/yr', 0.5)}
            {inp('Internal carbon price', 'carbonPrice', '₹/tCO₂e', 100, 'Optional, adds value to each tonne avoided')}
            <Field label="Capex case">
              <div className="seg">{(['low', 'typical', 'high'] as const).map((c) => <button key={c} className={b.capexCase === c ? 'on' : ''} onClick={() => setB({ capexCase: c })}>{c[0].toUpperCase() + c.slice(1)}</button>)}</div>
            </Field>
          </div>
        </section>
      </div>

      <section className="card rise" style={{ marginBottom: 16 }}>
        <div className="card-hd">
          <div><div className="t">Measures</div><div className="s">Tick to include. Open a row to edit quantities, override capex with a quote, or enter the kWh saving from your energy model.</div></div>
          <div className="r"><button className="btn btn-out btn-sm" onClick={() => setCustom({ id: uid(), name: '', cat: 'Envelope', capex: 0, kwh: 0, kl: 0, om: 0, life: 15, on: true })}><Icon name="plus" size={14} />Custom measure</button></div>
        </div>
        <div className="tabs" style={{ marginBottom: 8 }}>
          {(['All', ...CBA_CATEGORIES] as const).map((c) => <button key={c} className={`tab${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>{c}<span className="count">{rows.filter((r) => (c === 'All' || r.cat === c) && sel(r.id)).length}</span></button>)}
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th></th><th>Measure</th><th style={{ textAlign: 'right' }}>Capex</th><th style={{ textAlign: 'right' }}>Saving yr 1</th><th style={{ textAlign: 'right' }}>kWh/yr</th><th style={{ textAlign: 'right' }}>Payback</th><th style={{ textAlign: 'right' }}>NPV</th><th style={{ textAlign: 'right' }}>IRR</th><th style={{ textAlign: 'right' }}>tCO₂e/yr</th><th style={{ textAlign: 'right' }}>₹/tCO₂e</th></tr></thead>
            <tbody>
              {shown.map((r) => <MeasureRow key={r.id} r={r} on={sel(r.id)} open={open === r.id} cba={cba} onToggle={(v) => (r.custom ? save({ ...cba, custom: cba.custom.map((c) => (c.id === r.id ? { ...c, on: v } : c)) }) : setRow(r.id, { on: v }))}
                onOpen={() => setOpen(open === r.id ? null : r.id)} setRow={setRow} onEditCustom={() => setCustom(cba.custom.find((c) => c.id === r.id) ?? null)} />)}
              {pkg && cat === 'All' && (
                <tr style={{ fontWeight: 700, background: 'var(--surf-2)' }}>
                  <td></td><td>{pkg.name}<div className="cell-sub" style={{ fontWeight: 400 }}>With cooling interactions</div></td>
                  <td className="mono" style={{ textAlign: 'right' }}>{inr(pkg.capex)}</td><td className="mono" style={{ textAlign: 'right' }}>{inr(pkg.yr1)}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{n0(pkg.kwh)}</td><td className="mono" style={{ textAlign: 'right' }}>{fmtYears(pkg.simple)}</td>
                  <td className="mono" style={{ textAlign: 'right', color: pkg.npv >= 0 ? 'var(--acc)' : 'var(--err)' }}>{inr(pkg.npv)}</td><td className="mono" style={{ textAlign: 'right' }}>{pct(pkg.irr)}</td>
                  <td className="mono" style={{ textAlign: 'right' }}>{pkg.co2Yr.toFixed(1)}</td><td className="mono" style={{ textAlign: 'right' }}>{pkg.costPerT == null ? '—' : n0(pkg.costPerT)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {pkg && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))', gap: 16, marginBottom: 16 }}>
          <section className="card rise">
            <div className="card-hd"><div><div className="t">Package cash flow</div><div className="s">Net yearly cash flow (bars) and cumulative position, simple and discounted at {b.discount}%</div></div></div>
            <div style={{ height: 280 }}>
              <ResponsiveContainer>
                <ComposedChart data={cum} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="year" tick={TICK} tickLine={false} axisLine={false} />
                  <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={(v) => inr(v).replace('₹', '')} width={64} />
                  <Tooltip formatter={(v: number, nm: string) => [inr(v), nm]} labelFormatter={(l) => `Year ${l}`} contentStyle={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="var(--border-strong)" />
                  <Bar dataKey="flow" name="Net cash flow" radius={[3, 3, 0, 0]}>{cum.map((d, i) => <Cell key={i} fill={d.flow >= 0 ? 'var(--acc)' : 'var(--err)'} fillOpacity={0.55} />)}</Bar>
                  <Line dataKey="cum" name="Cumulative" stroke="var(--pri)" strokeWidth={2.2} dot={false} />
                  <Line dataKey="disc" name="Cumulative (discounted)" stroke="var(--s2)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="card rise">
            <div className="card-hd"><div><div className="t">Payback by measure</div><div className="s">Simple and discounted, years</div></div></div>
            <div style={{ height: Math.max(220, paybackBars.length * 30 + 40) }}>
              <ResponsiveContainer>
                <BarChart data={paybackBars} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ ...TICK, fontSize: 10 }} width={typeof window !== 'undefined' && window.innerWidth < 600 ? 110 : 190} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: number, nm: string) => [`${v} yr`, nm]} contentStyle={{ background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="simple" name="Simple" fill="var(--pri)" radius={[0, 3, 3, 0]} barSize={9} />
                  <Bar dataKey="disc" name="Discounted" fill="var(--s2)" radius={[0, 3, 3, 0]} barSize={9} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
      {macc.length > 0 && (
        <section className="card rise" style={{ marginBottom: 16 }}>
          <div className="card-hd"><div><div className="t">Marginal abatement cost curve</div><div className="s">Width: average tCO₂e/yr over {b.years} years (embodied savings spread over the period). Height: −NPV per tonne. Below zero saves money.</div></div></div>
          <Macc bars={macc} currency="₹" />
        </section>
      )}

      <section className="card rise">
        <div className="card-hd"><div><div className="t">Method</div></div></div>
        <ul className="method" style={{ margin: 0, paddingLeft: 18, fontSize: '.84rem', lineHeight: 1.6 }}>
          <li><b>Savings.</b> Electricity at the energy + wheeling rate (plus duty), contract demand at the demand charge × 12, water at the water rate. Tariffs escalate yearly; O&M rises with inflation.</li>
          <li><b>Cooling.</b> Annual cooling = TR × equivalent full-load hours (BEE/GIZ 2025: 2,500 h daytime, 5,000 h 24-hour). Load cuts are priced at the baseline plant efficiency; in the package the best selected plant serves only the load left, so savings are not double-counted.</li>
          <li><b>Finance.</b> Year-0 capex; like-for-like replacement when a measure's life ends inside the period; straight-line residual value at the end. NPV at your discount rate, IRR by bisection, discounted payback interpolated within the year, SIR = PV of savings ÷ capex.</li>
          <li><b>Carbon.</b> Electricity × CEA grid factor, declining by the grid decarbonisation rate. Material measures add a one-time embodied saving. ₹/tCO₂e = −NPV ÷ lifetime tonnes (negative = net saving).</li>
          <li><b>Energy model.</b> When a measure's kWh comes from DesignBuilder, enter it in the row. That value is used as-is, including its interactions.</li>
        </ul>
      </section>

      {custom && (
        <Modal title={cba.custom.some((c) => c.id === custom.id) ? 'Edit custom measure' : 'Custom measure'} onClose={() => setCustom(null)}
          footer={<>
            {cba.custom.some((c) => c.id === custom.id) && <button className="btn btn-danger-out" onClick={() => { save({ ...cba, custom: cba.custom.filter((c) => c.id !== custom.id) }); setCustom(null); }}><Icon name="trash" size={14} />Delete</button>}
            <span className="grow" />
            <button className="btn btn-out" onClick={() => setCustom(null)}>Cancel</button>
            <button className="btn btn-pri" disabled={!custom.name.trim()} onClick={() => { const list = cba.custom.some((c) => c.id === custom.id) ? cba.custom.map((c) => (c.id === custom.id ? custom : c)) : [...cba.custom, custom]; save({ ...cba, custom: list }); setCustom(null); toast('Measure saved'); }}><Icon name="save" size={15} />Save</button>
          </>}>
          <div className="hint" style={{ marginBottom: 10 }}>For a measure from your energy model or a quote: enter the simulated kWh saving and the incremental capex.</div>
          <div className="form-grid">
            <Field label="Measure" className="span2"><input value={custom.name} placeholder="e.g. External shading fins, DesignBuilder run 7" onChange={(e) => setCustom({ ...custom, name: e.target.value })} /></Field>
            <Field label="Category"><select value={custom.cat} onChange={(e) => setCustom({ ...custom, cat: e.target.value as CbaCategory })}>{CBA_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Capex (₹, incremental)"><NumIn label="Capex" value={custom.capex} onChange={(v) => setCustom({ ...custom, capex: v })} /></Field>
            <Field label="Electricity saved (kWh/yr)"><NumIn label="kWh" value={custom.kwh} onChange={(v) => setCustom({ ...custom, kwh: v })} /></Field>
            <Field label="Water saved (kL/yr)"><NumIn label="kL" value={custom.kl} onChange={(v) => setCustom({ ...custom, kl: v })} /></Field>
            <Field label="Extra O&M (₹/yr)"><NumIn label="O&M" value={custom.om} onChange={(v) => setCustom({ ...custom, om: v })} /></Field>
            <Field label="Life (years)"><NumIn label="Life" value={custom.life} min={1} onChange={(v) => setCustom({ ...custom, life: v })} /></Field>
            <Field label="Basis / note" className="span2"><input value={custom.note ?? ''} placeholder="e.g. Baseline 1,512 MWh vs proposed 1,452 MWh; quote from vendor X" onChange={(e) => setCustom({ ...custom, note: e.target.value })} /></Field>
          </div>
        </Modal>
      )}

      {showSrc && (
        <Modal wide title={`Sources (${CBA_SOURCES.length})`} onClose={() => setShowSrc(false)} footer={<button className="btn btn-pri" onClick={() => setShowSrc(false)}>Close</button>}>
          <div className="tbl-wrap"><table>
            <thead><tr><th>Tier</th><th>Source</th><th>What is used</th></tr></thead>
            <tbody>{CBA_SOURCES.map((s) => (
              <tr key={s.id}><td><span className={`badge ${TIER[s.tier].cls}`}>{TIER[s.tier].label}</span></td>
                <td><div className="cell-main">{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}</div><div className="cell-sub">{s.publisher} · {s.date}</div></td>
                <td style={{ fontSize: '.8rem' }}>{s.note}</td></tr>))}</tbody>
          </table></div>
        </Modal>
      )}
    </div>
  );
};

/* ── one measure row with its editor ── */
const MeasureRow: React.FC<{ r: MeasureResult; on: boolean; open: boolean; cba: CbaState; onToggle: (v: boolean) => void; onOpen: () => void;
  setRow: (id: string, p: Partial<CbaRow>) => void; onEditCustom: () => void }> = ({ r, on, open, cba, onToggle, onOpen, setRow, onEditCustom }) => {
  const m = CBA_MEASURES.find((x) => x.id === r.id);
  const row = cba.rows[r.id];
  const b = cba.basis;
  const empty = r.capex === 0 && r.kwh === 0 && r.kl === 0 && !r.embodiedT;
  const num = (v: React.ReactNode) => <td className="mono" style={{ textAlign: 'right', opacity: on ? 1 : 0.55 }}>{v}</td>;
  return (
    <>
      <tr style={{ cursor: 'pointer' }} onClick={() => (r.custom ? onEditCustom() : onOpen())}>
        <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={on} aria-label={`Include ${r.name}`} onChange={(e) => onToggle(e.target.checked)} /></td>
        <td style={{ opacity: on ? 1 : 0.65 }}>
          <div className="cell-main">{r.name}{r.overridden && <span className="badge b-info" style={{ marginLeft: 6 }}>Model kWh</span>}{r.custom && <span className="badge b-na" style={{ marginLeft: 6 }}>Custom</span>}</div>
          <div className="cell-sub">{r.cat}{m ? ` · ${m.credits}` : ''}</div>
        </td>
        {empty ? <td colSpan={8} className="muted" style={{ fontSize: '.8rem' }}>Enter a quantity (open the row) to price this measure</td> : <>
        {num(inr(r.capex))}{num(inr(r.yr1))}{num(n0(r.kwh))}
        {num(fmtYears(r.simple))}
        <td className="mono" style={{ textAlign: 'right', color: r.npv >= 0 ? 'var(--acc)' : 'var(--err)', opacity: on ? 1 : 0.55 }}>{inr(r.npv)}</td>
        {num(pct(r.irr))}{num(((r.co2Yr || 0).toFixed(1) + (r.embodiedT ? ` + ${n0(r.embodiedT)} once` : '')))}
        {num((r.costPerT == null ? '—' : n0(r.costPerT)))}</>}
      </tr>
      {open && m && (
        <tr><td colSpan={10} style={{ background: 'var(--surf-2)' }}>
          <div style={{ padding: '6px 4px' }}>
            <div className="hint" style={{ marginBottom: 8 }}>{m.what}</div>
            <div className="form-grid">
              {m.inputs.map((i) => (
                <Field key={i.key} label={<>{i.label}{i.unit ? ` (${i.unit})` : ''}<SrcBadge id={i.src} /></>}>
                  <NumIn label={i.label} step={i.step ?? 1} value={row?.v?.[i.key] ?? +i.def(b).toFixed(3)} onChange={(v) => setRow(m.id, { v: { ...row?.v, [i.key]: v } })} />
                </Field>
              ))}
              <Field label={<>Capex override (₹){m.cost.src.map((s) => <SrcBadge key={s} id={s} />)}</>} hint={`Default ${b.capexCase}: ₹${n0(m.cost[b.capexCase])} ${m.cost.per} (low ${n0(m.cost.low)} · high ${n0(m.cost.high)}); ${m.cost.basis}`}>
                <input type="number" placeholder={String(Math.round(r.capex))} value={row?.capex ?? ''} aria-label="Capex override"
                  onChange={(e) => setRow(m.id, { capex: e.target.value.trim() === '' ? undefined : Number(e.target.value) })} />
              </Field>
              <Field label="Energy model saving (kWh/yr)" hint="From DesignBuilder: baseline − proposed for this measure. Overrides the formula.">
                <input type="number" placeholder={String(Math.round(r.kwh))} value={row?.kwh ?? ''} aria-label="Simulated kWh"
                  onChange={(e) => setRow(m.id, { kwh: e.target.value.trim() === '' ? undefined : Number(e.target.value) })} />
              </Field>
              <Field label="Life (years)" hint={`Default ${m.life}`}>
                <input type="number" placeholder={String(m.life)} value={row?.life ?? ''} aria-label="Life" onChange={(e) => setRow(m.id, { life: e.target.value.trim() === '' ? undefined : Math.max(1, Number(e.target.value)) })} />
              </Field>
            </div>
            <div style={{ marginTop: 10, fontSize: '.8rem' }}>
              <b>Calculation</b>
              <ol style={{ margin: '4px 0 0', paddingLeft: 18 }}>{r.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              <div className="muted" style={{ marginTop: 6 }}>
                Discounted payback {fmtYears(r.discounted)} · SIR {Number.isFinite(r.sir) ? r.sir.toFixed(2) : '—'} · {n0(r.kl)} kL/yr water · {n0(r.kva)} kVA ·{' '}
                Sources: {m.src.map((s) => sourceById(s)?.publisher).filter(Boolean).join('; ')}
              </div>
            </div>
          </div>
        </td></tr>
      )}
    </>
  );
};

export default CostBenefit;

import React, { useMemo, useState } from 'react';
import { canPrint } from '../../utils/platform';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { useHub } from '../../context/HubContext';
import { useLCA } from '../../context/LCAContext';
import { fmt, uid } from '../../utils/hub';
import { trajectory, scopeGaps, hotspots, phaseOf, type Phase } from '../../utils/strategy';
import { MEASURES, SOURCE_LABEL, type Measure, type SourceKey } from '../../data/measures';
import { LEVER_STATUSES, type LeverStatus } from '../../types/hub';
import Icon from '../ui/Icon';
import EmptyState from '../ui/EmptyState';
import Modal from '../ui/Modal';
import ChartTip from '../ui/ChartTip';
import { useToast } from '../ui/Toast';
import { Field, Num, n, okNum } from './data/fields';
import { STATUS_COL } from './CommandCenter';

const TICK = { fontSize: 11, fill: 'var(--muted)' };
const kfmt = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(Math.round(v)));
const PHASES: { id: Phase; label: string; sub: (y: number) => string }[] = [
  { id: 'Now', label: 'Now', sub: (y) => `to ${y + 2}` }, { id: 'Next', label: 'Next', sub: (y) => `${y + 3}–${y + 5}` },
  { id: 'Later', label: 'Later', sub: (y) => `after ${y + 5}` }, { id: 'Unscheduled', label: 'Unscheduled', sub: () => 'no delivery year' },
];

const Strategy: React.FC = () => {
  const { hub, dispatch } = useHub();
  const { dispatch: nav } = useLCA();
  const toast = useToast();
  const S = hub.settings;
  const [focus, setFocus] = useState<SourceKey | null>(null);
  const [add, setAdd] = useState<{ m: Measure; abatement: string; year: string; cost: string; status: LeverStatus } | null>(null);
  const [tried, setTried] = useState(false);

  const traj = useMemo(() => trajectory(hub.ghg, S), [hub.ghg, S]);
  const gaps = useMemo(() => scopeGaps(hub.ghg, hub.levers, S), [hub.ghg, hub.levers, S]);
  const hot = useMemo(() => hotspots(hub.ghg, hub.factors, hub.activities, S), [hub.ghg, hub.factors, hub.activities, S]);
  const set = (k: Partial<typeof S>) => dispatch({ type: 'SET_SETTINGS', settings: k });

  if (!hub.ghg.length) {
    return (
      <div>
        <div className="ph"><div><div className="ph-eyebrow">Carbon & portfolio</div><div className="ph-title">Decarbonisation Strategy</div>
          <div className="ph-sub">Targets, hotspots, measures and a phased roadmap to net zero, built from your own inventory.</div></div></div>
        <div className="card"><EmptyState icon={<Icon name="target" size={30} />} title="A strategy needs a footprint first"
          body="Calculate at least one year of Scope 1, 2 and 3 emissions. The strategy then sets targets from your base year, finds the hotspots and suggests measures for each.">
          <button className="btn btn-pri btn-lg" onClick={() => nav({ type: 'SET_PAGE', page: 'calculator' })}><Icon name="calc" size={16} />Open Carbon Calculator</button>
          <button className="btn btn-out btn-lg" onClick={() => dispatch({ type: 'LOAD_SAMPLE' })}>See it with sample data</button>
        </EmptyState></div>
      </div>
    );
  }

  const base = hub.ghg[0], latest = hub.ghg[hub.ghg.length - 1];
  const fk = focus ?? hot[0]?.key ?? 'general';
  const measuresFor = (k: SourceKey) => MEASURES.filter((m) => m.applies.includes(k));
  const inPlan = (id: string) => hub.levers.some((l) => l.measureId === id);
  const phased = PHASES.map((p) => ({ ...p, levers: hub.levers.filter((l) => l.status !== 'Implemented' && phaseOf(l, latest.year) === p.id).sort((a, b) => b.abatement - a.abatement) }));
  const residual = gaps.reduce((a, g) => a + g.residual, 0);
  const g12 = gaps[0], g3 = gaps[1];

  const addErr = add ? { ab: !okNum(add.abatement) && 'Required, ≥ 0', year: add.year !== '' && !(Number.isInteger(n(add.year)) && n(add.year) >= latest.year && n(add.year) <= 2100) && `Year ${latest.year}–2100 or blank`, cost: add.cost !== '' && !Number.isFinite(n(add.cost)) && 'Number or blank' } : {};
  const saveAdd = () => {
    setTried(true);
    if (!add || Object.values(addErr).some(Boolean)) return;
    dispatch({ type: 'UPSERT_LEVER', item: { id: uid(), name: add.m.title, scope: add.m.scope, abatement: n(add.abatement), status: add.status,
      year: add.year === '' ? undefined : n(add.year), costPerT: add.cost === '' ? undefined : n(add.cost), measureId: add.m.id } });
    toast(`Added "${add.m.title}" to the plan`); setAdd(null); setTried(false);
  };

  const summary = buildSummary();
  function buildSummary() {
    const org = S.orgName || 'The organisation';
    const top = hot.slice(0, 3).map((h) => `${SOURCE_LABEL[h.key]} (${h.share.toFixed(0)}%)`).join(', ');
    const lines = [
      `${org} — Decarbonisation strategy`,
      '',
      'Ambition',
      `Reduce Scope 1+2 emissions by ${fmt(S.annualPct * (S.targetYear - base.year), 0)}% and Scope 3 by ${fmt(S.s3Pct * (S.targetYear - base.year), 0)}% by ${S.targetYear} against a ${base.year} base year (${S.annualPct}% and ${S.s3Pct}% a year, linear), then reach net zero by ${S.netZeroYear} by cutting all scopes at least ${S.nzPct}% and neutralising only the residual with permanent removals.`,
      '',
      'Where we are',
      `In ${latest.year} emissions were ${fmt(g12.latest)} tCO₂e Scope 1+2 (${S.s2Method}-based) and ${fmt(g3.latest)} tCO₂e Scope 3. The largest sources are ${top || 'not yet split out'}.`,
      `Reaching the ${S.targetYear} targets needs a further ${fmt(g12.cut)} tCO₂e/yr cut in Scope 1+2 and ${fmt(g3.cut)} tCO₂e/yr in Scope 3. Measures in the plan cover ${fmt(Math.min(g12.coverage, 999))}% and ${fmt(Math.min(g3.coverage, 999))}% of those gaps.`,
      '',
      'Roadmap',
      ...phased.filter((p) => p.levers.length).map((p) => `${p.label} (${p.sub(latest.year)}): ${p.levers.map((l) => `${l.name} (${fmt(l.abatement)} t/yr${l.year ? `, ${l.year}` : ''})`).join('; ')}.`),
      '',
      'Next steps',
      g12.coverage < 100 ? `• Identify ${fmt(g12.cut - g12.levers)} tCO₂e/yr more Scope 1+2 reduction.` : '• Scope 1+2 measures are sufficient on paper; secure budgets and owners.',
      g3.coverage < 100 ? `• Identify ${fmt(g3.cut - g3.levers)} tCO₂e/yr more Scope 3 reduction, starting with supplier engagement in the top categories.` : '• Scope 3 measures are sufficient on paper; track supplier delivery.',
      `• Plan for about ${fmt(residual)} tCO₂e of residual emissions at net zero, to be neutralised with permanent removals. Offsets do not count toward the reduction targets.`,
      '• Review annually; recalculate the base year after significant structural change.',
    ];
    return lines.join('\n');
  }
  const copy = async () => { try { await navigator.clipboard.writeText(summary); toast('Strategy summary copied'); } catch { toast('Clipboard blocked; select the text and copy instead', 'err'); } };

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Carbon & portfolio</div>
          <div className="ph-title">Decarbonisation Strategy</div>
          <div className="ph-sub">{S.orgName || 'Your organisation'} · base year {base.year} · latest {latest.year} · net zero {S.netZeroYear}{hub.isSample && <span className="badge b-warn">Sample data</span>}</div>
        </div>
        <div className="ph-actions">
          {canPrint && <button className="btn btn-out" onClick={() => window.print()}><Icon name="file" size={16} />Print / PDF</button>}
          <button className="btn btn-pri" onClick={copy}><Icon name="copy" size={16} />Copy strategy summary</button>
        </div>
      </div>

      <div className="hub-grid">
        <section className="card rise c5" style={{ ['--i' as string]: 0 }}>
          <div className="card-hd"><span className="card-ic"><Icon name="target" size={17} /></span><div><div className="t">1 · Ambition</div><div className="s">Defaults follow SBTi criteria; check the current version</div></div></div>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field label="Near-term target year"><input type="number" min={latest.year} max={2050} value={S.targetYear} onChange={(e) => set({ targetYear: Number(e.target.value) || 2030 })} /></Field>
            <Field label="Net-zero year"><input type="number" min={S.targetYear} max={2070} value={S.netZeroYear} onChange={(e) => set({ netZeroYear: Number(e.target.value) || 2050 })} /></Field>
            <Field label="Scope 1+2 rate (%/yr)" hint="4.2 = 1.5°C-aligned"><input type="number" step={0.1} min={0.1} max={20} value={S.annualPct} onChange={(e) => set({ annualPct: Number(e.target.value) || 4.2 })} /></Field>
            <Field label="Scope 3 rate (%/yr)" hint="2.5 = well-below 2°C minimum"><input type="number" step={0.1} min={0.1} max={20} value={S.s3Pct} onChange={(e) => set({ s3Pct: Number(e.target.value) || 2.5 })} /></Field>
            <Field label="Long-term reduction (%)" className="full" hint="Net-zero standard: ≥ 90% cut, residual neutralised by removals"><input type="number" min={50} max={100} value={S.nzPct} onChange={(e) => set({ nzPct: Number(e.target.value) || 90 })} /></Field>
          </div>
          <div className="target-strip">
            <div><span>{S.targetYear} Scope 1+2</span><b>−{fmt(Math.min(S.annualPct * (S.targetYear - base.year), S.nzPct), 0)}%</b></div>
            <div><span>{S.targetYear} Scope 3</span><b>−{fmt(Math.min(S.s3Pct * (S.targetYear - base.year), S.nzPct), 0)}%</b></div>
            <div><span>{S.netZeroYear} all scopes</span><b>−{S.nzPct}%</b></div>
          </div>
        </section>

        <section className="card rise c7" style={{ ['--i' as string]: 1 }}>
          <div className="card-hd"><span className="card-ic"><Icon name="trendDown" size={17} /></span><div><div className="t">Trajectory to net zero</div><div className="s">Actual vs target path, tCO₂e · Scope 2 {S.s2Method}-based</div></div></div>
          <div className="chart" style={{ flex: 1, minHeight: 300 }}><ResponsiveContainer>
            <ComposedChart data={traj} margin={{ top: 8, right: 12, left: -6, bottom: 0 }}>
              <defs>
                <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--s3)" stopOpacity={0.25} /><stop offset="1" stopColor="var(--s3)" stopOpacity={0} /></linearGradient>
                <linearGradient id="g12" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--s2)" stopOpacity={0.25} /><stop offset="1" stopColor="var(--s2)" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} width={44} tickFormatter={kfmt} />
              <Tooltip content={<ChartTip />} />
              <ReferenceLine x={S.targetYear} stroke="var(--border-strong)" strokeDasharray="2 4" label={{ value: `Near-term ${S.targetYear}`, fill: 'var(--subtle)', fontSize: 10, position: 'insideTopLeft' }} />
              <ReferenceLine x={S.netZeroYear} stroke="var(--border-strong)" strokeDasharray="2 4" label={{ value: 'Net zero', fill: 'var(--subtle)', fontSize: 10, position: 'insideTopRight' }} />
              <Area name="Scope 3 actual" dataKey="s3" stroke="var(--s3)" strokeWidth={2.5} fill="url(#g3)" dot={{ r: 2.5, strokeWidth: 0, fill: 'var(--s3)' }} connectNulls={false} animationDuration={1000} />
              <Area name="Scope 1+2 actual" dataKey="s12" stroke="var(--s2)" strokeWidth={2.5} fill="url(#g12)" dot={{ r: 2.5, strokeWidth: 0, fill: 'var(--s2)' }} connectNulls={false} animationDuration={1000} />
              <Line name="Scope 3 target" dataKey="s3t" stroke="var(--s3)" strokeWidth={1.75} strokeDasharray="6 5" dot={false} animationDuration={1200} />
              <Line name="Scope 1+2 target" dataKey="s12t" stroke="var(--s2)" strokeWidth={1.75} strokeDasharray="6 5" dot={false} animationDuration={1200} />
            </ComposedChart>
          </ResponsiveContainer></div>
          <div className="legend-row">
            <span><span className="sw" style={{ background: 'var(--s2)' }} />Scope 1+2</span><span><span className="sw" style={{ background: 'var(--s3)' }} />Scope 3</span>
            <span className="muted">solid = actual · dashed = target path</span>
          </div>
        </section>

        <section className="card rise c12" style={{ ['--i' as string]: 2 }}>
          <div className="card-hd"><span className="card-ic"><Icon name="alert" size={17} /></span><div><div className="t">2 · Gap to {S.targetYear} targets</div><div className="s">Open (not yet implemented) levers in the plan vs the cut still needed</div></div></div>
          <div className="gap-grid">
            {gaps.map((g) => (
              <div key={g.label} className="gap-card">
                <div className="row" style={{ justifyContent: 'space-between' }}><b>{g.label}</b>
                  <span className={`badge ${g.coverage >= 100 ? 'b-pass' : g.coverage >= 60 ? 'b-warn' : 'b-fail'}`}>{g.cut === 0 ? 'Target met' : `${fmt(Math.min(g.coverage, 999))}% covered`}</span></div>
                <div className="gap-nums">
                  <div><span>Base {base.year}</span><b>{fmt(g.base)}</b></div>
                  <div><span>Latest {latest.year}</span><b>{fmt(g.latest)}</b></div>
                  <div><span>Target {S.targetYear}</span><b>{fmt(g.target)}</b></div>
                  <div><span>Still to cut</span><b className={g.cut ? 'err' : 'acc'}>{fmt(g.cut)}</b></div>
                </div>
                <div className="meter" style={{ marginTop: 10 }}><div className="meter-sec" style={{ width: `${Math.min(g.coverage, 100)}%`, borderRadius: 999 }} /></div>
                <div className="cell-sub">{fmt(g.levers)} tCO₂e/yr in the plan{g.coverage < 100 && g.cut > 0 ? ` · ${fmt(g.cut - g.levers)} t/yr unaddressed` : ''} · residual at net zero ≈ {fmt(g.residual)} t</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card rise c12" style={{ ['--i' as string]: 3 }}>
          <div className="card-hd"><span className="card-ic"><Icon name="zap" size={17} /></span><div><div className="t">3 · Hotspots & recommended measures</div><div className="s">{latest.year}, from {hub.activities.some((a) => a.year === latest.year) ? 'activity data and inventory' : 'the inventory split'} · pick a source to see what works for it</div></div></div>
          <div className="hot-wrap">
            <div className="hot-list" role="tablist" aria-label="Emission hotspots">
              {hot.map((h) => (
                <button key={h.key} role="tab" aria-selected={fk === h.key} className={`hot-item${fk === h.key ? ' on' : ''}`} onClick={() => setFocus(h.key)}>
                  <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                    <span><span className="badge b-na" style={{ marginRight: 6 }}>S{h.scope}</span>{SOURCE_LABEL[h.key]}</span><b className="num">{h.share.toFixed(0)}%</b>
                  </div>
                  <div className="prog" style={{ marginTop: 6 }}><div className="prog-fill" style={{ width: `${h.share}%`, background: `var(--s${h.scope})` }} /></div>
                  <div className="cell-sub" style={{ marginTop: 3 }}>{fmt(h.value)} tCO₂e{h.label ? ` · ${h.label}` : ''}</div>
                </button>
              ))}
              <button className={`hot-item${fk === 'general' ? ' on' : ''}`} onClick={() => setFocus('general')}><span className="cell-main" style={{ fontWeight: 500 }}>Governance & cross-cutting</span></button>
            </div>
            <div className="measure-grid">
              {measuresFor(fk).map((m) => (
                <div key={m.id} className="measure">
                  <div className="row" style={{ gap: 6 }}><span className="badge b-pri">{m.kind}</span><span className="badge b-na">{m.horizon}</span><span className="badge b-na">Scope {m.scope}</span></div>
                  <div className="cell-main" style={{ margin: '8px 0 4px' }}>{m.title}</div>
                  <div className="cell-sub" style={{ fontSize: '.8rem', lineHeight: 1.5 }}>{m.what}</div>
                  {m.credits && <div className="measure-credit"><Icon name="check" size={13} />{m.credits}</div>}
                  <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                    {inPlan(m.id) ? <span className="badge b-pass">✓ In plan</span>
                      : <button className="btn btn-out btn-sm" onClick={() => { setTried(false); setAdd({ m, abatement: '', year: '', cost: '', status: 'Identified' }); }}><Icon name="plus" size={14} />Add to plan</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card rise c12" style={{ ['--i' as string]: 4 }}>
          <div className="card-hd"><span className="card-ic"><Icon name="layers" size={17} /></span><div><div className="t">4 · Phased roadmap</div><div className="s">Open levers by delivery year · implemented levers are already in your actuals</div></div>
            <div className="r"><button className="btn btn-ghost btn-sm" onClick={() => nav({ type: 'SET_PAGE', page: 'data' })}>Edit levers<Icon name="arrowR" size={14} /></button></div></div>
          {hub.levers.filter((l) => l.status !== 'Implemented').length === 0 ? (
            <EmptyState compact icon={<Icon name="layers" size={22} />} title="Nothing in the plan yet" body="Add measures from the hotspots above. Give each one an abatement estimate and a delivery year to place it on the roadmap." />
          ) : (
            <div className="road">
              {phased.map((p) => (
                <div key={p.id} className={`road-col${p.id === 'Unscheduled' ? ' muted-col' : ''}`}>
                  <div className="road-hd"><b>{p.label}</b><span className="cell-sub">{p.sub(latest.year)}</span>
                    <span className="road-sum num">{fmt(p.levers.reduce((a, l) => a + l.abatement, 0))} t/yr</span></div>
                  {p.levers.length === 0 && <div className="cell-sub" style={{ padding: '10px 2px' }}>—</div>}
                  {p.levers.map((l) => (
                    <div key={l.id} className="road-item" style={{ borderLeftColor: STATUS_COL[l.status] }}>
                      <div className="cell-main" style={{ fontSize: '.84rem' }}>{l.name}</div>
                      <div className="cell-sub">S{l.scope} · {fmt(l.abatement)} t/yr{l.year ? ` · ${l.year}` : ''}{l.costPerT != null ? ` · ${S.currency}${fmt(l.costPerT)}/t` : ''} · {l.status}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card rise c12" style={{ ['--i' as string]: 5 }}>
          <div className="card-hd"><span className="card-ic"><Icon name="file" size={17} /></span><div><div className="t">5 · Strategy summary</div><div className="s">Generated from the numbers above. Edit freely before it goes into a report or board paper.</div></div>
            <div className="r"><button className="btn btn-out btn-sm" onClick={copy}><Icon name="copy" size={14} />Copy</button></div></div>
          <pre className="summary">{summary}</pre>
          <div className="insight"><Icon name="info" size={16} /><span>Residual emissions at net zero (about <b>{fmt(residual)}</b> tCO₂e/yr) are neutralised with permanent carbon removals. Avoidance offsets and RECs do not count as reductions against these targets. Report them separately.</span></div>
        </section>
      </div>

      {add && (
        <Modal title={`Add to plan: ${add.m.title}`} onClose={() => setAdd(null)}
          footer={<><button className="btn btn-out" onClick={() => setAdd(null)}>Cancel</button><button className="btn btn-pri" onClick={saveAdd}><Icon name="save" size={15} />Add lever</button></>}>
          <div className="cell-sub" style={{ marginBottom: 12 }}>{add.m.what}</div>
          <form className="form-grid" onSubmit={(e) => { e.preventDefault(); saveAdd(); }}>
            <Field label="Abatement (tCO₂e/yr)" error={tried && addErr.ab} hint="From your energy model, LCA or vendor estimate"><Num value={add.abatement} onChange={(v) => setAdd({ ...add, abatement: v })} invalid={tried && !!addErr.ab} label="Abatement" /></Field>
            <Field label="Delivery year" error={tried && addErr.year}><Num value={add.year} onChange={(v) => setAdd({ ...add, year: v })} invalid={tried && !!addErr.year} placeholder={String(latest.year + 2)} label="Delivery year" /></Field>
            <Field label={`Cost (${S.currency}/tCO₂e)`} error={tried && addErr.cost} hint="Negative = net saving"><Num value={add.cost} onChange={(v) => setAdd({ ...add, cost: v })} invalid={tried && !!addErr.cost} label="Cost per tonne" /></Field>
            <Field label="Status"><select value={add.status} onChange={(e) => setAdd({ ...add, status: e.target.value as LeverStatus })}>{LEVER_STATUSES.filter((s) => s !== 'Implemented').map((s) => <option key={s}>{s}</option>)}</select></Field>
            <button type="submit" hidden />
          </form>
        </Modal>
      )}
    </div>
  );
};
export default Strategy;

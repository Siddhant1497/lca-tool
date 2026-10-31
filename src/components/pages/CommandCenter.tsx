import React, { useRef, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  LineChart, Line, ReferenceLine, Cell,
} from 'recharts';
import { useHub } from '../../context/HubContext';
import { useLCA } from '../../context/LCAContext';
import {
  buildPathway, metrics, fmt, total, projectGap, atRisk, onTrack, parseGhgCsv, GHG_TEMPLATE,
} from '../../utils/hub';
import type { CertProject, LeverStatus } from '../../types/hub';
import CountUp from '../ui/CountUp';
import EmptyState from '../ui/EmptyState';

const TIP = { background: 'var(--surf)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 };
const TICK = { fontSize: 11, fill: 'var(--muted)' };
const STATUS_COL: Record<LeverStatus, string> = {
  Implemented: 'var(--acc)', 'In progress': 'var(--pri)', Planned: 'var(--warn)', Identified: 'var(--subtle)',
};
const STAGE_BADGE: Record<string, string> = {
  Certified: 'b-pass', Submitted: 'b-info', Construction: 'b-info', Design: 'b-na', Registered: 'b-na',
};

const download = (name: string, text: string) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
};

const Delta: React.FC<{ pct: number | null; goodWhenDown?: boolean; suffix?: string }> = ({ pct, goodWhenDown = true, suffix = 'vs prior yr' }) => {
  if (pct === null) return <span className="kpi-sub">No prior year</span>;
  const good = goodWhenDown ? pct <= 0 : pct >= 0;
  return (
    <span className={`delta ${good ? 'good' : 'bad'}`}>
      {pct <= 0 ? '▼' : '▲'} {Math.abs(pct).toFixed(1)}% <span className="muted">{suffix}</span>
    </span>
  );
};

const Card: React.FC<{ title: string; sub?: string; i: number; children: React.ReactNode; right?: React.ReactNode }> = ({ title, sub, i, children, right }) => (
  <section className="card rise" style={{ ['--i' as string]: i }}>
    <div className="card-title" style={{ marginBottom: sub ? 2 : 14 }}>{title}<span style={{ marginLeft: 'auto' }}>{right}</span></div>
    {sub && <div className="muted" style={{ fontSize: '.78rem', marginBottom: 12 }}>{sub}</div>}
    {children}
  </section>
);

const Meter: React.FC<{ p: CertProject }> = ({ p }) => {
  const sec = Math.min((p.secured / p.max) * 100, 100);
  const lik = Math.min((p.likely / p.max) * 100, 100 - sec);
  const need = Math.min((p.needed / p.max) * 100, 100);
  return (
    <div className="meter" role="img" aria-label={`${p.secured} of ${p.needed} ${p.unit} secured, ${p.likely} likely`}>
      <div className="meter-sec" style={{ width: `${sec}%` }} />
      <div className="meter-lik" style={{ left: `${sec}%`, width: `${lik}%` }} />
      <div className="meter-need" style={{ left: `${need}%` }} title={`Target ${p.needed}`} />
    </div>
  );
};

const CommandCenter: React.FC = () => {
  const { hub, dispatch } = useHub();
  const { dispatch: lcaDispatch, results } = useLCA();
  const file = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);

  const onFile = async (f?: File) => {
    if (!f) return;
    try { dispatch({ type: 'SET_GHG', ghg: parseGhgCsv(await f.text()) }); setErr(null); }
    catch (e) { setErr((e as Error).message); }
    if (file.current) file.current.value = '';
  };

  const Actions = (
    <>
      <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <button className="btn btn-out" onClick={() => download('ghg-template.csv', GHG_TEMPLATE)}>⬇ CSV template</button>
      <button className="btn btn-out" onClick={() => file.current?.click()}>⬆ Import GHG CSV</button>
    </>
  );

  /* ── Empty state ── */
  if (!hub.loaded) {
    return (
      <div>
        <div className="ph"><div><div className="ph-title">Command Center</div>
          <div className="ph-sub">GHG inventory · decarbonisation pathway · certification portfolio</div></div></div>
        <div className="card">
          <EmptyState icon="🌍" title="Your portfolio starts here"
            body="Import a yearly Scope 1/2/3 inventory to see your trajectory against a 1.5°C-aligned pathway, or explore with illustrative sample data first.">
            <button className="btn btn-pri btn-lg" onClick={() => dispatch({ type: 'LOAD_SAMPLE' })}>Explore sample data</button>
            {Actions}
          </EmptyState>
          {err && <div className="notice err-n" role="alert">{err}</div>}
          <div className="muted" style={{ fontSize: '.76rem', textAlign: 'center' }}>
            CSV columns: <span className="mono">year, scope1, scope2, scope3</span> (tCO₂e, one row per year; first row is the base year)
          </div>
        </div>
      </div>
    );
  }

  const m = metrics(hub.ghg, hub.levers, hub.settings)!;
  const path = buildPathway(hub.ghg, hub.settings);
  const trend = hub.ghg.map((g) => ({ year: String(g.year), 'Scope 1': g.scope1, 'Scope 2': g.scope2, 'Scope 3': g.scope3 }));
  const levers = [...hub.levers].sort((a, b) => b.abatement - a.abatement);
  const leed = hub.projects.find((p) => p.categories);
  const risk = hub.projects.filter(atRisk);
  const active = hub.projects.filter((p) => p.stage !== 'Certified').length;
  const behind = m.gapNow > 0;

  const kpis = [
    { lbl: `Total GHG ${m.latest.year}`, val: <CountUp value={total(m.latest)} />, unit: 'tCO₂e', sub: <Delta pct={m.totalYoY} /> },
    { lbl: 'Scope 1+2 vs base', val: <CountUp value={Math.abs(m.s12VsBase)} decimals={1} />, unit: `% ${m.s12VsBase <= 0 ? 'lower' : 'higher'}`, sub: <span className="kpi-sub">Base year {m.base.year}</span> },
    { lbl: 'vs 1.5°C pathway', val: <CountUp value={Math.abs(m.gapNow)} />, unit: `tCO₂e ${behind ? 'above' : 'below'}`,
      sub: <span className={`delta ${behind ? 'bad' : 'good'}`}>{behind ? '▲ Behind pathway' : '▼ Ahead of pathway'}</span> },
    { lbl: 'Scope 3 share', val: <CountUp value={m.scope3Share} decimals={0} />, unit: '%', sub: <span className="kpi-sub">of {m.latest.year} total</span> },
    { lbl: 'Certifications active', val: <CountUp value={active} />, unit: `of ${hub.projects.length}`,
      sub: <span className={`delta ${risk.length ? 'bad' : 'good'}`}>{risk.length ? `⚠ ${risk.length} at risk` : '✓ none at risk'}</span> },
    { lbl: `Gap closed by ${hub.settings.targetYear}`, val: <CountUp value={Math.min(m.leverCoverage, 999)} />, unit: '%',
      sub: <span className="kpi-sub">{fmt(m.leverS12)} of {fmt(m.gapTarget)} tCO₂e S1+2</span> },
  ];

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-title">Command Center</div>
          <div className="ph-sub">
            {hub.isSample ? 'Illustrative sample data' : 'Your data'} · {hub.ghg[0].year}–{m.latest.year} · {hub.projects.length} certification projects
            {results && <> · LCA: <b>{fmt(results.perM2.GWP)}</b> kgCO₂e/m² embodied</>}
          </div>
        </div>
        <div className="ph-actions">
          {Actions}
          <button className="btn btn-out" onClick={() => lcaDispatch({ type: 'SET_PAGE', page: 'materials' })}>🧱 LCA</button>
          <button className="btn btn-out" onClick={() => { if (confirm('Clear all Command Center data?')) dispatch({ type: 'CLEAR' }); }}>Clear</button>
        </div>
      </div>
      {err && <div className="notice err-n" role="alert">{err}</div>}
      {hub.isSample && (
        <div className="notice">Sample data is fictional. Score thresholds are placeholders — use the current rating-system guide for real targets. Importing a CSV replaces it.</div>
      )}

      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div className="kpi rise" key={k.lbl} style={{ ['--i' as string]: i }}>
            <div className="kpi-lbl">{k.lbl}</div>
            <div className="kpi-val">{k.val} <span className="kpi-unit">{k.unit}</span></div>
            <div style={{ marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="hub-grid">
        <Card i={6} title="GHG inventory by scope" sub="tCO₂e per year. Scope 2 method (location vs market) must be stated when reporting.">
          <div className="chart"><ResponsiveContainer>
            <BarChart data={trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="year" tick={TICK} stroke="var(--border)" />
              <YAxis tick={TICK} stroke="var(--border)" width={48} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <Tooltip contentStyle={TIP} cursor={{ fill: 'var(--bg)' }} formatter={(v: number) => `${fmt(v)} tCO₂e`} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Scope 1" stackId="a" fill="var(--s1)" animationDuration={900} />
              <Bar dataKey="Scope 2" stackId="a" fill="var(--s2)" animationDuration={900} animationBegin={150} />
              <Bar dataKey="Scope 3" stackId="a" fill="var(--s3)" radius={[3, 3, 0, 0]} animationDuration={900} animationBegin={300} />
            </BarChart>
          </ResponsiveContainer></div>
        </Card>

        <Card i={7} title="Scope 1+2 vs decarbonisation pathway"
          sub={`Linear ${hub.settings.annualPct}%/yr of base-year emissions (SBTi 1.5°C-aligned default for Scope 1+2).`}
          right={
            <span className="row" style={{ gap: 6, fontWeight: 400 }}>
              <label className="mini">Target yr <input type="number" min={m.latest.year} max={2060} value={hub.settings.targetYear}
                onChange={(e) => dispatch({ type: 'SET_SETTINGS', settings: { targetYear: Number(e.target.value) || 2030 } })} /></label>
              <label className="mini">%/yr <input type="number" step={0.1} min={0.1} max={20} value={hub.settings.annualPct}
                onChange={(e) => dispatch({ type: 'SET_SETTINGS', settings: { annualPct: Number(e.target.value) || 4.2 } })} /></label>
            </span>}>
          <div className="chart"><ResponsiveContainer>
            <LineChart data={path} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="year" tick={TICK} stroke="var(--border)" />
              <YAxis tick={TICK} stroke="var(--border)" width={48} />
              <Tooltip contentStyle={TIP} formatter={(v: number) => `${fmt(v)} tCO₂e`} />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine x={m.latest.year} stroke="var(--subtle)" strokeDasharray="2 4" />
              <Line name="Pathway" dataKey="pathway" stroke="var(--warn)" strokeWidth={2} strokeDasharray="6 4" dot={false} animationDuration={1100} />
              <Line name="Actual S1+2" dataKey="actual" stroke="var(--s2)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} animationDuration={1100} />
            </LineChart>
          </ResponsiveContainer></div>
          <div className="insight">
            {m.gapTarget > 0
              ? <>To reach the {hub.settings.targetYear} pathway ({fmt(m.pathwayTarget)} tCO₂e) you still need to cut <b>{fmt(m.gapTarget)}</b> tCO₂e/yr. Open Scope 1+2 levers (not yet implemented) cover <b>{fmt(m.leverCoverage)}%</b>.</>
              : <>Already at or below the {hub.settings.targetYear} pathway value.</>}
          </div>
        </Card>

        <Card i={8} title="Decarbonisation levers" sub="Abatement potential, tCO₂e/yr, coloured by delivery status.">
          {levers.length === 0 ? (
            <EmptyState compact icon="⚡" title="No levers yet" body="Levers appear here once you add them (sample data includes a few)." />
          ) : (<>
            <div className="chart" style={{ height: 40 + levers.length * 38 }}><ResponsiveContainer>
              <BarChart data={levers} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={TICK} stroke="var(--border)" />
                <YAxis type="category" dataKey="name" width={150} tick={TICK} stroke="var(--border)" />
                <Tooltip contentStyle={TIP} cursor={{ fill: 'var(--bg)' }}
                  formatter={(v: number, _n, p) => [`${fmt(v)} tCO₂e/yr · Scope ${p.payload.scope}`, p.payload.status]} />
                <Bar dataKey="abatement" radius={[0, 4, 4, 0]} animationDuration={900}>
                  {levers.map((l) => <Cell key={l.id} fill={STATUS_COL[l.status]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer></div>
            <div className="row legend-row">
              {(Object.keys(STATUS_COL) as LeverStatus[]).map((s) => (
                <span key={s} className="row" style={{ gap: 5 }}><span className="dot" style={{ background: STATUS_COL[s] }} />{s}</span>
              ))}
            </div>
          </>)}
        </Card>

        <Card i={9} title={leed ? `${leed.system} ${leed.version} — credit categories` : 'Credit categories'}
          sub={leed ? `${leed.name} · target ${leed.targetLabel} (${leed.needed} ${leed.unit})` : undefined}>
          {!leed ? (
            <EmptyState compact icon="🏢" title="No category breakdown" body="Projects with a credit-category scorecard (e.g. LEED) show their status here." />
          ) : (<>
            <div className="chart" style={{ height: 40 + leed.categories!.length * 30 }}><ResponsiveContainer>
              <BarChart data={leed.categories!.map((c) => ({ ...c, open: c.max - c.secured - c.likely }))} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={TICK} stroke="var(--border)" />
                <YAxis type="category" dataKey="name" width={130} tick={TICK} stroke="var(--border)" />
                <Tooltip contentStyle={TIP} cursor={{ fill: 'var(--bg)' }} />
                <Bar name="Secured" dataKey="secured" stackId="c" fill="var(--acc)" animationDuration={900} />
                <Bar name="Likely" dataKey="likely" stackId="c" fill="var(--warn)" animationDuration={900} animationBegin={150} />
                <Bar name="Open" dataKey="open" stackId="c" fill="var(--border)" radius={[0, 3, 3, 0]} animationDuration={900} animationBegin={300} />
              </BarChart>
            </ResponsiveContainer></div>
            <div className="insight">
              {leed.secured >= leed.needed
                ? <>Target met on secured credits alone.</>
                : leed.secured + leed.likely >= leed.needed
                  ? <><b>{leed.needed - leed.secured}</b> {leed.unit} still to secure; the <b>{leed.likely}</b> likely {leed.unit} would be enough if they all land.</>
                  : <>Even if every likely credit lands you are <b>{leed.needed - leed.secured - leed.likely}</b> {leed.unit} short of {leed.targetLabel}. Pursue more credits.</>}
            </div>
          </>)}
        </Card>
      </div>

      <section className="card rise" style={{ ['--i' as string]: 10, marginTop: 14 }}>
        <div className="card-title">Certification portfolio</div>
        {hub.projects.length === 0 ? (
          <EmptyState compact icon="📋" title="No certification projects yet"
            body="Track LEED, IGBC, GRIHA, EDGE, WELL and Fitwel projects against their target level. Load the sample data to see the layout." />
        ) : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Project</th><th>System</th><th>Target</th><th style={{ minWidth: 200 }}>Progress</th><th>Gap</th><th>Stage</th><th>Next action</th></tr></thead>
            <tbody>
              {hub.projects.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.name}</b></td>
                  <td>{p.system} <span className="muted">{p.version}</span></td>
                  <td>{p.targetLabel} <span className="muted mono">{p.needed}{p.unit === '%' ? '%' : ''}</span></td>
                  <td><Meter p={p} /><div className="muted mono" style={{ fontSize: '.72rem' }}>{p.secured} secured · {p.likely} likely / {p.max} {p.unit}</div></td>
                  <td>{onTrack(p)
                    ? <span className="badge b-pass">✓ Met</span>
                    : <span className={`badge ${atRisk(p) ? 'b-fail' : 'b-warn'}`}>{atRisk(p) ? '⚠' : ''} {projectGap(p)} {p.unit} to go</span>}</td>
                  <td><span className={`badge ${STAGE_BADGE[p.stage]}`}>{p.stage}</span></td>
                  <td style={{ fontSize: '.82rem' }}>{p.next}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>
    </div>
  );
};
export default CommandCenter;

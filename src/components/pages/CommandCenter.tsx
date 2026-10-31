import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ComposedChart, Area, Line, ReferenceLine, Cell, PieChart, Pie,
} from 'recharts';
import { useHub } from '../../context/HubContext';
import { useLCA } from '../../context/LCAContext';
import { buildPathway, metrics, fmt, total, s2, s12, projectGap, atRisk, onTrack, missingMarket } from '../../utils/hub';
import type { CertProject, LeverStatus, CertSystem } from '../../types/hub';
import CountUp from '../ui/CountUp';
import EmptyState from '../ui/EmptyState';
import Icon, { type IconName } from '../ui/Icon';
import Kpi from '../ui/Kpi';
import ChartTip from '../ui/ChartTip';
import ImportGhg from '../ui/ImportGhg';

const TICK = { fontSize: 11, fill: 'var(--muted)' };
const kfmt = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(v));
export const STATUS_COL: Record<LeverStatus, string> = {
  Implemented: 'var(--acc)', 'In progress': 'var(--info)', Planned: 'var(--warn)', Identified: 'var(--subtle)',
};
export const STAGE_BADGE: Record<string, string> = {
  Certified: 'b-pass', Submitted: 'b-info', Construction: 'b-pri', Design: 'b-na', Registered: 'b-na',
};
export const SYS_COL: Record<CertSystem, string> = {
  LEED: '#3F8F3A', IGBC: '#0E7490', GRIHA: '#B45309', EDGE: '#2563EB', WELL: '#7C3AED', Fitwel: '#DB2777', Other: '#64748B',
};
export const SysTag: React.FC<{ s: CertSystem }> = ({ s }) => (
  <span className="sys" style={{ color: SYS_COL[s], background: `color-mix(in srgb, ${SYS_COL[s]} 13%, transparent)` }}>{s}</span>
);

const Card: React.FC<{ title: string; sub?: React.ReactNode; icon: IconName; i: number; span: string; right?: React.ReactNode; children: React.ReactNode }> =
  ({ title, sub, icon, i, span, right, children }) => (
    <section className={`card rise ${span}`} style={{ ['--i' as string]: i }}>
      <div className="card-hd">
        <span className="card-ic"><Icon name={icon} size={17} /></span>
        <div><div className="t">{title}</div>{sub && <div className="s">{sub}</div>}</div>
        {right && <div className="r">{right}</div>}
      </div>
      {children}
    </section>
  );

const Meter: React.FC<{ p: CertProject }> = ({ p }) => {
  const sec = Math.min((p.secured / p.max) * 100, 100);
  const lik = Math.min((p.likely / p.max) * 100, 100 - sec);
  return (
    <div className="meter" role="img" aria-label={`${p.secured} of ${p.needed} ${p.unit} secured, ${p.likely} likely`}>
      <div className="meter-sec" style={{ width: `${sec}%` }} />
      <div className="meter-lik" style={{ left: `${sec}%`, width: `${lik}%` }} />
      <div className="meter-need" style={{ left: `${Math.min((p.needed / p.max) * 100, 100)}%` }} title={`Target ${p.needed}`} />
    </div>
  );
};

const CommandCenter: React.FC = () => {
  const { hub, dispatch } = useHub();
  const { dispatch: lca, results } = useLCA();
  const go = (page: 'data' | 'materials') => lca({ type: 'SET_PAGE', page });
  const S = hub.settings, M = S.s2Method;

  /* ── First run ── */
  if (!hub.loaded) {
    return (
      <div>
        <div className="ph"><div>
          <div className="ph-eyebrow">Portfolio overview</div>
          <div className="ph-title">Command Center</div>
          <div className="ph-sub">GHG inventory, decarbonisation pathway and certification portfolio in one place.</div>
        </div></div>
        <div className="card rise">
          <EmptyState icon={<Icon name="leaf" size={30} />} title="Set up your sustainability portfolio"
            body="Bring in a yearly Scope 1/2/3 inventory and your certification projects. The dashboard tracks you against a 1.5°C-aligned pathway and flags projects at risk of missing their target.">
            <button className="btn btn-pri btn-lg" onClick={() => dispatch({ type: 'LOAD_SAMPLE' })}><Icon name="grid" size={16} />Explore sample data</button>
            <button className="btn btn-out btn-lg" onClick={() => { dispatch({ type: 'START_EMPTY' }); go('data'); }}><Icon name="plus" size={16} />Start from scratch</button>
            <ImportGhg className="btn btn-out btn-lg" label="Import GHG CSV" />
          </EmptyState>
          <div className="steps" style={{ margin: '0 auto 12px' }}>
            {[['Inventory', 'Enter yearly Scope 1, 2 (location + market) and 3 totals, or build them from activity data and your own emission factors.'],
              ['Certifications', 'Add LEED, IGBC, GRIHA, EDGE, WELL or Fitwel projects with secured and likely points vs target.'],
              ['Act', 'See the gap to your pathway, how much your levers close, and which projects need attention.']].map(([t, d], k) => (
              <div className="step" key={t}><div className="n">{k + 1}</div><b>{t}</b><span className="muted">{d}</span></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const m = metrics(hub.ghg, hub.levers, S);
  const path = buildPathway(hub.ghg, S);
  const miss = missingMarket(hub.ghg, M);
  const trend = hub.ghg.map((g) => ({ year: String(g.year), 'Scope 1': g.scope1, 'Scope 2': s2(g, M), 'Scope 3': g.scope3 }));
  const levers = [...hub.levers].sort((a, b) => b.abatement - a.abatement);
  const cat = hub.projects.find((p) => p.categories?.length);
  const risk = hub.projects.filter(atRisk);
  const certified = hub.projects.filter((p) => p.stage === 'Certified').length;
  const onTrk = hub.projects.filter((p) => p.stage !== 'Certified' && !atRisk(p)).length;
  const behind = m ? m.gapNow > 0 : false;
  const split = m ? [
    { name: 'Scope 1', value: m.latest.scope1, fill: 'var(--s1)' },
    { name: 'Scope 2', value: s2(m.latest, M), fill: 'var(--s2)' },
    { name: 'Scope 3', value: m.latest.scope3, fill: 'var(--s3)' },
  ] : [];
  const noGhg = (
    <EmptyState compact icon={<Icon name="chart" size={22} />} title="No inventory yet" body="Add at least one year of Scope 1/2/3 totals to see trends and your pathway.">
      <button className="btn btn-pri btn-sm" onClick={() => go('data')}><Icon name="plus" size={14} />Add inventory</button>
      <ImportGhg className="btn btn-out btn-sm" />
    </EmptyState>
  );
  const pipe = [
    { name: 'Certified', value: certified, fill: 'var(--acc)' },
    { name: 'On track', value: onTrk, fill: 'var(--info)' },
    { name: 'At risk', value: risk.length, fill: 'var(--err)' },
  ];

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Portfolio overview</div>
          <div className="ph-title">Command Center</div>
          <div className="ph-sub">
            <span className={`badge ${hub.isSample ? 'b-warn' : 'b-pri'}`}>{hub.isSample ? 'Sample data' : 'Your data'}</span>
            {m && <span>Inventory {m.base.year}–{m.latest.year}</span>}
            <span>· {hub.projects.length} certification project{hub.projects.length === 1 ? '' : 's'}</span>
            {results && <span>· Building LCA <b className="num">{fmt(results.perM2.GWP)}</b> kgCO₂e/m²</span>}
          </div>
        </div>
        <div className="ph-actions">
          <span className="mini">Scope 2
            <span className="seg" role="group" aria-label="Scope 2 method">
              {(['location', 'market'] as const).map((k) => (
                <button key={k} className={M === k ? 'on' : ''} aria-pressed={M === k}
                  onClick={() => dispatch({ type: 'SET_SETTINGS', settings: { s2Method: k } })}>{k === 'location' ? 'Location' : 'Market'}</button>
              ))}
            </span>
          </span>
          <button className="btn btn-out" onClick={() => window.print()}><Icon name="file" size={16} />Print / PDF</button>
          <button className="btn btn-pri" onClick={() => go('data')}><Icon name="database" size={16} />Manage data</button>
        </div>
      </div>

      {hub.isSample && (
        <div className="notice"><Icon name="alert" size={16} />
          <span className="grow">Sample data is fictional. Score thresholds are placeholders; take real targets from the current rating-system guide.</span>
          <button className="btn btn-sm btn-out" onClick={() => { if (confirm('Remove the sample data and start an empty portfolio?')) { dispatch({ type: 'START_EMPTY' }); go('data'); } }}>Use my own data</button>
        </div>
      )}
      {miss.length > 0 && (
        <div className="notice info"><Icon name="info" size={16} />
          <span className="grow">Market-based Scope 2 missing for {miss.join(', ')}; location-based used for those years. Mixing methods across years weakens comparability.</span>
        </div>
      )}

      <div className="kpi-grid six">
        <Kpi i={0} icon="pie" tone="pri" label={m ? `Total emissions ${m.latest.year}` : 'Total emissions'}
          value={m ? <CountUp value={m.latestTotal} /> : '—'} unit="tCO₂e"
          spark={hub.ghg.map((g) => total(g, M))}
          foot={m?.totalYoY != null ? <span className={`delta ${m.totalYoY <= 0 ? 'good' : 'bad'}`}>{m.totalYoY <= 0 ? '▼' : '▲'} {Math.abs(m.totalYoY).toFixed(1)}% YoY</span> : 'Needs 2+ years'} />
        <Kpi i={1} icon="trendDown" tone={m && m.s12VsBase <= 0 ? 'acc' : 'err'} label="Scope 1+2 vs base year"
          value={m ? <><CountUp value={Math.abs(m.s12VsBase)} decimals={1} />%</> : '—'} unit={m ? (m.s12VsBase <= 0 ? 'lower' : 'higher') : ''}
          spark={hub.ghg.map((g) => s12(g, M))} foot={m ? `Base ${m.base.year} · ${M}-based` : 'No base year'} />
        <Kpi i={2} icon="target" tone={behind ? 'err' : 'acc'} label="vs 1.5°C pathway"
          value={m ? <CountUp value={Math.abs(m.gapNow)} /> : '—'} unit={m ? `tCO₂e ${behind ? 'above' : 'below'}` : ''}
          foot={m ? <span className={`delta ${behind ? 'bad' : 'good'}`}>{behind ? '▲ Behind' : '▼ Ahead'} in {m.latest.year}</span> : '—'} />
        <Kpi i={3} icon="link" tone="s3" label="Scope 3 share" value={m ? <><CountUp value={m.scope3Share} />%</> : '—'}
          spark={hub.ghg.map((g) => g.scope3)} foot={m ? `${fmt(m.latest.scope3)} tCO₂e` : '—'} />
        <Kpi i={4} icon="building" tone={risk.length ? 'warn' : 'acc'} label="Certifications"
          value={<CountUp value={hub.projects.length} />} unit={`${certified} certified`}
          foot={hub.projects.length ? <span className={`delta ${risk.length ? 'bad' : 'good'}`}>{risk.length ? `${risk.length} at risk` : 'None at risk'}</span> : 'None tracked'} />
        <Kpi i={5} icon="zap" tone={m && m.leverCoverage >= 100 ? 'acc' : 'warn'} label={`Levers vs ${S.targetYear} gap`}
          value={m ? <><CountUp value={Math.min(m.leverCoverage, 999)} />%</> : '—'} unit="covered"
          foot={m ? `${fmt(m.leverS12)} / ${fmt(m.gapTarget)} tCO₂e` : '—'} />
      </div>

      <div className="hub-grid">
        <Card i={6} span="c7" icon="target" title="Scope 1+2 vs decarbonisation pathway"
          sub={`Linear ${S.annualPct}%/yr of base-year emissions · ${M}-based Scope 2`}
          right={<>
            <label className="mini">Target <input type="number" min={m?.latest.year ?? 2020} max={2060} value={S.targetYear}
              onChange={(e) => dispatch({ type: 'SET_SETTINGS', settings: { targetYear: Number(e.target.value) || 2030 } })} /></label>
            <label className="mini">%/yr <input type="number" step={0.1} min={0.1} max={20} value={S.annualPct}
              onChange={(e) => dispatch({ type: 'SET_SETTINGS', settings: { annualPct: Number(e.target.value) || 4.2 } })} /></label>
          </>}>
          {!m ? noGhg : (<>
            <div className="chart"><ResponsiveContainer>
              <ComposedChart data={path} margin={{ top: 8, right: 12, left: -6, bottom: 0 }}>
                <defs><linearGradient id="gAct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--s2)" stopOpacity={0.28} /><stop offset="1" stopColor="var(--s2)" stopOpacity={0} />
                </linearGradient></defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} width={44} tickFormatter={kfmt} />
                <Tooltip content={<ChartTip />} />
                <ReferenceLine x={m.latest.year} stroke="var(--border-strong)" strokeDasharray="2 4" label={{ value: 'Latest', fill: 'var(--subtle)', fontSize: 10, position: 'insideTopRight' }} />
                <Area name="Actual S1+2" dataKey="actual" stroke="var(--s2)" strokeWidth={2.5} fill="url(#gAct)" dot={{ r: 3, strokeWidth: 0, fill: 'var(--s2)' }} activeDot={{ r: 5 }} connectNulls={false} animationDuration={1100} />
                <Line name="Pathway" dataKey="pathway" stroke="var(--warn)" strokeWidth={2} strokeDasharray="6 5" dot={false} animationDuration={1100} />
              </ComposedChart>
            </ResponsiveContainer></div>
            <div className="legend-row">
              <span><span className="sw" style={{ background: 'var(--s2)' }} />Actual Scope 1+2</span>
              <span><span className="sw" style={{ background: 'var(--warn)' }} />Pathway</span>
            </div>
            <div className={`insight${m.leverCoverage < 100 ? ' warn' : ''}`}><Icon name={m.leverCoverage < 100 ? 'alert' : 'check'} size={16} />
              <span>{m.gapTarget > 0
                ? <>To hit the {S.targetYear} pathway ({fmt(m.pathwayTarget)} tCO₂e) you need to cut <b>{fmt(m.gapTarget)}</b> tCO₂e/yr more. Open Scope 1+2 levers cover <b>{fmt(Math.min(m.leverCoverage, 999))}%</b>{m.leverCoverage < 100 ? <>, leaving <b>{fmt(m.gapTarget - m.leverS12)}</b> tCO₂e unaddressed.</> : '.'}</>
                : <>Already at or below the {S.targetYear} pathway value of {fmt(m.pathwayTarget)} tCO₂e.</>}</span>
            </div>
          </>)}
        </Card>

        <Card i={7} span="c5" icon="pie" title={m ? `Emissions split · ${m.latest.year}` : 'Emissions split'} sub="Share of total by scope">
          {!m ? noGhg : (<>
            <div style={{ position: 'relative', height: 230, margin: 'auto 0' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={split} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke="var(--surf)" strokeWidth={2} animationDuration={900}>
                    {split.map((d) => <Cell key={d.name} fill={d.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTip title={() => `${m.latest.year}`} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="ring-lbl"><div><b className="num">{kfmt(Math.round(m.latestTotal))}</b><span>tCO₂e total</span></div></div>
            </div>
            <div className="split-stats">
              {split.map((d) => (
                <div key={d.name}>
                  <div className="k"><span className="sw" style={{ background: d.fill }} />{d.name}</div>
                  <div className="v">{m.latestTotal ? ((d.value / m.latestTotal) * 100).toFixed(0) : 0}%</div>
                  <div className="cell-sub num">{fmt(d.value)} t</div>
                </div>
              ))}
            </div>
          </>)}
        </Card>

        <Card i={8} span="c7" icon="chart" title="GHG inventory by scope" sub={`tCO₂e per year · Scope 2 ${M}-based`}>
          {!m ? noGhg : (<>
            <div className="chart"><ResponsiveContainer>
              <BarChart data={trend} margin={{ top: 8, right: 4, left: -6, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} width={44} tickFormatter={kfmt} />
                <Tooltip content={<ChartTip showTotal />} cursor={{ fill: 'var(--hover)' }} />
                <Bar dataKey="Scope 1" stackId="a" fill="var(--s1)" animationDuration={900} />
                <Bar dataKey="Scope 2" stackId="a" fill="var(--s2)" animationDuration={900} animationBegin={120} />
                <Bar dataKey="Scope 3" stackId="a" fill="var(--s3)" radius={[5, 5, 0, 0]} animationDuration={900} animationBegin={240} />
              </BarChart>
            </ResponsiveContainer></div>
            <div className="legend-row">
              {(['s1', 's2', 's3'] as const).map((k, j) => <span key={k}><span className="sw" style={{ background: `var(--${k})` }} />Scope {j + 1}</span>)}
            </div>
          </>)}
        </Card>

        <Card i={9} span="c5" icon="zap" title="Decarbonisation levers" sub="Abatement potential, tCO₂e/yr"
          right={<button className="btn btn-ghost btn-sm" onClick={() => go('data')}>Edit<Icon name="arrowR" size={14} /></button>}>
          {levers.length === 0 ? (
            <EmptyState compact icon={<Icon name="zap" size={22} />} title="No levers yet" body="Add reduction measures (solar PPA, heat pumps, low-carbon concrete…) to see how much of the gap they close.">
              <button className="btn btn-pri btn-sm" onClick={() => go('data')}><Icon name="plus" size={14} />Add a lever</button>
            </EmptyState>
          ) : (<>
            <div style={{ flex: 1, minHeight: 30 + levers.length * 36 }}><ResponsiveContainer>
              <BarChart data={levers} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap="22%">
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} tickFormatter={kfmt} />
                <YAxis type="category" dataKey="name" width={140} tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'var(--hover)' }} content={({ active, payload }) => active && payload?.length ? (
                  <div className="chart-tip"><div className="h">{payload[0].payload.name}</div>
                    <div className="l"><span>Abatement</span><b>{fmt(payload[0].payload.abatement)} t/yr</b></div>
                    <div className="l"><span>Scope</span><b>{payload[0].payload.scope}</b></div>
                    <div className="l"><span>Status</span><b>{payload[0].payload.status}</b></div></div>) : null} />
                <Bar dataKey="abatement" radius={[0, 5, 5, 0]} animationDuration={900}>
                  {levers.map((l) => <Cell key={l.id} fill={STATUS_COL[l.status]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer></div>
            <div className="legend-row">
              {(Object.keys(STATUS_COL) as LeverStatus[]).map((s) => <span key={s}><span className="sw" style={{ background: STATUS_COL[s] }} />{s}</span>)}
            </div>
          </>)}
        </Card>

        <Card i={10} span="c6" icon="check" title={cat ? `${cat.system} ${cat.version} · credit categories` : 'Credit categories'}
          sub={cat ? `${cat.name} · target ${cat.targetLabel} (${cat.needed} ${cat.unit})` : 'Scorecard breakdown for a project'}>
          {!cat ? (
            <EmptyState compact icon={<Icon name="check" size={22} />} title="No scorecard yet" body="Give a project a category breakdown (LEED template included) to see secured vs likely points per category.">
              <button className="btn btn-out btn-sm" onClick={() => go('data')}>Open Data Manager</button>
            </EmptyState>
          ) : (<>
            <div style={{ flex: 1, minHeight: 30 + cat.categories!.length * 30 }}><ResponsiveContainer>
              <BarChart data={cat.categories!.map((c) => ({ ...c, open: Math.max(c.max - c.secured - c.likely, 0) }))} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barCategoryGap="24%">
                <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={136} tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip unit="pts" showTotal />} cursor={{ fill: 'var(--hover)' }} />
                <Bar name="Secured" dataKey="secured" stackId="c" fill="var(--acc)" animationDuration={900} />
                <Bar name="Likely" dataKey="likely" stackId="c" fill="var(--warn)" animationDuration={900} animationBegin={120} />
                <Bar name="Open" dataKey="open" stackId="c" fill="var(--border)" radius={[0, 4, 4, 0]} animationDuration={900} animationBegin={240} />
              </BarChart>
            </ResponsiveContainer></div>
            <div className="legend-row">
              <span><span className="sw" style={{ background: 'var(--acc)' }} />Secured</span>
              <span><span className="sw" style={{ background: 'var(--warn)' }} />Likely</span>
              <span><span className="sw" style={{ background: 'var(--border-strong)' }} />Open</span>
            </div>
            <div className={`insight${atRisk(cat) ? ' warn' : ''}`}><Icon name={atRisk(cat) ? 'alert' : 'check'} size={16} /><span>
              {onTrack(cat) ? <>Target met on secured credits alone.</>
                : !atRisk(cat) ? <><b>{cat.needed - cat.secured}</b> {cat.unit} still to secure; the <b>{cat.likely}</b> likely {cat.unit} cover it if they all land.</>
                : <>Even if every likely credit lands, you are <b>{cat.needed - cat.secured - cat.likely}</b> {cat.unit} short of {cat.targetLabel}. Look for more credits in the categories with the most open points.</>}
            </span></div>
          </>)}
        </Card>

        <Card i={11} span="c6" icon="building" title="Certification pipeline" sub="Projects by status">
          {hub.projects.length === 0 ? (
            <EmptyState compact icon={<Icon name="building" size={22} />} title="No projects tracked" body="Add your LEED, IGBC, GRIHA, EDGE, WELL and Fitwel projects to see what needs attention.">
              <button className="btn btn-pri btn-sm" onClick={() => go('data')}><Icon name="plus" size={14} />Add a project</button>
            </EmptyState>
          ) : (
            <>
            <div className="ring-wrap">
              <div style={{ position: 'relative', width: 168, height: 168, flexShrink: 0 }}>
                <ResponsiveContainer>
                  <PieChart><Pie data={pipe.filter((p) => p.value)} dataKey="value" innerRadius="66%" outerRadius="92%" paddingAngle={3} stroke="var(--surf)" strokeWidth={2} animationDuration={900}>
                    {pipe.filter((p) => p.value).map((d) => <Cell key={d.name} fill={d.fill} />)}</Pie>
                    <Tooltip content={<ChartTip unit="projects" title={() => 'Projects'} />} /></PieChart>
                </ResponsiveContainer>
                <div className="ring-lbl"><div><b>{hub.projects.length}</b><span>projects</span></div></div>
              </div>
              <div className="stack" style={{ gap: 9, flex: 1, minWidth: 0 }}>
                {pipe.map((p) => (
                  <div key={p.name} className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                    <span className="row" style={{ gap: 8 }}><span className="sw" style={{ background: p.fill }} />{p.name}</span><b className="num">{p.value}</b>
                  </div>
                ))}
                <div className="row" style={{ gap: 6, marginTop: 4 }}>{[...new Set(hub.projects.map((p) => p.system))].map((s) => <SysTag key={s} s={s} />)}</div>
              </div>
            </div>
            <div className="divider" />
            <div className="cell-sub" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Needs attention</div>
            {risk.length === 0 ? (
              <div className="insight"><Icon name="check" size={16} /><span>No project is short of its target, even counting only likely credits.</span></div>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {[...risk].sort((a, b) => (b.needed - b.secured - b.likely) - (a.needed - a.secured - a.likely)).map((p) => (
                  <div key={p.id} className="attn">
                    <SysTag s={p.system} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="cell-main" style={{ fontSize: '.85rem' }}>{p.name}</div>
                      <div className="cell-sub">{p.next || `${p.targetLabel} target`}</div>
                    </div>
                    <span className="badge b-fail" title="Shortfall even if all likely credits land">−{p.needed - p.secured - p.likely} {p.unit}</span>
                  </div>
                ))}
              </div>
            )}
            </>
          )}
        </Card>

        {hub.projects.length > 0 && (
          <section className="card rise c12" style={{ ['--i' as string]: 12 }}>
            <div className="card-hd">
              <span className="card-ic"><Icon name="file" size={17} /></span>
              <div><div className="t">Certification portfolio</div><div className="s">Secured (solid) and likely (striped) against the target marker</div></div>
              <div className="r"><button className="btn btn-ghost btn-sm" onClick={() => go('data')}>Edit projects<Icon name="arrowR" size={14} /></button></div>
            </div>
            <div className="tbl-wrap"><table>
              <thead><tr><th>Project</th><th>System</th><th>Target</th><th style={{ minWidth: 220 }}>Progress</th><th>Gap</th><th>Stage</th><th>Next action</th></tr></thead>
              <tbody>
                {[...hub.projects].sort((a, b) => Number(atRisk(b)) - Number(atRisk(a))).map((p) => (
                  <tr key={p.id}>
                    <td><div className="cell-main">{p.name}</div></td>
                    <td><div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}><SysTag s={p.system} /><span className="cell-sub">{p.version}</span></div></td>
                    <td>{p.targetLabel} <span className="cell-sub num">({p.needed}{p.unit === '%' ? '%' : ' pts'})</span></td>
                    <td><Meter p={p} /><div className="cell-sub num">{p.secured} secured · {p.likely} likely · {p.max} max</div></td>
                    <td>{onTrack(p) ? <span className="badge b-pass">✓ Met</span>
                      : <span className={`badge ${atRisk(p) ? 'b-fail' : 'b-warn'}`}>{atRisk(p) ? '⚠ ' : ''}{projectGap(p)} {p.unit} to go</span>}</td>
                    <td><span className={`badge ${STAGE_BADGE[p.stage]}`}>{p.stage}</span></td>
                    <td style={{ fontSize: '.83rem', maxWidth: 280 }}>{p.next || <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </section>
        )}
      </div>
    </div>
  );
};
export default CommandCenter;

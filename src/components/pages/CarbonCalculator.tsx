import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { useHub } from '../../context/HubContext';
import { useLCA } from '../../context/LCAContext';
import { uid, fmt, activityT, rollupActivities, s3Sum } from '../../utils/hub';
import { S3_CATEGORIES, DATA_QUALITY, type EmissionFactor, type Activity, type GhgYear, type DataQuality } from '../../types/hub';
import { OFFICIAL_SOURCES } from '../../data/officialSources';
import Modal from '../ui/Modal';
import Icon from '../ui/Icon';
import EmptyState from '../ui/EmptyState';
import Kpi from '../ui/Kpi';
import ChartTip from '../ui/ChartTip';
import { useToast } from '../ui/Toast';
import { Field, Num, Section, n, okNum } from './data/fields';
import FactorImport from './data/FactorImport';
import { PACKS, type OfficialPack } from '../../data/packs';
import type { Candidate } from '../../utils/factorImport';
import { ask } from '../../utils/platform';

type FD = { id: string; name: string; unit: string; kgPerUnit: string; scope: 1 | 2 | 3; s2basis: 'location' | 'market'; s3cat: string; source: string; official?: boolean; pack?: string; ref?: string; url?: string };
type AD = { id: string; year: string; factorId: string; description: string; quantity: string; site: string; quality: DataQuality };
type Tab = 'activities' | 'factors' | 'sources';
const TICK = { fontSize: 11, fill: 'var(--muted)' };
const SCOPE_COL = ['', 'var(--s1)', 'var(--s2)', 'var(--s3)'];
const Q_COL: Record<DataQuality, string> = { Measured: 'var(--acc)', Calculated: 'var(--info)', Estimated: 'var(--warn)' };

const CarbonCalculator: React.FC = () => {
  const { hub, dispatch } = useHub();
  const { dispatch: nav } = useLCA();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>(hub.factors.length ? 'activities' : 'sources');
  const [f, setF] = useState<FD | null>(null);
  const [a, setA] = useState<AD | null>(null);
  const [imp, setImp] = useState<string | null | undefined>(undefined);
  const [preset, setPreset] = useState<{ pack: OfficialPack; rows: Candidate[] } | null>(null);
  const [loadingPack, setLoadingPack] = useState('');
  const openPack = async (p: OfficialPack) => { setLoadingPack(p.id); try { setPreset({ pack: p, rows: await p.load() }); } catch (e) { toast(`Could not load pack: ${(e as Error).message}`, 'err'); } setLoadingPack(''); };
  const imported = (p: OfficialPack) => hub.factors.filter((f) => f.pack?.startsWith(p.publisher) && f.pack.includes(p.edition)).length;
  const [tried, setTried] = useState(false);
  const [fq, setFq] = useState('');
  const fac = (id: string) => hub.factors.find((x) => x.id === id);

  const years = [...new Set(hub.activities.map((x) => x.year))].sort((p, q) => p - q);
  const [yearSel, setYearSel] = useState<number | null>(null);
  const year = yearSel != null && years.includes(yearSel) ? yearSel : years[years.length - 1];
  const sites = [...new Set(hub.activities.map((x) => x.site?.trim()).filter(Boolean) as string[])].sort();
  const [site, setSite] = useState('');

  const acts = hub.activities.filter((x) => x.year === year && (!site || (x.site ?? '') === site));
  const sum = useMemo(() => {
    const r = { s1: 0, s2: 0, s2m: 0, s3: 0, q: { Measured: 0, Calculated: 0, Estimated: 0 } as Record<DataQuality, number> };
    for (const x of acts) {
      const ff = fac(x.factorId); const t = activityT(x, ff); if (!ff) continue;
      if (ff.scope === 1) r.s1 += t; else if (ff.scope === 3) r.s3 += t; else if (ff.s2basis === 'market') r.s2m += t; else r.s2 += t;
      if (!(ff.scope === 2 && ff.s2basis === 'market')) r.q[x.quality ?? 'Measured'] += t;
    }
    return r;
  }, [acts, hub.factors]); // eslint-disable-line react-hooks/exhaustive-deps
  const totLoc = sum.s1 + sum.s2 + sum.s3;
  const qTot = Object.values(sum.q).reduce((p, v) => p + v, 0);

  const bySource = useMemo(() => {
    const m = new Map<string, { name: string; value: number; scope: number }>();
    for (const x of acts) {
      const ff = fac(x.factorId); if (!ff || (ff.scope === 2 && ff.s2basis === 'market')) continue;
      const key = ff.name; const cur = m.get(key) ?? { name: ff.name.length > 44 ? ff.name.slice(0, 42) + '…' : ff.name, value: 0, scope: ff.scope };
      cur.value += activityT(x, ff); m.set(key, cur);
    }
    return [...m.values()].sort((p, q) => q.value - p.value).slice(0, 8);
  }, [acts, hub.factors]); // eslint-disable-line react-hooks/exhaustive-deps
  const bySite = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of hub.activities.filter((y) => y.year === year)) {
      const ff = fac(x.factorId); if (!ff || (ff.scope === 2 && ff.s2basis === 'market')) continue;
      const k = x.site?.trim() || 'Unassigned'; m.set(k, (m.get(k) ?? 0) + activityT(x, ff));
    }
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((p, q) => q.value - p.value);
  }, [hub.activities, hub.factors, year]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── forms ── */
  const fErr = f ? { name: !f.name.trim() && 'Required', unit: !f.unit.trim() && 'e.g. kWh, litre, kg', kg: !okNum(f.kgPerUnit) && 'Required, ≥ 0', source: !f.source.trim() && 'Cite publisher, dataset, edition and table' } : {};
  const aErr = a ? { year: !(Number.isInteger(n(a.year)) && n(a.year) >= 1990 && n(a.year) <= 2100) && 'Year 1990–2100', factor: !a.factorId && 'Pick a factor', qty: !okNum(a.quantity) && 'Required, ≥ 0' } : {};
  const saveF = () => {
    setTried(true);
    if (!f || Object.values(fErr).some(Boolean)) return;
    const item: EmissionFactor = { id: f.id, name: f.name.trim(), unit: f.unit.trim(), kgPerUnit: n(f.kgPerUnit), scope: f.scope,
      s2basis: f.scope === 2 ? f.s2basis : undefined, s3cat: f.scope === 3 && f.s3cat ? Number(f.s3cat) : undefined, source: f.source.trim(),
      official: f.official, pack: f.pack, ref: f.ref, url: f.url };
    dispatch({ type: 'UPSERT_FACTOR', item }); toast(`Saved factor ${item.name}`); setF(null); setTried(false);
  };
  const saveA = () => {
    setTried(true);
    if (!a || Object.values(aErr).some(Boolean)) return;
    const item: Activity = { id: a.id, year: n(a.year), factorId: a.factorId, description: a.description.trim(), quantity: n(a.quantity), site: a.site.trim() || undefined, quality: a.quality };
    dispatch({ type: 'UPSERT_ACTIVITY', item }); toast('Activity saved'); setA(null); setTried(false); setYearSel(item.year);
  };
  const newFactor = (source = '') => { setTried(false); setF({ id: uid(), name: '', unit: '', kgPerUnit: '', scope: 2, s2basis: 'location', s3cat: '', source }); };
  const newActivity = () => { setTried(false); setA({ id: uid(), year: String(year ?? hub.ghg[hub.ghg.length - 1]?.year ?? new Date().getFullYear() - 1), factorId: hub.factors[0]?.id ?? '', description: '', quantity: '', site: site, quality: 'Measured' }); };

  /* ── apply to inventory ── */
  const roll = rollupActivities(hub.activities, hub.factors);
  const has = (yr: number, sc: 1 | 2 | 3, mk?: boolean) => hub.activities.some((x) => {
    const ff = fac(x.factorId); return x.year === yr && ff?.scope === sc && (sc !== 2 || (ff.s2basis === 'market') === !!mk);
  });
  const apply = async (r: ReturnType<typeof rollupActivities>[number]) => {
    const cur = hub.ghg.find((g) => g.year === r.year);
    const s3acts = hub.activities.filter((x) => x.year === r.year && fac(x.factorId)?.scope === 3);
    const allCat = s3acts.length > 0 && s3acts.every((x) => fac(x.factorId)?.s3cat);
    const s3cats = allCat ? { ...(cur?.s3cats ?? {}), ...r.s3cats } : has(r.year, 3) ? undefined : cur?.s3cats;
    const row: GhgYear = {
      year: r.year, scope1: has(r.year, 1) ? r.scope1 : cur?.scope1 ?? 0, scope2: has(r.year, 2) ? r.scope2 : cur?.scope2 ?? 0,
      scope2m: has(r.year, 2, true) ? r.scope2m : cur?.scope2m ?? null,
      scope3: allCat ? s3Sum(s3cats) : has(r.year, 3) ? r.scope3 : cur?.scope3 ?? 0, s3cats, denom: cur?.denom,
    };
    if (cur && !(await ask(`Overwrite the scopes covered by your ${r.year} activities in the inventory with the calculated values?`))) return;
    dispatch({ type: 'UPSERT_GHG', row }); toast(`${r.year} inventory updated from activity data`);
  };

  const filteredF = hub.factors.filter((x) => !fq || `${x.name} ${x.unit} ${x.source}`.toLowerCase().includes(fq.toLowerCase()));
  const official = hub.factors.filter((x) => x.official).length;

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Carbon accounting</div>
          <div className="ph-title">Carbon Calculator</div>
          <div className="ph-sub">Activity data × official emission factors → Scope 1, 2 and 3. Works on its own, with or without certifications or LCA.</div>
        </div>
        <div className="ph-actions">
          {years.length > 0 && <label className="mini">Year <select value={year} onChange={(e) => setYearSel(Number(e.target.value))}>{[...years].reverse().map((y) => <option key={y}>{y}</option>)}</select></label>}
          {sites.length > 0 && <label className="mini">Site <select value={site} onChange={(e) => setSite(e.target.value)}><option value="">All sites</option>{sites.map((s) => <option key={s}>{s}</option>)}</select></label>}
          <button className="btn btn-out" onClick={() => newFactor()}><Icon name="plus" size={16} />Factor</button>
          <button className="btn btn-pri" disabled={!hub.factors.length} title={hub.factors.length ? '' : 'Add or import a factor first'} onClick={newActivity}><Icon name="plus" size={16} />Activity</button>
        </div>
      </div>

      {acts.length > 0 && (<>
        <div className="kpi-grid six">
          <Kpi i={0} icon="flame" tone="s1" label={`Scope 1 · ${year}`} value={fmt(sum.s1, 1)} unit="tCO₂e" foot="Fuels, refrigerants, fleet" />
          <Kpi i={1} icon="zap" tone="s2" label="Scope 2 · location" value={fmt(sum.s2, 1)} unit="tCO₂e" foot={sum.s2m ? `Market-based ${fmt(sum.s2m, 1)} t` : 'No market-based activities'} />
          <Kpi i={2} icon="link" tone="s3" label="Scope 3" value={fmt(sum.s3, 1)} unit="tCO₂e" foot={`${new Set(acts.map((x) => fac(x.factorId)?.s3cat).filter(Boolean)).size} categories tagged`} />
          <Kpi i={3} icon="pie" tone="pri" label={`Total${site ? ` · ${site}` : ''}`} value={fmt(totLoc, 1)} unit="tCO₂e" foot="Location-based Scope 2" />
          <Kpi i={4} icon="check" tone={qTot && sum.q.Measured / qTot >= 0.8 ? 'acc' : 'warn'} label="Measured data share" value={qTot ? `${((sum.q.Measured / qTot) * 100).toFixed(0)}%` : '—'}
            foot={<div className="qbar">{DATA_QUALITY.map((k) => <span key={k} title={`${k}: ${fmt(sum.q[k], 1)} t`} style={{ width: `${qTot ? (sum.q[k] / qTot) * 100 : 0}%`, background: Q_COL[k] }} />)}</div>} />
          <Kpi i={5} icon="clipboard" tone={official === hub.factors.length ? 'acc' : 'warn'} label="Factors from official files" value={`${official}/${hub.factors.length}`} foot={official === hub.factors.length ? 'Every factor traceable' : 'Some factors entered by hand'} />
        </div>
        <div className="hub-grid" style={{ marginBottom: 16 }}>
          <section className="card rise c7" style={{ ['--i' as string]: 6 }}>
            <div className="card-hd"><span className="card-ic"><Icon name="chart" size={17} /></span><div><div className="t">Biggest emission sources · {year}</div><div className="s">tCO₂e, location-based · coloured by scope</div></div></div>
            <div style={{ height: 40 + bySource.length * 34 }}><ResponsiveContainer>
              <BarChart data={bySource} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap="22%">
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={220} tick={TICK} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--hover)' }} />
                <Bar name="Emissions" dataKey="value" radius={[0, 5, 5, 0]} animationDuration={900}>{bySource.map((b, k) => <Cell key={k} fill={SCOPE_COL[b.scope]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer></div>
          </section>
          <section className="card rise c5" style={{ ['--i' as string]: 7 }}>
            <div className="card-hd"><span className="card-ic"><Icon name="building" size={17} /></span><div><div className="t">By site · {year}</div><div className="s">Organisational boundary breakdown</div></div></div>
            {bySite.length <= 1 && bySite[0]?.name === 'Unassigned' ? (
              <EmptyState compact icon={<Icon name="building" size={22} />} title="No sites assigned" body="Give activities a site (building, campus or facility) to compare them and check your boundary." />
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                {bySite.map((s) => (
                  <div key={s.name}>
                    <div className="row" style={{ justifyContent: 'space-between', fontSize: '.84rem' }}><span className="cell-main" style={{ fontWeight: 500 }}>{s.name}</span><b className="num">{fmt(s.value, 1)} t</b></div>
                    <div className="prog"><div className="prog-fill" style={{ width: `${(s.value / bySite[0].value) * 100}%` }} /></div>
                  </div>))}
              </div>
            )}
          </section>
        </div>
      </>)}

      <div className="tabs" role="tablist">
        {([['activities', 'Activity data', 'layers', hub.activities.length], ['factors', 'Emission factors', 'calc', hub.factors.length], ['sources', 'Official sources', 'clipboard', OFFICIAL_SOURCES.length]] as const).map(([id, label, icon, c]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}><Icon name={icon} size={15} />{label}<span className="count">{c}</span></button>
        ))}
      </div>

      {tab === 'sources' && (<>
        <Section title="Ready-to-use official packs" sub="Read from the publishers' own documents with edition and table/row references. Nothing is used until you pick rows and import them.">
          <div className="pack-grid">
            {PACKS.map((p) => (
              <div key={p.id} className="pack">
                <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                  <div><div className="cell-main">{p.title}</div><div className="cell-sub">{p.publisher}</div></div>
                  <span className="badge b-pri">{p.count}</span>
                </div>
                <div className="cell-sub" style={{ marginTop: 6 }}><b>{p.edition}</b> · {p.published}</div>
                <div className="cell-sub" style={{ fontSize: '.78rem', marginTop: 6, lineHeight: 1.45 }}>{p.note}</div>
                <div className="row" style={{ marginTop: 'auto', paddingTop: 12 }}>
                  <a className="btn btn-ghost btn-sm" href={p.url} target="_blank" rel="noreferrer">Source ↗</a>
                  <span className="grow" />
                  {imported(p) > 0 && <span className="badge b-pass">{imported(p)} in library</span>}
                  <button className="btn btn-pri btn-sm" disabled={loadingPack === p.id} onClick={() => openPack(p)}><Icon name="search" size={14} />{loadingPack === p.id ? 'Loading…' : 'Browse & import'}</button>
                </div>
              </div>
            ))}
          </div>
        </Section>
        <div className="sec-title" style={{ marginTop: 8 }}>Other official sources (import their files)</div>
        <div className="src-grid">
          {OFFICIAL_SOURCES.map((s, i) => (
            <section key={s.id} className="card rise src-card" style={{ ['--i' as string]: i }}>
              <div>
                <div className="cell-sub" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.region}</div>
                <div className="t" style={{ fontWeight: 650, marginTop: 2 }}>{s.dataset}</div><div className="cell-sub">{s.publisher}</div>
              </div>
              <div className="src-row"><b>Updates</b><span>{s.cadence}</span></div>
              <div className="src-row"><b>Covers</b><span>{s.covers}</span></div>
              <div className="src-row"><b>Download</b><span>{s.file}</span></div>
              <div className="src-row"><b>How to use</b><span>{s.howTo}</span></div>
              <div className="row" style={{ marginTop: 'auto', paddingTop: 12 }}>
                <a className="btn btn-ghost btn-sm" href={s.url} target="_blank" rel="noreferrer">Publisher site ↗</a>
                <span className="grow" />
                {s.mode === 'manual'
                  ? <><button className="btn btn-out btn-sm" onClick={() => setImp(s.id)}><Icon name="upload" size={14} />Import</button>
                      <button className="btn btn-pri btn-sm" onClick={() => newFactor(`${s.publisher} – ${s.dataset}, [version/edition], [table/page]`)}><Icon name="plus" size={14} />Enter value</button></>
                  : <button className="btn btn-pri btn-sm" onClick={() => setImp(s.id)}><Icon name="upload" size={14} />Import file</button>}
              </div>
            </section>
          ))}
        </div>
      </>)}

      {tab === 'factors' && (
        <Section title="Emission factor library" sub="kgCO₂e per activity unit. Official = read from a publisher file and unchanged since import."
          actions={<>
            <div className="inp-ic"><Icon name="search" size={14} /><input className="inp sm" placeholder="Search factors" value={fq} onChange={(e) => setFq(e.target.value)} /></div>
            <button className="btn btn-out btn-sm" onClick={() => setImp(null)}><Icon name="upload" size={14} />Import official file</button>
            <button className="btn btn-pri btn-sm" onClick={() => newFactor()}><Icon name="plus" size={14} />Add factor</button>
          </>}>
          {hub.factors.length === 0 ? (
            <EmptyState compact icon={<Icon name="calc" size={22} />} title="No factors yet" body="Import from an official source (Official sources tab), or enter one by hand with its citation.">
              <button className="btn btn-pri btn-sm" onClick={() => setTab('sources')}>Browse official sources</button>
            </EmptyState>
          ) : (
            <div className="tbl-wrap"><table>
              <thead><tr><th>Factor</th><th>Scope</th><th className="num">kgCO₂e / unit</th><th>Source</th><th className="num">Used</th><th /></tr></thead>
              <tbody>{filteredF.map((x) => {
                const used = hub.activities.filter((y) => y.factorId === x.id).length;
                return (
                  <tr key={x.id}>
                    <td><div className="cell-main">{x.name}</div>{x.official ? <span className="badge b-pass" style={{ marginTop: 3 }}>✓ Official · {x.pack}</span> : <span className="badge b-na" style={{ marginTop: 3 }}>Manual entry</span>}</td>
                    <td><span className="badge b-na">S{x.scope}{x.scope === 2 ? ` · ${x.s2basis}` : x.scope === 3 && x.s3cat ? ` · Cat ${x.s3cat}` : ''}</span></td>
                    <td className="num">{x.kgPerUnit.toLocaleString('en-US', { maximumSignificantDigits: 8 })} <span className="cell-sub">/ {x.unit}</span></td>
                    <td className="cell-sub" style={{ maxWidth: 320 }}>{x.source}{x.url && <> · <a href={x.url} target="_blank" rel="noreferrer">link ↗</a></>}</td>
                    <td className="num">{used}</td>
                    <td><div className="row-actions">
                      <button className="icon-btn sm" aria-label={`Edit ${x.name}`} onClick={() => { setTried(false); setF({ ...x, kgPerUnit: String(x.kgPerUnit), s2basis: x.s2basis ?? 'location', s3cat: x.s3cat ? String(x.s3cat) : '' }); }}><Icon name="edit" size={15} /></button>
                      <button className="icon-btn sm danger" aria-label={`Delete ${x.name}`} onClick={async () => { if (await ask(used ? `Delete ${x.name} and its ${used} activit${used > 1 ? 'ies' : 'y'}?` : `Delete ${x.name}?`)) { dispatch({ type: 'DELETE_FACTOR', id: x.id }); toast('Factor deleted', 'info'); } }}><Icon name="trash" size={15} /></button>
                    </div></td>
                  </tr>);
              })}</tbody>
            </table></div>
          )}
        </Section>
      )}

      {tab === 'activities' && (<>
        <Section title="Activity data" sub="Metered or invoiced quantities. Quantity × factor ÷ 1000 = tCO₂e."
          actions={<button className="btn btn-pri btn-sm" disabled={!hub.factors.length} onClick={newActivity}><Icon name="plus" size={14} />Add activity</button>}>
          {hub.activities.length === 0 ? (
            <EmptyState compact icon={<Icon name="layers" size={22} />} title="No activity data yet"
              body={hub.factors.length ? 'Enter annual kWh per site, litres of diesel for DG sets, kg of refrigerant topped up, travel distances and so on.' : 'Start by importing factors from an official source.'}>
              {hub.factors.length ? <button className="btn btn-pri btn-sm" onClick={newActivity}><Icon name="plus" size={14} />Add first activity</button>
                : <button className="btn btn-pri btn-sm" onClick={() => setTab('sources')}>Browse official sources</button>}
            </EmptyState>
          ) : (
            <div className="tbl-wrap"><table>
              <thead><tr><th>Year</th><th>Site</th><th>Activity</th><th>Factor</th><th className="num">Quantity</th><th className="num">tCO₂e</th><th>Data</th><th /></tr></thead>
              <tbody>{[...hub.activities].filter((x) => !site || (x.site ?? '') === site).sort((p, q) => q.year - p.year).map((x) => {
                const ff = fac(x.factorId);
                return (
                  <tr key={x.id}>
                    <td>{x.year}</td><td className="cell-sub">{x.site || '—'}</td>
                    <td className="cell-main">{x.description || <span className="muted">—</span>}</td>
                    <td><span className="cell-sub">{ff?.name} · S{ff?.scope}{ff?.official ? ' · ✓' : ''}</span></td>
                    <td className="num">{fmt(x.quantity, 2)} <span className="cell-sub">{ff?.unit}</span></td>
                    <td className="num"><b>{fmt(activityT(x, ff), 2)}</b></td>
                    <td><span className="row" style={{ gap: 5 }}><span className="sw" style={{ background: Q_COL[x.quality ?? 'Measured'] }} /><span className="cell-sub">{x.quality ?? 'Measured'}</span></span></td>
                    <td><div className="row-actions">
                      <button className="icon-btn sm" aria-label="Edit activity" onClick={() => { setTried(false); setA({ ...x, year: String(x.year), quantity: String(x.quantity), site: x.site ?? '', quality: x.quality ?? 'Measured' }); }}><Icon name="edit" size={15} /></button>
                      <button className="icon-btn sm" aria-label="Duplicate activity" title="Duplicate (e.g. for next year)" onClick={() => { setTried(false); setA({ ...x, id: uid(), year: String(x.year + 1), quantity: '', site: x.site ?? '', quality: x.quality ?? 'Measured' }); }}><Icon name="copy" size={15} /></button>
                      <button className="icon-btn sm danger" aria-label="Delete activity" onClick={() => { dispatch({ type: 'DELETE_ACTIVITY', id: x.id }); toast('Activity deleted', 'info'); }}><Icon name="trash" size={15} /></button>
                    </div></td>
                  </tr>);
              })}</tbody>
            </table></div>
          )}
        </Section>
        {roll.length > 0 && (
          <Section title="Send totals to the inventory" sub="Updates only the scopes each year's activities cover; other scopes keep their current values. Then see them on the Command Center, Strategy and Disclosures pages.">
            <div className="tbl-wrap"><table>
              <thead><tr><th>Year</th><th className="num">Scope 1</th><th className="num">S2 location</th><th className="num">S2 market</th><th className="num">Scope 3</th><th className="num">Activities</th><th /></tr></thead>
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
            <div className="row" style={{ marginTop: 12 }}><button className="btn btn-ghost btn-sm" onClick={() => nav({ type: 'SET_PAGE', page: 'strategy' })}>Build a decarbonisation strategy from this<Icon name="arrowR" size={14} /></button></div>
          </Section>
        )}
      </>)}

      {preset && <FactorImport preset={preset} onClose={() => { setPreset(null); setTab('factors'); }} />}
      {imp !== undefined && <FactorImport sourceId={imp ?? undefined} onClose={() => { setImp(undefined); setTab('factors'); }} />}
      {f && (
        <Modal title={hub.factors.some((x) => x.id === f.id) ? 'Edit factor' : 'Add emission factor'} onClose={() => setF(null)}
          footer={<><button className="btn btn-out" onClick={() => setF(null)}>Cancel</button><button className="btn btn-pri" onClick={saveF}><Icon name="save" size={15} />Save</button></>}>
          {f.official && <div className="notice"><Icon name="alert" size={16} /><span className="grow">This factor was imported from <b>{f.pack}</b> ({f.ref}). Changing the value will remove its official tag.</span></div>}
          <form className="form-grid" onSubmit={(e) => { e.preventDefault(); saveF(); }}>
            <Field label="Name" className="span2" error={tried && fErr.name}><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Grid electricity – India FY2024-25" /></Field>
            <Field label="Scope"><select value={f.scope} onChange={(e) => setF({ ...f, scope: Number(e.target.value) as 1 | 2 | 3 })}><option value={1}>Scope 1</option><option value={2}>Scope 2</option><option value={3}>Scope 3</option></select></Field>
            {f.scope === 2 && <Field label="Scope 2 basis"><select value={f.s2basis} onChange={(e) => setF({ ...f, s2basis: e.target.value as 'location' | 'market' })}><option value="location">Location-based</option><option value="market">Market-based</option></select></Field>}
            {f.scope === 3 && <Field label="Scope 3 category"><select value={f.s3cat} onChange={(e) => setF({ ...f, s3cat: e.target.value })}><option value="">Not specified</option>{S3_CATEGORIES.map((c) => <option key={c.n} value={c.n}>{c.n}. {c.name}</option>)}</select></Field>}
            <Field label="Activity unit" error={tried && fErr.unit}><input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} placeholder="kWh" /></Field>
            <Field label="kgCO₂e per unit" error={tried && fErr.kg} hint="tCO₂/MWh = kgCO₂/kWh"><Num value={f.kgPerUnit} step={0.000001} onChange={(v) => setF({ ...f, kgPerUnit: v })} invalid={tried && !!fErr.kg} /></Field>
            <Field label="Source" className="full" error={tried && fErr.source} hint="Publisher, dataset, version/edition, table or page"><input value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} /></Field>
            <button type="submit" hidden />
          </form>
        </Modal>
      )}
      {a && (
        <Modal title={hub.activities.some((x) => x.id === a.id) ? 'Edit activity' : 'Add activity'} onClose={() => setA(null)}
          footer={<><button className="btn btn-out" onClick={() => setA(null)}>Cancel</button><button className="btn btn-pri" onClick={saveA}><Icon name="save" size={15} />Save</button></>}>
          <form className="form-grid" onSubmit={(e) => { e.preventDefault(); saveA(); }}>
            <Field label="Year" error={tried && aErr.year}><Num value={a.year} onChange={(v) => setA({ ...a, year: v })} invalid={tried && !!aErr.year} label="Year" /></Field>
            <Field label="Site / facility" hint="Within your reporting boundary"><input value={a.site} list="sites-dl" onChange={(e) => setA({ ...a, site: e.target.value })} placeholder="e.g. Pune HQ" />
              <datalist id="sites-dl">{sites.map((s) => <option key={s} value={s} />)}</datalist></Field>
            <Field label="Data quality"><select value={a.quality} onChange={(e) => setA({ ...a, quality: e.target.value as DataQuality })}>{DATA_QUALITY.map((q) => <option key={q}>{q}</option>)}</select></Field>
            <Field label="Emission factor" className="full" error={tried && aErr.factor}><select value={a.factorId} onChange={(e) => setA({ ...a, factorId: e.target.value })}>
              {hub.factors.map((x) => <option key={x.id} value={x.id}>{x.official ? '✓ ' : ''}{x.name} (S{x.scope}, per {x.unit}){x.pack ? ` — ${x.pack}` : ''}</option>)}</select></Field>
            <Field label={`Quantity${fac(a.factorId) ? ` (${fac(a.factorId)!.unit})` : ''}`} error={tried && aErr.qty}
              hint={okNum(a.quantity) && fac(a.factorId) ? `= ${fmt((n(a.quantity) * fac(a.factorId)!.kgPerUnit) / 1000, 3)} tCO₂e` : undefined}>
              <Num value={a.quantity} step={0.01} onChange={(v) => setA({ ...a, quantity: v })} invalid={tried && !!aErr.qty} label="Quantity" /></Field>
            <Field label="Description" className="span2"><input value={a.description} onChange={(e) => setA({ ...a, description: e.target.value })} placeholder="e.g. Annual meter total, MSEDCL bills Apr–Mar" /></Field>
            <button type="submit" hidden />
          </form>
        </Modal>
      )}
    </div>
  );
};
export default CarbonCalculator;

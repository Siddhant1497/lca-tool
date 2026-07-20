import React, { useState } from 'react';
import { useLCA } from '../../context/LCAContext';
import { IMPACT_META, STAGE_META, LIFECYCLE_STAGES, PHASE_COLORS } from '../../types/lca';
import type { ImpactValues } from '../../types/lca';
import { formatGWP, formatImpact, percentDiff } from '../../utils/lcaCalculator';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend } from 'recharts';

const KEYS = Object.keys(IMPACT_META) as (keyof ImpactValues)[];

const LCAResults: React.FC = () => {
  const { results, baselineResults } = useLCA();
  const [activeK, setActiveK] = useState<keyof ImpactValues>('GWP');
  const [tab, setTab] = useState<'overview'|'stage'|'materials'|'component'|'baseline'>('overview');

  if (!results) return (
    <div>
      <div className="ph"><div className="ph-title">LCA Results</div></div>
      <div className="card"><div className="empty"><div className="icon">📊</div><h3>No results yet</h3><p>Add materials in the Material Inventory to generate LCA results.</p></div></div>
    </div>
  );

  const stageData = LIFECYCLE_STAGES.filter((s) => results.byStage[s]).map((s) => ({
    stage: s, label: STAGE_META[s].label.slice(0,18), value: results.byStage[s]![activeK], phase: STAGE_META[s].phase,
  }));

  const compData = Object.entries(results.byComponent)
    .map(([n, v]) => ({ name: n.length > 22 ? n.slice(0,20)+'…' : n, value: v[activeK] }))
    .sort((a,b) => b.value - a.value).slice(0,10);

  const diff = baselineResults ? percentDiff(baselineResults.total, results.total) : null;

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-title">LCA Results</div>
          <div className="ph-sub">Total: {formatGWP(results.total.GWP)} · {results.perM2.GWP.toFixed(0)} kg CO₂/m² · {results.perM2PerYear.GWP.toFixed(3)} kg CO₂/m²/yr</div>
        </div>
      </div>

      {/* Impact selector buttons */}
      <div className="row" style={{ marginBottom: '18px' }}>
        {KEYS.map((k) => (
          <button key={k} className={`btn btn-sm ${activeK === k ? 'btn-pri' : 'btn-out'}`}
            onClick={() => setActiveK(k)}
            style={activeK === k ? { background: IMPACT_META[k].color, borderColor: IMPACT_META[k].color } : {}}>
            {IMPACT_META[k].label.split(' ').slice(0,2).join(' ')}
          </button>
        ))}
      </div>

      <div className="tabs">
        {(['overview','stage','materials','component','baseline'] as const).map((t) => (
          <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
            {t==='baseline' && !baselineResults && <span style={{ fontSize:'.7rem', marginLeft:'3px' }}>(no data)</span>}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="stack">
          <div className="kpi-grid">
            {KEYS.map((k) => (
              <div className="kpi" key={k} style={{ borderTop: `3px solid ${IMPACT_META[k].color}` }}>
                <div className="kpi-lbl">{IMPACT_META[k].label}</div>
                <div className="kpi-val" style={{ fontSize:'1.1rem', color: IMPACT_META[k].color }}>
                  {k==='ODP' ? results.total[k].toExponential(2) : formatImpact(results.total[k], k)}
                </div>
                <div className="kpi-sub">{IMPACT_META[k].unit}</div>
              </div>
            ))}
          </div>

          {results.operationalCarbon > 0 && (
            <div className="card">
              <div className="card-title">⚡ Embodied vs. Operational Carbon</div>
              <div className="row" style={{ gap: '24px', flexWrap: 'wrap' }}>
                {[
                  { lbl: 'Embodied Carbon', val: results.embodiedCarbon, col: '#3B82F6' },
                  { lbl: 'Operational B6', val: results.operationalCarbon, col: '#10B981' },
                  { lbl: 'Whole-Life GWP', val: results.total.GWP, col: '#1D4ED8' },
                ].map((x) => (
                  <div key={x.lbl} style={{ flex: '1', minWidth: '150px' }}>
                    <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: '3px' }}>{x.lbl}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: x.col }}>{formatGWP(x.val)}</div>
                    <div style={{ fontSize: '.76rem', color: 'var(--muted)' }}>
                      {results.total.GWP > 0 ? `${((x.val/results.total.GWP)*100).toFixed(1)}%` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-title">📊 {IMPACT_META[activeK].label} by Life Cycle Phase</div>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(results.byPhase).map(([ph,v]) => ({
                  name: ph[0].toUpperCase()+ph.slice(1), value: v[activeK], fill: PHASE_COLORS[ph]??'#94A3B8',
                }))} margin={{ top:5, right:5, left:0, bottom:0 }}>
                  <XAxis dataKey="name" tick={{ fontSize:11 }} />
                  <YAxis tick={{ fontSize:10 }} width={65} />
                  <Tooltip formatter={(v:number) => [`${v.toFixed(6)} ${IMPACT_META[activeK].unit}`, IMPACT_META[activeK].label]} />
                  <Bar dataKey="value" radius={[3,3,0,0]}>
                    {Object.entries(results.byPhase).map(([ph],i) => <Cell key={i} fill={PHASE_COLORS[ph]??'#94A3B8'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── BY STAGE ── */}
      {tab === 'stage' && (
        <div className="stack">
          <div className="card">
            <div className="card-title">📅 {IMPACT_META[activeK].label} by Life Cycle Stage</div>
            <div className="chart" style={{ height: '340px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} margin={{ top:5, right:5, left:0, bottom:40 }}>
                  <XAxis dataKey="stage" tick={{ fontSize:10 }} angle={-40} textAnchor="end" />
                  <YAxis tick={{ fontSize:10 }} width={65} />
                  <Tooltip formatter={(v:number) => [`${v.toFixed(6)} ${IMPACT_META[activeK].unit}`]} />
                  <Bar dataKey="value" radius={[3,3,0,0]}>
                    {stageData.map((d,i) => <Cell key={i} fill={PHASE_COLORS[d.phase]??'#94A3B8'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <div className="card-title">📋 Stage-by-Stage Breakdown</div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Stage</th><th>Description</th><th>GWP (kg CO₂ eq)</th><th>AP (kg SO₂ eq)</th><th>ADP Fossil (MJ)</th></tr></thead>
                <tbody>
                  {LIFECYCLE_STAGES.filter((s) => results.byStage[s]).map((s) => {
                    const v = results.byStage[s]!;
                    return (
                      <tr key={s}>
                        <td><span className="badge b-info">{s}</span></td>
                        <td>{STAGE_META[s].label}</td>
                        <td className="mono" style={{ color: v.GWP<0?'var(--acc)':undefined }}>{v.GWP.toFixed(2)}</td>
                        <td className="mono">{v.AP.toFixed(4)}</td>
                        <td className="mono">{v.ADP_fossil.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ fontWeight:700, background:'var(--bg)' }}>
                    <td colSpan={2}>TOTAL</td>
                    <td className="mono">{results.total.GWP.toFixed(2)}</td>
                    <td className="mono">{results.total.AP.toFixed(4)}</td>
                    <td className="mono">{results.total.ADP_fossil.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── BY MATERIAL ── */}
      {tab === 'materials' && (
        <div className="card">
          <div className="card-title">🧱 Material-Level Breakdown</div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>#</th><th>Material</th><th>Component</th><th>Stage</th><th>Qty</th><th>GWP (kg CO₂)</th><th>% GWP</th><th>AP</th><th>ADP (MJ)</th></tr></thead>
              <tbody>
                {results.byMaterial.map((b,i) => (
                  <tr key={b.entryId}>
                    <td className="muted">{i+1}</td>
                    <td style={{ fontWeight:600 }}>{b.name}</td>
                    <td>{b.component}</td>
                    <td><span className="badge b-info">{b.stage}</span></td>
                    <td className="mono">{b.quantity.toLocaleString()} {b.unit}</td>
                    <td className="mono" style={{ color: b.impacts.GWP<0?'var(--acc)':undefined }}>{b.impacts.GWP.toFixed(2)}</td>
                    <td>
                      <div className="row" style={{ gap:'6px' }}>
                        <div className="prog" style={{ width:'70px' }}>
                          <div className="prog-fill" style={{ width:`${Math.min(Math.abs(b.percentOfTotal),100)}%`, background: b.impacts.GWP<0?'var(--acc)':'var(--pri)' }} />
                        </div>
                        <span className="mono" style={{ fontSize:'.78rem' }}>{b.percentOfTotal.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="mono">{b.impacts.AP.toFixed(5)}</td>
                    <td className="mono">{b.impacts.ADP_fossil.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BY COMPONENT ── */}
      {tab === 'component' && (
        <div className="stack">
          <div className="card">
            <div className="card-title">🏗️ {IMPACT_META[activeK].label} by Building Component</div>
            <div className="chart" style={{ height:'340px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compData} layout="vertical" margin={{ top:0, right:20, left:130, bottom:0 }}>
                  <XAxis type="number" tick={{ fontSize:10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:10 }} width={125} />
                  <Tooltip formatter={(v:number) => [`${v.toFixed(4)} ${IMPACT_META[activeK].unit}`]} />
                  <Bar dataKey="value" fill="#3B82F6" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <div className="card-title">📋 All Impact Categories by Component</div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Component</th><th>GWP</th><th>ODP</th><th>AP</th><th>EP</th><th>POCP</th><th>ADP</th></tr></thead>
                <tbody>
                  {Object.entries(results.byComponent).sort(([,a],[,b]) => b.GWP - a.GWP).map(([comp,v]) => (
                    <tr key={comp}>
                      <td style={{ fontWeight:600 }}>{comp}</td>
                      <td className="mono">{v.GWP.toFixed(2)}</td>
                      <td className="mono">{v.ODP.toExponential(2)}</td>
                      <td className="mono">{v.AP.toFixed(4)}</td>
                      <td className="mono">{v.EP.toFixed(5)}</td>
                      <td className="mono">{v.POCP.toFixed(5)}</td>
                      <td className="mono">{v.ADP_fossil.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── BASELINE ── */}
      {tab === 'baseline' && (
        !baselineResults ? (
          <div className="card"><div className="empty"><div className="icon">📐</div><h3>No baseline defined</h3><p>Go to Materials → Baseline tab to add baseline materials for comparison.</p></div></div>
        ) : (
          <div className="stack">
            <div className="card">
              <div className="card-title">📊 Proposed vs. Baseline – All Impact Categories</div>
              <div className="tbl-wrap">
                <table>
                  <thead><tr><th>Impact Category</th><th>Unit</th><th>Baseline</th><th>Proposed</th><th>Change</th><th>LEED 10% Target</th></tr></thead>
                  <tbody>
                    {KEYS.map((k) => {
                      const d = diff?.[k] ?? 0;
                      return (
                        <tr key={k}>
                          <td><span className="row" style={{ gap:'5px' }}><span className="dot" style={{ background: IMPACT_META[k].color }} />{IMPACT_META[k].label}</span></td>
                          <td className="mono muted">{IMPACT_META[k].unit}</td>
                          <td className="mono">{k==='ODP' ? baselineResults.total[k].toExponential(2) : baselineResults.total[k].toFixed(4)}</td>
                          <td className="mono">{k==='ODP' ? results.total[k].toExponential(2) : results.total[k].toFixed(4)}</td>
                          <td style={{ fontWeight:600, color: d<0?'var(--acc)':d>0?'var(--err)':undefined }}>{d>0?'+':''}{(d*100).toFixed(1)}%</td>
                          <td><span className={`badge ${d<=-0.10?'b-pass':'b-fail'}`}>{d<=-0.10?'✓ Meets':'✗ Short'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <div className="card-title">🕸️ Radar – Proposed vs. Baseline</div>
              <div className="chart" style={{ height:'320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={KEYS.map((k) => ({ subject: IMPACT_META[k].label.split(' ').slice(0,2).join(' '), proposed: results.total[k], baseline: baselineResults.total[k] }))}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize:10 }} />
                    <Radar name="Proposed" dataKey="proposed" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} />
                    <Radar name="Baseline" dataKey="baseline" stroke="#EF4444" fill="#EF4444" fillOpacity={0.15} />
                    <Legend /><Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
export default LCAResults;

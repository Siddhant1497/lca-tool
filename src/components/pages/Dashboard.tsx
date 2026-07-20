import React from 'react';
import { useLCA } from '../../context/LCAContext';
import { formatGWP } from '../../utils/lcaCalculator';
import { IMPACT_META, PHASE_COLORS } from '../../types/lca';
import { EMBODIED_CARBON_BENCHMARKS } from '../../data/standards';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

const PIE_COLORS = ['#3B82F6','#EF4444','#F59E0B','#10B981','#8B5CF6','#6B7280','#EC4899'];

const Dashboard: React.FC = () => {
  const { state, dispatch, results, complianceResults } = useLCA();
  const { project, materialEntries } = state;
  const hasData = results !== null;

  const bm = project ? (EMBODIED_CARBON_BENCHMARKS[project.buildingType] ?? EMBODIED_CARBON_BENCHMARKS.other) : null;
  const gwpM2 = results?.perM2.GWP ?? 0;
  const bmPct = bm && gwpM2 > 0 ? Math.min((gwpM2 / bm.high) * 100, 120) : 0;

  const phaseData = hasData
    ? Object.entries(results!.byPhase).map(([ph, v]) => ({
        name: ph[0].toUpperCase() + ph.slice(1), gwp: Math.round(v.GWP),
        fill: PHASE_COLORS[ph] ?? '#94A3B8',
      }))
    : [];

  const pieData = hasData
    ? results!.byMaterial.slice(0, 7).map((b, i) => ({
        name: b.name.length > 20 ? b.name.slice(0, 18) + '…' : b.name,
        value: Math.max(b.impacts.GWP, 0), fill: PIE_COLORS[i % PIE_COLORS.length],
      }))
    : [];

  const leed = complianceResults.find((r) => r.standard === 'LEED_v4_MRc1');
  const en = complianceResults.find((r) => r.standard === 'EN_15978');

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-title">Dashboard</div>
          <div className="ph-sub">
            {project?.name} · {project?.buildingType.replace(/_/g,' ')} · {project?.grossFloorArea?.toLocaleString()} m² · {project?.lifespan} yr RSP
          </div>
        </div>
        <div className="ph-actions">
          <button className="btn btn-pri" onClick={() => dispatch({ type: 'SET_PAGE', page: 'materials' })}>＋ Add Materials</button>
          {hasData && <button className="btn btn-out" onClick={() => dispatch({ type: 'SET_PAGE', page: 'results' })}>📊 Results</button>}
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        {[
          { lbl: 'Total GWP (A–D)', val: hasData ? formatGWP(results!.total.GWP) : '—', sub: 'Global Warming Potential', col: '#DC2626' },
          { lbl: 'Embodied Carbon', val: hasData ? `${results!.perM2.GWP.toFixed(0)} kg/m²` : '—', sub: 'Per m² GFA', col: '#1D4ED8' },
          { lbl: 'GWP Intensity', val: hasData ? `${results!.perM2PerYear.GWP.toFixed(3)} kg/m²/yr` : '—', sub: 'Annual intensity', col: '#059669' },
          { lbl: 'Material Entries', val: String(materialEntries.length), sub: `${new Set(materialEntries.map(e=>e.component)).size} components`, col: '#6B7280' },
          { lbl: 'LEED v4 MRc1', val: leed ? `${leed.creditPoints ?? 0}/3 pts` : '—', sub: leed?.summary ?? 'No data', col: leed?.compliant ? '#059669' : '#DC2626' },
          { lbl: 'EN 15978', val: en ? (en.compliant ? 'Compliant' : 'Action Req.') : '—', sub: en?.summary ?? 'No data', col: en?.compliant ? '#059669' : '#DC2626' },
        ].map((k) => (
          <div className="kpi" key={k.lbl}>
            <div className="kpi-lbl">{k.lbl}</div>
            <div className="kpi-val" style={{ color: k.col }}>{k.val}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {!hasData ? (
        <div className="card">
          <div className="empty">
            <div className="icon">🧱</div>
            <h3>No materials added yet</h3>
            <p>Add building materials to your inventory to see LCA results, phase breakdowns, and compliance status.</p>
            <button className="btn btn-pri" onClick={() => dispatch({ type: 'SET_PAGE', page: 'materials' })}>＋ Add First Material</button>
          </div>
        </div>
      ) : (
        <>
          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div className="card">
              <div className="card-title">📊 GWP by Life Cycle Phase</div>
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={phaseData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} width={55} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip formatter={(v: number) => [`${v.toLocaleString()} kg CO₂ eq`, 'GWP']} />
                    <Bar dataKey="gwp" radius={[3, 3, 0, 0]}>
                      {phaseData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card">
              <div className="card-title">🧱 Top Materials by GWP</div>
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="48%" outerRadius={85} dataKey="value"
                      label={({ percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v.toLocaleString()} kg CO₂ eq`, 'GWP']} />
                    <Legend iconSize={9} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Benchmark */}
          {bm && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">📏 Embodied Carbon Benchmark</div>
              <div className="muted" style={{ fontSize: '.84rem', marginBottom: '10px' }}>
                Typical range for {project?.buildingType.replace(/_/g,' ')} buildings (kg CO₂ eq/m² GFA, A1-A3)
              </div>
              <div className="row" style={{ marginBottom: '6px' }}>
                <span style={{ fontSize: '1.3rem', fontWeight: 700, color: bmPct > 100 ? 'var(--err)' : bmPct > 60 ? 'var(--warn)' : 'var(--acc)' }}>
                  {gwpM2.toFixed(0)} kg CO₂/m²
                </span>
                <span className={`badge ${bmPct > 100 ? 'b-fail' : bmPct > 60 ? 'b-warn' : 'b-pass'}`}>
                  {bmPct > 100 ? 'Above High' : bmPct > 60 ? 'Above Median' : 'Below Median'}
                </span>
              </div>
              <div className="prog">
                <div className="prog-fill" style={{ width: `${Math.min(bmPct,100)}%`, background: bmPct>100?'var(--err)':bmPct>60?'var(--warn)':'var(--acc)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.73rem', color: 'var(--muted)', marginTop: '3px' }}>
                <span>Low: {bm.low}</span><span>Median: {bm.median}</span><span>High: {bm.high}</span>
              </div>
            </div>
          )}

          {/* Impact table */}
          <div className="card">
            <div className="card-title">🌍 All Impact Categories – Summary</div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Impact Category</th><th>Unit</th><th>Total (A–D)</th><th>Per m²</th><th>Per m²/yr</th></tr></thead>
                <tbody>
                  {(Object.keys(IMPACT_META) as (keyof typeof IMPACT_META)[]).map((k) => (
                    <tr key={k}>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="dot" style={{ background: IMPACT_META[k].color }} />
                          {IMPACT_META[k].label}
                        </span>
                      </td>
                      <td className="mono muted">{IMPACT_META[k].unit}</td>
                      <td className="mono">{k === 'ODP' ? results!.total[k].toExponential(2) : results!.total[k].toFixed(2)}</td>
                      <td className="mono muted">{k === 'ODP' ? results!.perM2[k].toExponential(2) : results!.perM2[k].toFixed(4)}</td>
                      <td className="mono muted">{k === 'ODP' ? results!.perM2PerYear[k].toExponential(2) : results!.perM2PerYear[k].toFixed(5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default Dashboard;

import React, { useState } from 'react';
import { useLCA } from '../../context/LCAContext';
import type { ComplianceResult, RequirementResult } from '../../types/lca';
import { STANDARDS } from '../../data/standards';

const STATUS_ICON: Record<RequirementResult['status'], string> = { pass: '✅', fail: '❌', warning: '⚠️', na: '➖' };
const STATUS_BADGE: Record<RequirementResult['status'], string> = { pass: 'b-pass', fail: 'b-fail', warning: 'b-warn', na: 'b-na' };

const ScoreBar: React.FC<{ score: number; max: number; color: string }> = ({ score, max, color }) => (
  <div className="row" style={{ gap:'6px', marginTop:'4px' }}>
    <div style={{ flex:1, height:'8px', background:'#E2E8F0', borderRadius:'4px', overflow:'hidden' }}>
      <div style={{ height:'100%', background:color, width:`${(score/max)*100}%`, borderRadius:'4px', transition:'width .4s' }} />
    </div>
    <span style={{ fontSize:'.83rem', fontWeight:700, color, minWidth:'38px' }}>{score}/{max}</span>
  </div>
);

const CompCard: React.FC<{ r: ComplianceResult }> = ({ r }) => {
  const [exp, setExp] = useState(false);
  const std = STANDARDS.find((s) => s.id === r.standard);
  const pass = r.requirements.filter((x) => x.status === 'pass').length;
  const fail = r.requirements.filter((x) => x.status === 'fail').length;
  const warn = r.requirements.filter((x) => x.status === 'warning').length;
  const shown = exp ? r.requirements : r.requirements.slice(0, 4);

  return (
    <div className="comp-card">
      <div className={`comp-hdr ${r.compliant ? 'pass' : 'fail'}`}>
        <div>
          <div style={{ fontWeight:700 }}>{r.compliant ? '✅' : '❌'} {r.label}</div>
          <div style={{ fontSize:'.76rem', color:'var(--muted)', marginTop:'1px' }}>{std?.organization}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          {r.maxScore !== undefined && (
            <>
              <div><span style={{ fontWeight:700, fontSize:'1.15rem', color:r.compliant?'#065F46':'#991B1B' }}>{r.score??0}</span>
                <span className="muted" style={{ fontSize:'.82rem' }}>/{r.maxScore} pts</span></div>
              <ScoreBar score={r.score??0} max={r.maxScore} color={r.compliant?'#059669':'#DC2626'} />
            </>
          )}
        </div>
      </div>
      <div className="comp-body">
        <div style={{ marginBottom:'9px', fontSize:'.83rem' }}>{r.summary}</div>
        <div className="row" style={{ marginBottom:'10px', gap:'6px' }}>
          <span className="badge b-pass">✅ {pass}</span>
          {warn > 0 && <span className="badge b-warn">⚠️ {warn}</span>}
          {fail > 0 && <span className="badge b-fail">❌ {fail}</span>}
        </div>
        {shown.map((req) => (
          <div key={req.id} className="req-row">
            <span className="req-icon">{STATUS_ICON[req.status]}</span>
            <div className="req-desc">
              {req.description}
              {req.notes && <div style={{ fontSize:'.76rem', color:'var(--muted)', marginTop:'1px' }}>{req.notes}</div>}
            </div>
            {req.value !== undefined && <span className="req-val">{req.value}</span>}
          </div>
        ))}
        {r.requirements.length > 4 && (
          <button className="btn btn-out btn-sm" onClick={() => setExp(!exp)} style={{ marginTop:'6px' }}>
            {exp ? 'Show Less' : `Show All (${r.requirements.length})`}
          </button>
        )}
        {r.recommendations.length > 0 && (
          <div style={{ marginTop:'10px' }}>
            <div style={{ fontSize:'.76rem', fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px' }}>Recommendations</div>
            <ul style={{ paddingLeft:'15px', margin:0 }}>
              {r.recommendations.map((rec, i) => <li key={i} style={{ fontSize:'.81rem', marginBottom:'3px' }}>{rec}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const ComplianceReport: React.FC = () => {
  const { complianceResults, results } = useLCA();

  if (!results) return (
    <div>
      <div className="ph"><div className="ph-title">Compliance Report</div></div>
      <div className="card"><div className="empty"><div className="icon">✅</div><h3>No data yet</h3><p>Add materials to generate LCA results and compliance checks.</p></div></div>
    </div>
  );

  const pass = complianceResults.filter((r) => r.compliant).length;
  const leedV4 = complianceResults.find((r) => r.standard === 'LEED_v4_MRc1');
  const leedV41 = complianceResults.find((r) => r.standard === 'LEED_v4_1_MRc1');
  const breeam = complianceResults.find((r) => r.standard === 'BREEAM_Mat01');
  const en = complianceResults.find((r) => r.standard === 'EN_15978');

  return (
    <div>
      <div className="ph">
        <div><div className="ph-title">Compliance Report</div><div className="ph-sub">Assessment against LEED v4 · LEED v4.1 · EN 15978 · BREEAM · ISO 14044</div></div>
      </div>

      <div className="kpi-grid" style={{ marginBottom:'20px' }}>
        {[
          { lbl: 'Standards Met', val: `${pass}/${complianceResults.length}`, sub: 'fully compliant', col: pass>0?'#059669':'#DC2626' },
          { lbl: 'LEED v4 MRc1', val: `${leedV4?.creditPoints??0}/3 pts`, sub: leedV4?.summary??'—', col: leedV4?.compliant?'#059669':'#DC2626' },
          { lbl: 'LEED v4.1 MRc1', val: `${leedV41?.creditPoints??0}/5 pts`, sub: leedV41?.summary??'—', col: leedV41?.compliant?'#059669':'#DC2626' },
          { lbl: 'BREEAM Mat 01', val: `${breeam?.creditPoints??0}/6 pts`, sub: breeam?.summary??'—', col: breeam?.compliant?'#7C3AED':'#DC2626' },
          { lbl: 'EN 15978', val: en?.compliant?'Compliant':'Action Req.', sub: en?.summary??'—', col: en?.compliant?'#059669':'#DC2626' },
        ].map((k) => (
          <div className="kpi" key={k.lbl}><div className="kpi-lbl">{k.lbl}</div><div className="kpi-val" style={{ fontSize:'1.1rem', color:k.col }}>{k.val}</div><div className="kpi-sub">{k.sub}</div></div>
        ))}
      </div>

      <div className="comp-grid" style={{ marginBottom:'20px' }}>
        {complianceResults.map((r) => <CompCard key={r.standard} r={r} />)}
      </div>

      <div className="card">
        <div className="card-title">📜 Standard References</div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Standard</th><th>Organization</th><th>Year</th><th>Max Credits</th><th>Mandatory Stages</th></tr></thead>
            <tbody>
              {STANDARDS.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight:600 }}>{s.name}</td>
                  <td>{s.organization}</td>
                  <td>{s.year}</td>
                  <td>{s.creditPoints ? <span className="badge b-info">{s.creditPoints} pts</span> : '—'}</td>
                  <td>{s.mandatoryStages.length > 0 ? s.mandatoryStages.map((st) => <span key={st} className="badge b-info" style={{ marginRight:'3px' }}>{st}</span>) : <span className="muted">All</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default ComplianceReport;

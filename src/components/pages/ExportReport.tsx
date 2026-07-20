import React, { useState } from 'react';
import { useLCA } from '../../context/LCAContext';
import { IMPACT_META, LIFECYCLE_STAGES, STAGE_META } from '../../types/lca';
import type { ImpactValues } from '../../types/lca';
import { formatGWP } from '../../utils/lcaCalculator';

const ExportReport: React.FC = () => {
  const { state, results, baselineResults, complianceResults } = useLCA();
  const { project, materialEntries } = state;
  const [done, setDone] = useState<string | null>(null);

  const dl = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const now = new Date().toISOString().slice(0,10);
  const proj = project?.name?.replace(/\s+/g,'_') ?? 'Project';

  const exportFull = () => {
    if (!results) return;
    let csv = `LCA Tool – Full Assessment Report\nProject,"${project?.name}"\nBuilding Type,${project?.buildingType}\nGFA,${project?.grossFloorArea} m2\nRSP,${project?.lifespan} yr\nDate,${now}\n\n`;
    csv += '=== IMPACT SUMMARY ===\nCategory,Total,Per m2,Per m2/yr,Unit\n';
    for (const k of Object.keys(IMPACT_META) as (keyof ImpactValues)[]) {
      csv += `"${IMPACT_META[k].label}",${results.total[k]},${results.perM2[k]},${results.perM2PerYear[k]},${IMPACT_META[k].unit}\n`;
    }
    csv += '\n=== MATERIAL INVENTORY ===\nMaterial,Component,Stage,Qty,Unit,GWP (kg CO2eq),AP (kg SO2eq),ADP_fossil (MJ)\n';
    for (const b of results.byMaterial) {
      csv += `"${b.name}","${b.component}",${b.stage},${b.quantity},${b.unit},${b.impacts.GWP.toFixed(4)},${b.impacts.AP.toFixed(6)},${b.impacts.ADP_fossil.toFixed(4)}\n`;
    }
    csv += '\n=== STAGE BREAKDOWN ===\nStage,Description,GWP,ODP,AP,EP,POCP,ADP_fossil\n';
    for (const s of LIFECYCLE_STAGES) {
      const v = results.byStage[s]; if (!v) continue;
      csv += `${s},"${STAGE_META[s].label}",${v.GWP.toFixed(4)},${v.ODP.toExponential(4)},${v.AP.toFixed(6)},${v.EP.toFixed(6)},${v.POCP.toFixed(6)},${v.ADP_fossil.toFixed(4)}\n`;
    }
    if (baselineResults) {
      csv += '\n=== BASELINE COMPARISON ===\nCategory,Baseline,Proposed,Change (%)\n';
      for (const k of Object.keys(IMPACT_META) as (keyof ImpactValues)[]) {
        const b = baselineResults.total[k], p = results.total[k];
        csv += `"${IMPACT_META[k].label}",${b},${p},${b!==0?((p-b)/Math.abs(b)*100).toFixed(2):0}\n`;
      }
    }
    csv += '\n=== COMPLIANCE ===\nStandard,Compliant,Score,Summary\n';
    for (const r of complianceResults) csv += `"${r.label}",${r.compliant},${r.score??''},"${r.summary}"\n`;
    dl(`LCA_${proj}_${now}_FullReport.csv`, csv);
    setDone('full'); setTimeout(() => setDone(null), 2500);
  };

  const exportMaterials = () => {
    if (!results) return;
    let csv = `Material,Component,Stage,Qty,Unit,GWP (kg CO2eq),ODP (kg CFC11),AP (kg SO2eq),EP (kg PO4eq),POCP (kg C2H4eq),ADP_fossil (MJ)\n`;
    for (const b of results.byMaterial) {
      csv += `"${b.name}","${b.component}",${b.stage},${b.quantity},${b.unit},${b.impacts.GWP.toFixed(4)},${b.impacts.ODP.toExponential(4)},${b.impacts.AP.toFixed(6)},${b.impacts.EP.toFixed(6)},${b.impacts.POCP.toFixed(6)},${b.impacts.ADP_fossil.toFixed(4)}\n`;
    }
    csv += `\nTOTAL,,,,${results.total.GWP.toFixed(4)},${results.total.ODP.toExponential(4)},${results.total.AP.toFixed(6)},${results.total.EP.toFixed(6)},${results.total.POCP.toFixed(6)},${results.total.ADP_fossil.toFixed(4)}\n`;
    csv += `Per m2,,,,,${results.perM2.GWP.toFixed(4)}\nPer m2/yr,,,,,${results.perM2PerYear.GWP.toFixed(6)}\n`;
    dl(`LCA_${proj}_${now}_Materials.csv`, csv);
    setDone('mat'); setTimeout(() => setDone(null), 2500);
  };

  const exportCompliance = () => {
    let csv = `Standard,Compliant,Score,MaxScore,Summary\n`;
    for (const r of complianceResults) {
      csv += `"${r.label}",${r.compliant},${r.score??''},${r.maxScore??''},"${r.summary}"\n`;
    }
    csv += '\nStandard,Req ID,Description,Status,Value,Threshold,Notes\n';
    for (const r of complianceResults) {
      for (const req of r.requirements) {
        csv += `"${r.label}","${req.id}","${req.description}",${req.status},"${req.value??''}","${req.threshold??''}","${req.notes??''}"\n`;
      }
    }
    dl(`LCA_${proj}_${now}_Compliance.csv`, csv);
    setDone('comp'); setTimeout(() => setDone(null), 2500);
  };

  const saveJSON = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `LCA_${proj}_${now}.json`; a.click();
    URL.revokeObjectURL(url);
    setDone('json'); setTimeout(() => setDone(null), 2500);
  };

  const loadJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.project && parsed.materialEntries) {
          localStorage.setItem('lca_tool_v1', JSON.stringify(parsed));
          window.location.reload();
        } else alert('Invalid LCA Tool project file.');
      } catch { alert('Failed to parse file.'); }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="ph">
        <div><div className="ph-title">Export Report</div><div className="ph-sub">Download LCA results and compliance data as CSV files</div></div>
      </div>

      {project && (
        <div className="card" style={{ marginBottom:'14px' }}>
          <div className="card-title">📋 Project Summary</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:'12px' }}>
            {[
              ['Project Name', project.name],
              ['Building Type', project.buildingType.replace(/_/g,' ')],
              ['GFA', `${project.grossFloorArea?.toLocaleString()} m²`],
              ['Stories', String(project.stories)],
              ['RSP', `${project.lifespan} years`],
              ['Country', project.country],
              ['Materials', String(materialEntries.length)],
              ['Total GWP', results ? formatGWP(results.total.GWP) : '—'],
            ].map(([lbl, val]) => (
              <div key={lbl}>
                <div style={{ fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--muted)', marginBottom:'2px' }}>{lbl}</div>
                <div style={{ fontWeight:600 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'14px', marginBottom:'20px' }}>
        {[
          { key:'full', title:'📊 Full LCA Report', desc:'Impact summary, material inventory, stage breakdown, baseline comparison, and compliance overview.', fn: exportFull, disabled: !results },
          { key:'mat',  title:'🧱 Material Inventory', desc:'All materials with quantities, per-entry impacts across all 6 categories.', fn: exportMaterials, disabled: !results },
          { key:'comp', title:'✅ Compliance Report', desc:'Detailed LEED, EN 15978, BREEAM, and ISO 14044 compliance check results.', fn: exportCompliance, disabled: complianceResults.length===0 },
        ].map((opt) => (
          <div key={opt.key} className="card" style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            <div>
              <div style={{ fontWeight:700, marginBottom:'5px' }}>{opt.title}</div>
              <div style={{ fontSize:'.83rem', color:'var(--muted)', lineHeight:1.5 }}>{opt.desc}</div>
            </div>
            <button className={`btn ${done===opt.key?'btn-acc':'btn-pri'}`} disabled={opt.disabled} onClick={opt.fn} style={{ alignSelf:'flex-start' }}>
              {done===opt.key ? '✅ Downloaded' : '⬇ Download CSV'}
            </button>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom:'14px' }}>
        <div className="card-title">💾 Save / Load Project</div>
        <p className="muted" style={{ fontSize:'.86rem', marginBottom:'13px' }}>Save the entire project as JSON to share or continue in another session.</p>
        <div className="row">
          <button className={`btn ${done==='json'?'btn-acc':'btn-pri'}`} onClick={saveJSON}>{done==='json'?'✅ Saved':'💾 Save Project JSON'}</button>
          <label className="btn btn-out" style={{ cursor:'pointer' }}>
            📂 Load Project JSON
            <input type="file" accept=".json" style={{ display:'none' }} onChange={loadJSON} />
          </label>
        </div>
      </div>

      <div className="card" style={{ background:'var(--bg)' }}>
        <div className="card-title">ℹ️ Data Sources & Disclaimer</div>
        <ul style={{ paddingLeft:'16px', fontSize:'.82rem', color:'var(--muted)', lineHeight:1.9 }}>
          <li>EPD data sourced from: ICE Database v3.0 (University of Bath), World Steel Association EPDs, European Aluminium EPDs, Glass for Europe EPDs, ROCKWOOL/EURIMA EPDs, and other published industry EPDs.</li>
          <li>Values are indicative. For formal LEED/BREEAM submissions, use project-specific certified EPDs from EC3, OKOBAUDAT, EPD International, or manufacturer EPD portals.</li>
          <li>LEED v4/v4.1 MRc1 credit requires a study prepared by a qualified professional and submitted for USGBC review.</li>
          <li>EN 15978:2011 requires declaration of all life cycle stages, or documentation of why any stage was excluded (Module Not Assessed – MNA).</li>
          <li>Biogenic carbon in timber: GWP values for timber products include biogenic carbon sequestration per EN 16449 / ISO 21930.</li>
        </ul>
      </div>
    </div>
  );
};
export default ExportReport;

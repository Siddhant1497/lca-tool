import React, { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { useLCA } from '../../context/LCAContext';
import type { Project, BuildingType } from '../../types/lca';
import { BUILDING_TYPE_LABELS } from '../../types/lca';

const GRID: Record<string, number> = {
  US: 0.386, UK: 0.233, Germany: 0.366, France: 0.052, Australia: 0.656,
  Canada: 0.130, Netherlands: 0.277, Sweden: 0.013, Norway: 0.017,
  Denmark: 0.132, Singapore: 0.408, UAE: 0.547, India: 0.708, China: 0.581,
  Brazil: 0.074, Other: 0.400,
};

const ProjectSetup: React.FC = () => {
  const { state, dispatch } = useLCA();
  const [form, setForm] = useState<Project>(state.project ?? {
    id: uuid(), name: '', description: '', buildingType: 'office' as BuildingType,
    grossFloorArea: 1000, stories: 5, lifespan: 60, location: '', country: 'US',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (state.project) setForm(state.project); }, []);

  const set = (k: keyof Project, v: string | number | undefined) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };

  const save = () => {
    dispatch({ type: 'SET_PROJECT', project: { ...form, updatedAt: new Date().toISOString() } });
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  const opCarbon = form.energyIntensity && form.gridCarbonIntensity && form.grossFloorArea
    ? form.energyIntensity * form.gridCarbonIntensity * form.grossFloorArea * form.lifespan : null;

  return (
    <div>
      <div className="ph">
        <div><div className="ph-title">Project Setup</div><div className="ph-sub">Define building parameters and Reference Study Period</div></div>
        <div className="ph-actions">
          <button className="btn btn-pri" onClick={save}>{saved ? '✅ Saved' : '💾 Save Project'}</button>
          <button className="btn btn-out" onClick={() => { if (confirm('Reset all data?')) dispatch({ type: 'RESET' }); }}>↺ Reset</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="sec-title">📋 General Information</div>
        <div className="form-grid">
          <div className="field" style={{ gridColumn: '1/-1' }}>
            <label>Project / Building Name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Office HQ – Phase 1" />
          </div>
          <div className="field" style={{ gridColumn: '1/-1' }}>
            <label>Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Brief project description" />
          </div>
          <div className="field">
            <label>Building Type *</label>
            <select value={form.buildingType} onChange={(e) => set('buildingType', e.target.value as BuildingType)}>
              {(Object.entries(BUILDING_TYPE_LABELS) as [BuildingType, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field"><label>Location / City</label><input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. New York, NY" /></div>
          <div className="field">
            <label>Country</label>
            <select value={form.country} onChange={(e) => { set('country', e.target.value); set('gridCarbonIntensity', GRID[e.target.value] ?? 0.4); }}>
              {Object.keys(GRID).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="sec-title">📐 Building Parameters</div>
        <div className="form-grid">
          <div className="field">
            <label>Gross Floor Area (GFA) – m² *</label>
            <input type="number" min="1" value={form.grossFloorArea} onChange={(e) => set('grossFloorArea', parseFloat(e.target.value) || 0)} />
            <span className="hint">Total built floor area (all stories combined)</span>
          </div>
          <div className="field">
            <label>Conditioned Floor Area – m²</label>
            <input type="number" min="0" value={form.conditionedFloorArea ?? ''} onChange={(e) => set('conditionedFloorArea', parseFloat(e.target.value) || undefined)} />
            <span className="hint">Heated/cooled area (for LEED energy credits)</span>
          </div>
          <div className="field"><label>Number of Stories</label><input type="number" min="1" value={form.stories} onChange={(e) => set('stories', parseInt(e.target.value, 10) || 1)} /></div>
          <div className="field"><label>Building Height – m</label><input type="number" min="0" value={form.buildingHeight ?? ''} onChange={(e) => set('buildingHeight', parseFloat(e.target.value) || undefined)} /></div>
          <div className="field">
            <label>Reference Study Period (RSP) – years *</label>
            <input type="number" min="1" max="200" value={form.lifespan} onChange={(e) => set('lifespan', parseInt(e.target.value, 10) || 60)} />
            <span className="hint">LEED default: 60 yr · EN 15978: as declared by project</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="sec-title">⚡ Operational Energy (Stage B6) – Optional</div>
        <p className="muted" style={{ fontSize: '.84rem', marginBottom: '12px' }}>
          Include operational (in-use) energy for a whole-building GWP assessment. Required for LEED EA prerequisites.
        </p>
        <div className="form-grid">
          <div className="field">
            <label>Energy Use Intensity – kWh/m²/yr</label>
            <input type="number" min="0" value={form.energyIntensity ?? ''} placeholder="e.g. 120" onChange={(e) => set('energyIntensity', parseFloat(e.target.value) || undefined)} />
            <span className="hint">Whole-building EUI (heating, cooling, lighting, plug loads)</span>
          </div>
          <div className="field">
            <label>Grid Carbon Intensity – kg CO₂/kWh</label>
            <input type="number" min="0" step="0.001" value={form.gridCarbonIntensity ?? ''} placeholder={String(GRID[form.country] ?? 0.4)} onChange={(e) => set('gridCarbonIntensity', parseFloat(e.target.value) || undefined)} />
            <span className="hint">Auto-filled from country · {form.country}: {GRID[form.country] ?? 0.4} kg CO₂/kWh</span>
          </div>
        </div>
        {opCarbon && (
          <div style={{ marginTop: '12px', padding: '10px 13px', background: 'var(--pri-lt)', borderRadius: 'var(--r-sm)', fontSize: '.86rem', color: 'var(--pri-dk)' }}>
            <strong>B6 Operational Carbon:</strong> {opCarbon.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg CO₂ eq over {form.lifespan} yr
            <span style={{ marginLeft: '14px' }}>({(form.energyIntensity! * form.gridCarbonIntensity!).toFixed(3)} kg CO₂/m²/yr)</span>
          </div>
        )}
      </div>

      <div className="card">
        <div className="sec-title">📜 Standards Covered</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: '10px' }}>
          {[
            { name: 'LEED v4 MRc1', pts: '3 pts', desc: 'Whole-building LCA credit' },
            { name: 'LEED v4.1 MRc1', pts: '5 pts', desc: 'Updated LCA credit' },
            { name: 'EN 15978:2011', pts: null, desc: 'European LCA framework' },
            { name: 'BREEAM Mat 01', pts: '6 pts', desc: 'UK green building LCA' },
            { name: 'ISO 14044:2006', pts: null, desc: 'International LCA standard' },
          ].map((s) => (
            <div key={s.name} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '11px', background: 'var(--bg)' }}>
              <div style={{ fontWeight: 700, fontSize: '.86rem' }}>{s.name}</div>
              <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginTop: '2px' }}>{s.desc}</div>
              {s.pts && <div style={{ marginTop: '4px' }}><span className="badge b-info">{s.pts}</span></div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default ProjectSetup;

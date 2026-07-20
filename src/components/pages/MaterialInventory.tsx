import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useLCA } from '../../context/LCAContext';
import { MATERIALS, getMaterialById } from '../../data/materials';
import type { MaterialEntry, LifeCycleStage, MaterialCategory } from '../../types/lca';
import { STAGE_META, MATERIAL_CATEGORY_LABELS } from '../../types/lca';

const COMPONENTS = [
  'Foundation / Substructure','Ground Floor / Slab','Columns / Beams / Frame',
  'External Walls','Internal Walls / Partitions','Floors / Ceilings',
  'Roof Structure','Roof Covering','Windows / Glazing','External Doors',
  'Stairs','Cladding / Facades','Insulation','Waterproofing',
  'MEP – Mechanical','MEP – Electrical','MEP – Plumbing','Internal Finishes','Site Works','Other',
];

const STAGE_OPTS = ['A1-A3','A4','A5','B4','C1','C2','C3','C4','D'] as LifeCycleStage[];

interface F { materialId: string; qty: string; component: string; stage: LifeCycleStage; rep: boolean; notes: string; name: string; }
const DEF: F = { materialId: '', qty: '', component: 'External Walls', stage: 'A1-A3', rep: true, notes: '', name: '' };

const MaterialInventory: React.FC = () => {
  const { state, dispatch } = useLCA();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<F>(DEF);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState<MaterialCategory | ''>('');
  const [tab, setTab] = useState<'proposed' | 'baseline'>('proposed');
  const [err, setErr] = useState('');

  const entries = tab === 'proposed' ? state.materialEntries : state.baselineEntries;
  const cats = Array.from(new Set(MATERIALS.map((m) => m.category))) as MaterialCategory[];
  const filteredMats = MATERIALS.filter((m) => {
    const qs = search.toLowerCase();
    return (search === '' || m.name.toLowerCase().includes(qs) || (m.description?.toLowerCase().includes(qs) ?? false))
      && (cat === '' || m.category === cat);
  });

  const openAdd = () => { setEditId(null); setForm(DEF); setErr(''); setShowModal(true); };
  const openEdit = (e: MaterialEntry) => {
    setEditId(e.id);
    setForm({ materialId: e.materialId, qty: String(e.quantity), component: e.component, stage: e.stage, rep: e.includeReplacement, notes: e.notes ?? '', name: e.customName ?? '' });
    setErr(''); setShowModal(true);
  };

  const save = () => {
    if (!form.materialId) { setErr('Select a material.'); return; }
    const qty = parseFloat(form.qty);
    if (!qty || qty <= 0) { setErr('Quantity must be positive.'); return; }
    const mat = getMaterialById(form.materialId);
    if (!mat) { setErr('Material not found.'); return; }
    const data: Omit<MaterialEntry, 'id'> = {
      materialId: form.materialId, quantity: qty, unit: mat.unit,
      component: form.component, stage: form.stage, includeReplacement: form.rep,
      notes: form.notes || undefined, customName: form.name || undefined,
    };
    if (editId) {
      dispatch(tab === 'proposed' ? { type: 'UPDATE_ENTRY', entry: { ...data, id: editId } } : { type: 'UPDATE_BASELINE', entry: { ...data, id: editId } });
    } else {
      const entry = { ...data, id: uuid() };
      dispatch(tab === 'proposed' ? { type: 'ADD_ENTRY', entry } : { type: 'ADD_BASELINE', entry });
    }
    setShowModal(false);
  };

  const del = (id: string) => {
    if (!confirm('Remove this material?')) return;
    dispatch(tab === 'proposed' ? { type: 'DELETE_ENTRY', id } : { type: 'DELETE_BASELINE', id });
  };

  const selMat = form.materialId ? getMaterialById(form.materialId) : null;
  const reps = selMat && state.project && form.rep && selMat.serviceLife < state.project.lifespan
    ? Math.floor(state.project.lifespan / selMat.serviceLife) - 1 : 0;

  return (
    <div>
      <div className="ph">
        <div><div className="ph-title">Material Inventory</div><div className="ph-sub">Add building materials from the EPD database to calculate impacts</div></div>
        <div className="ph-actions"><button className="btn btn-pri" onClick={openAdd}>＋ Add Material</button></div>
      </div>

      <div className="tabs">
        <button className={`tab${tab==='proposed'?' active':''}`} onClick={() => setTab('proposed')}>
          🏗️ Proposed Design ({state.materialEntries.length})
        </button>
        <button className={`tab${tab==='baseline'?' active':''}`} onClick={() => { setTab('baseline'); dispatch({ type: 'SET_HAS_BASELINE', value: true }); }}>
          📐 Baseline / Reference ({state.baselineEntries.length})
        </button>
      </div>

      {tab === 'baseline' && (
        <div style={{ padding: '9px 13px', background: 'var(--warn-lt)', border: '1px solid #FDE68A', borderRadius: 'var(--r-sm)', marginBottom: '14px', fontSize: '.83rem', color: '#92400E' }}>
          <strong>Baseline Model:</strong> Define a code-minimum / reference building for LEED MRc1 / BREEAM credit comparison.
        </div>
      )}

      {entries.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="icon">🧱</div>
            <h3>No materials in {tab === 'proposed' ? 'proposed design' : 'baseline'}</h3>
            <p>Click "Add Material" to select from 40+ EPD-backed building materials and enter quantities.</p>
            <button className="btn btn-pri" onClick={openAdd}>＋ Add Material</button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Material</th><th>Component</th><th>Stage</th><th>Quantity</th><th>B4 Replacement</th><th>Actions</th></tr></thead>
              <tbody>
                {entries.map((e) => {
                  const mat = getMaterialById(e.materialId);
                  return (
                    <tr key={e.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{e.customName ?? mat?.name ?? '—'}</div>
                        <div style={{ fontSize: '.76rem', color: 'var(--muted)' }}>{mat ? MATERIAL_CATEGORY_LABELS[mat.category] : ''}</div>
                      </td>
                      <td>{e.component}</td>
                      <td><span className="badge b-info">{e.stage}</span></td>
                      <td className="mono">{e.quantity.toLocaleString()} {e.unit}</td>
                      <td>{e.includeReplacement ? <span className="badge b-pass">Yes</span> : <span className="badge b-na">No</span>}</td>
                      <td>
                        <div className="row">
                          <button className="btn btn-out btn-sm" onClick={() => openEdit(e)}>✏️ Edit</button>
                          <button className="btn btn-err btn-sm" onClick={() => del(e.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-hdr">
              <h2>{editId ? 'Edit Material Entry' : 'Add Material'}</h2>
              <button className="btn btn-out btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div className="field">
                  <label>Search EPD Database</label>
                  <input placeholder="Filter by name…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="field">
                  <label>Category</label>
                  <select value={cat} onChange={(e) => setCat(e.target.value as MaterialCategory | '')}>
                    <option value="">All Categories</option>
                    {cats.map((c) => <option key={c} value={c}>{MATERIAL_CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
              </div>

              <div className="field" style={{ marginBottom: '14px' }}>
                <label>Select Material *</label>
                <select value={form.materialId} onChange={(e) => setForm((f) => ({ ...f, materialId: e.target.value }))} size={6} style={{ height: '130px' }}>
                  <option value="">— Select from EPD database —</option>
                  {filteredMats.map((m) => <option key={m.id} value={m.id}>[{MATERIAL_CATEGORY_LABELS[m.category].slice(0,12)}] {m.name}</option>)}
                </select>
              </div>

              {selMat && (
                <div style={{ padding: '9px 12px', background: 'var(--pri-lt)', borderRadius: 'var(--r-sm)', marginBottom: '12px', fontSize: '.8rem', color: 'var(--pri-dk)' }}>
                  <strong>{selMat.name}</strong><br />
                  Unit: <strong>{selMat.unit}</strong>{selMat.density ? ` · ${selMat.density} kg/m³` : ''} · Service life: {selMat.serviceLife} yr<br />
                  A1-A3 GWP: <strong>{selMat.epd.A1_A3.GWP} kg CO₂/{selMat.unit}</strong>
                  {selMat.biogenicCarbonIncluded && <span style={{ marginLeft: '6px' }} className="badge b-pass">Biogenic C included</span>}
                  <br /><span className="muted">Source: {selMat.source}</span>
                </div>
              )}

              <div className="form-grid">
                <div className="field"><label>Custom Label (optional)</label><input value={form.name} onChange={(e) => setForm((f) => ({...f, name: e.target.value}))} placeholder={selMat?.name ?? 'e.g. Ground floor slab'} /></div>
                <div className="field"><label>Quantity ({selMat?.unit ?? '—'}) *</label><input type="number" min="0" step="any" value={form.qty} onChange={(e) => setForm((f) => ({...f, qty: e.target.value}))} placeholder="Enter quantity" /></div>
                <div className="field"><label>Building Component *</label>
                  <select value={form.component} onChange={(e) => setForm((f) => ({...f, component: e.target.value}))}>
                    {COMPONENTS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field"><label>Life Cycle Stage *</label>
                  <select value={form.stage} onChange={(e) => setForm((f) => ({...f, stage: e.target.value as LifeCycleStage}))}>
                    {STAGE_OPTS.map((s) => <option key={s} value={s}>{s} – {STAGE_META[s].label}</option>)}
                  </select>
                </div>
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.rep} onChange={(e) => setForm((f) => ({...f, rep: e.target.checked}))} />
                    Include B4 replacement (auto-calculated from service life vs. RSP)
                  </label>
                  {reps > 0 && <span className="hint" style={{ color: 'var(--warn)' }}>{reps} replacement(s) over {state.project?.lifespan} yr RSP</span>}
                </div>
                <div className="field" style={{ gridColumn: '1/-1' }}><label>Notes</label><textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({...f, notes: e.target.value}))} placeholder="e.g. 200mm thick, reinforced, ground floor" /></div>
              </div>
              {err && <div style={{ marginTop: '8px', padding: '7px 11px', background: 'var(--err-lt)', borderRadius: 'var(--r-sm)', color: 'var(--err)', fontSize: '.83rem' }}>{err}</div>}
            </div>
            <div className="modal-ftr">
              <button className="btn btn-out" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-pri" onClick={save}>{editId ? '💾 Update' : '＋ Add to Inventory'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default MaterialInventory;

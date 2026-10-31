import React, { useState } from 'react';
import { useHub } from '../../../context/HubContext';
import { uid, atRisk, onTrack, projectGap, LEED_BDC_CATEGORIES } from '../../../utils/hub';
import { CERT_STAGES, CERT_SYSTEMS, type CertProject, type CertCategory, type CertSystem, type CertStage } from '../../../types/hub';
import Modal from '../../ui/Modal';
import Icon from '../../ui/Icon';
import EmptyState from '../../ui/EmptyState';
import { useToast } from '../../ui/Toast';
import { SysTag, STAGE_BADGE } from '../CommandCenter';
import { Field, Num, Section, n, okNum } from './fields';

type CD = { name: string; max: string; secured: string; likely: string };
type D = { id: string; name: string; system: CertSystem; version: string; targetLabel: string; needed: string; secured: string; likely: string; max: string; unit: 'pts' | '%'; stage: CertStage; next: string; cats: CD[] };

const blank = (): D => ({ id: uid(), name: '', system: 'LEED', version: '', targetLabel: '', needed: '', secured: '0', likely: '0', max: '', unit: 'pts', stage: 'Registered', next: '', cats: [] });
const toD = (p: CertProject): D => ({ ...p, needed: String(p.needed), secured: String(p.secured), likely: String(p.likely), max: String(p.max),
  cats: (p.categories ?? []).map((c) => ({ name: c.name, max: String(c.max), secured: String(c.secured), likely: String(c.likely) })) });
const sum = (cs: CD[], k: 'max' | 'secured' | 'likely') => cs.reduce((a, c) => a + (Number(c[k]) || 0), 0);

const ProjectsTab: React.FC = () => {
  const { hub, dispatch } = useHub();
  const toast = useToast();
  const [d, setD] = useState<D | null>(null);
  const [tried, setTried] = useState(false);
  const isNew = d ? !hub.projects.some((p) => p.id === d.id) : false;
  const set = <K extends keyof D>(k: K) => (v: D[K]) => setD((x) => x && { ...x, [k]: v });
  const hasCats = !!d && d.cats.length > 0;

  // With a scorecard, secured/likely/max roll up from the categories.
  const sec = d ? (hasCats ? sum(d.cats, 'secured') : n(d.secured)) : 0;
  const lik = d ? (hasCats ? sum(d.cats, 'likely') : n(d.likely)) : 0;
  const mx = d ? (hasCats ? sum(d.cats, 'max') : n(d.max)) : 0;
  const catBad = d ? d.cats.map((c) => !c.name.trim() || !okNum(c.max) || !okNum(c.secured) || !okNum(c.likely) || n(c.secured) + n(c.likely) > n(c.max)) : [];
  const errs = d ? {
    name: !d.name.trim() && 'Project name is required',
    targetLabel: !d.targetLabel.trim() && 'e.g. Gold, 3-Star, Certified',
    needed: !okNum(d.needed) ? 'Required, ≥ 0' : Number.isFinite(mx) && n(d.needed) > mx ? 'Cannot exceed max' : '',
    max: !hasCats && (!okNum(d.max) || n(d.max) <= 0) && 'Required, > 0',
    secured: !hasCats && !okNum(d.secured) && 'Required, ≥ 0',
    likely: !hasCats && !okNum(d.likely) ? 'Required, ≥ 0' : sec + lik > mx ? 'Secured + likely exceeds max' : '',
    cats: catBad.some(Boolean) && 'Each category needs a name, and secured + likely ≤ max',
  } : {};
  const valid = d && !Object.values(errs).some(Boolean);

  const save = () => {
    setTried(true);
    if (!d || !valid) return;
    const categories: CertCategory[] | undefined = hasCats ? d.cats.map((c) => ({ name: c.name.trim(), max: n(c.max), secured: n(c.secured), likely: n(c.likely) })) : undefined;
    dispatch({ type: 'UPSERT_PROJECT', item: { id: d.id, name: d.name.trim(), system: d.system, version: d.version.trim(), targetLabel: d.targetLabel.trim(),
      needed: n(d.needed), secured: sec, likely: lik, max: mx, unit: d.unit, stage: d.stage, next: d.next.trim(), categories } });
    toast(isNew ? `Added ${d.name}` : `Saved ${d.name}`); setD(null); setTried(false);
  };
  const setCat = (i: number, k: keyof CD, v: string) => setD((x) => x && { ...x, cats: x.cats.map((c, j) => (j === i ? { ...c, [k]: v } : c)) });

  return (
    <>
      <Section title="Certification projects" sub="Track each project against its target level. Take thresholds from the current rating-system guide."
        actions={<button className="btn btn-pri btn-sm" onClick={() => { setTried(false); setD(blank()); }}><Icon name="plus" size={14} />Add project</button>}>
        {hub.projects.length === 0 ? (
          <EmptyState compact icon={<Icon name="building" size={22} />} title="No projects yet" body="Add a LEED, IGBC, GRIHA, EDGE, WELL or Fitwel project. For LEED you can load the BD+C category scorecard.">
            <button className="btn btn-pri btn-sm" onClick={() => setD(blank())}><Icon name="plus" size={14} />Add first project</button>
          </EmptyState>
        ) : (
          <div className="tbl-wrap"><table>
            <thead><tr><th>Project</th><th>System</th><th>Target</th><th className="num">Secured</th><th className="num">Likely</th><th>Status</th><th>Stage</th><th /></tr></thead>
            <tbody>{hub.projects.map((p) => (
              <tr key={p.id}>
                <td><div className="cell-main">{p.name}</div><div className="cell-sub">{p.next}</div></td>
                <td><div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}><SysTag s={p.system} /><span className="cell-sub">{p.version}</span></div></td>
                <td>{p.targetLabel} <span className="cell-sub">({p.needed}{p.unit === '%' ? '%' : ''})</span></td>
                <td className="num">{p.secured}</td><td className="num">{p.likely}</td>
                <td>{onTrack(p) ? <span className="badge b-pass">Met</span> : <span className={`badge ${atRisk(p) ? 'b-fail' : 'b-warn'}`}>{atRisk(p) ? 'At risk' : `${projectGap(p)} to go`}</span>}</td>
                <td><span className={`badge ${STAGE_BADGE[p.stage]}`}>{p.stage}</span></td>
                <td><div className="row-actions">
                  <button className="icon-btn sm" aria-label={`Edit ${p.name}`} onClick={() => { setTried(false); setD(toD(p)); }}><Icon name="edit" size={15} /></button>
                  <button className="icon-btn sm danger" aria-label={`Delete ${p.name}`} onClick={() => { if (confirm(`Delete ${p.name}?`)) { dispatch({ type: 'DELETE_PROJECT', id: p.id }); toast(`Deleted ${p.name}`, 'info'); } }}><Icon name="trash" size={15} /></button>
                </div></td>
              </tr>))}
            </tbody>
          </table></div>
        )}
      </Section>

      {d && (
        <Modal wide title={isNew ? 'Add certification project' : `Edit ${d.name}`} onClose={() => setD(null)}
          footer={<><button className="btn btn-out" onClick={() => setD(null)}>Cancel</button><button className="btn btn-pri" onClick={save}><Icon name="save" size={15} />Save project</button></>}>
          <div className="form-grid">
            <Field label="Project name" className="span2" error={tried && errs.name}><input value={d.name} onChange={(e) => set('name')(e.target.value)} className={tried && errs.name ? 'invalid' : ''} /></Field>
            <Field label="Rating system"><select value={d.system} onChange={(e) => set('system')(e.target.value as CertSystem)}>{CERT_SYSTEMS.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Version / type" hint="e.g. v4.1 BD+C, Green New Buildings"><input value={d.version} onChange={(e) => set('version')(e.target.value)} /></Field>
            <Field label="Target level" error={tried && errs.targetLabel}><input value={d.targetLabel} onChange={(e) => set('targetLabel')(e.target.value)} placeholder="Gold" className={tried && errs.targetLabel ? 'invalid' : ''} /></Field>
            <Field label="Score needed for target" error={tried && errs.needed}><Num value={d.needed} onChange={set('needed')} invalid={tried && !!errs.needed} /></Field>
            <Field label="Unit"><select value={d.unit} onChange={(e) => set('unit')(e.target.value as 'pts' | '%')}><option value="pts">Points</option><option value="%">% savings (EDGE)</option></select></Field>
            <Field label="Stage"><select value={d.stage} onChange={(e) => set('stage')(e.target.value as CertStage)}>{CERT_STAGES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            {!hasCats && <>
              <Field label="Max available" error={tried && errs.max}><Num value={d.max} onChange={set('max')} invalid={tried && !!errs.max} /></Field>
              <Field label="Secured" error={tried && errs.secured}><Num value={d.secured} onChange={set('secured')} invalid={tried && !!errs.secured} /></Field>
              <Field label="Likely (pursued)" error={tried && errs.likely}><Num value={d.likely} onChange={set('likely')} invalid={tried && !!errs.likely} /></Field>
            </>}
            <Field label="Next action" className="full"><input value={d.next} onChange={(e) => set('next')(e.target.value)} placeholder="e.g. Close out commissioning plan" /></Field>
          </div>

          <div className="divider" />
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <div><b>Category scorecard</b> <span className="cell-sub">optional · totals roll up automatically</span></div>
            <div className="row">
              {d.system === 'LEED' && !hasCats && <button className="btn btn-out btn-sm" onClick={() => setD({ ...d, max: '110', cats: LEED_BDC_CATEGORIES.map((c) => ({ name: c.name, max: String(c.max), secured: '0', likely: '0' })) })}>Load LEED v4/v4.1 BD+C (110 pts)</button>}
              <button className="btn btn-ghost btn-sm" onClick={() => setD({ ...d, cats: [...d.cats, { name: '', max: '', secured: '0', likely: '0' }] })}><Icon name="plus" size={14} />Category</button>
            </div>
          </div>
          {hasCats ? (<>
            <div className="tbl-wrap"><table>
              <thead><tr><th>Category</th><th className="num">Max</th><th className="num">Secured</th><th className="num">Likely</th><th /></tr></thead>
              <tbody>{d.cats.map((c, i) => (
                <tr key={i} style={tried && catBad[i] ? { background: 'var(--err-lt)' } : undefined}>
                  <td><input className="inp sm" value={c.name} aria-label="Category name" onChange={(e) => setCat(i, 'name', e.target.value)} /></td>
                  {(['max', 'secured', 'likely'] as const).map((k) => <td key={k} style={{ width: 100 }}><input className="inp sm num" type="number" aria-label={k} value={c[k]} onChange={(e) => setCat(i, k, e.target.value)} /></td>)}
                  <td style={{ width: 40 }}><button className="icon-btn sm danger" aria-label="Remove category" onClick={() => setD({ ...d, cats: d.cats.filter((_, j) => j !== i) })}><Icon name="x" size={14} /></button></td>
                </tr>))}
              </tbody>
              <tfoot><tr><td>Total</td><td className="num">{mx}</td><td className="num">{sec}</td><td className="num">{lik}</td><td /></tr></tfoot>
            </table></div>
            {tried && errs.cats && <div className="hint" style={{ color: 'var(--err)', marginTop: 6 }}>{errs.cats}</div>}
          </>) : <div className="hint">No scorecard. Enter totals above, or add categories to track them one by one.</div>}
        </Modal>
      )}
    </>
  );
};
export default ProjectsTab;

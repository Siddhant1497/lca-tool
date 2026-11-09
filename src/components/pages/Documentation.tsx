import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useHub } from '../../context/HubContext';
import type { DocSet } from '../../types/hub';
import { segments, parts, creditCounts, isTargeted, creditDoc, readIgbcWorkbook, DOC_STATUSES, DOC_DONE, type NData, type NCredit, type NSource, type DocStatus } from '../../utils/narrative';
import { loadNarratives, summarise } from '../../utils/docsProgress';
import { uid } from '../../utils/hub';
import { ask } from '../../utils/platform';
import Icon from '../ui/Icon';
import EmptyState from '../ui/EmptyState';
import Modal from '../ui/Modal';
import { useToast } from '../ui/Toast';

const STATUS_TONE: Record<DocStatus, string> = {
  'Not started': 'b-na', Drafting: 'b-warn', 'Internal review': 'b-info', 'Awaiting client': 'b-fail',
  'Ready to submit': 'b-pri', Submitted: 'b-info', 'Reviewer query': 'b-fail', Approved: 'b-pass',
};

/** A typed fact. Uncontrolled contentEditable so the caret never jumps while typing. */
const Fill = memo<{ k: string; hint: string; initial: string; onChange: (k: string, v: string) => void }>(({ k, hint, initial, onChange }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (ref.current) ref.current.textContent = initial; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span ref={ref} className={`nf${initial ? ' done' : ''}`} contentEditable suppressContentEditableWarning role="textbox" aria-label={hint} data-ph={hint} spellCheck
      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
      onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain').replace(/\s+/g, ' ')); }}
      onInput={(e) => { const v = (e.currentTarget.textContent ?? '').trim(); e.currentTarget.classList.toggle('done', !!v); onChange(k, v); }} />
  );
}, () => true);

const Text: React.FC<{ t: string; c: NCredit; part: string; src: NSource; edits: Record<string, string>; onFill: (k: string, v: string) => void }> = ({ t, c, part, src, edits, onFill }) => (
  <>{segments(t, c.id, part, src, edits).map((s, i) => s.t === 'text' ? <React.Fragment key={i}>{s.s}</React.Fragment>
    : s.t === 'val' ? (s.v ? <span key={i} className="nv" title={s.label}>{s.v}</span> : <span key={i} className="nv miss" title={`Not yet filled in the workbook: ${s.label}`}>[{s.label.split(' (')[0]}]</span>)
    : <Fill key={s.key} k={s.key} hint={s.hint} initial={s.v} onChange={onFill} />)}</>
);

async function copyRich(parts: { text: string; html: string }[]) {
  const text = parts.map((p) => p.text).join('\n'), html = parts.map((p) => p.html).join('');
  try {
    if ('ClipboardItem' in window) await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
    else await navigator.clipboard.writeText(text);
    return 'Copied. Paste into Word: headings and bullets carry over.';
  } catch { try { await navigator.clipboard.writeText(text); return 'Copied as plain text.'; } catch { return ''; } }
}

/**
 * Certification documentation: rating-system narrative templates filled from the project's calculation
 * workbook, with typed facts, a status workflow per credit, and Word-ready copies.
 */
const Documentation: React.FC = () => {
  const { hub, dispatch, client } = useHub();
  const toast = useToast();
  const [DATA, setDATA] = useState<NData | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [create, setCreate] = useState<{ name: string; rating: string; projectId: string } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<DocStatus | 'all'>('all');
  const [factsOpen, setFactsOpen] = useState(false);
  const [facts, setFacts] = useState<Record<string, string>>({});
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { loadNarratives().then(setDATA).catch(() => toast('Could not load the narrative templates', 'err')); }, [toast]);

  const doc = hub.docs.find((d) => d.id === activeId) ?? hub.docs[0];
  const R = doc && DATA ? DATA[doc.rating] : null;
  const onFill = useMemo(() => (k: string, v: string) => doc && dispatch({ type: 'DOC_EDIT', id: doc.id, key: k, value: v }), [doc?.id, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps
  const summary = useMemo(() => (doc && DATA ? summarise(doc, DATA) : null), [doc, DATA]);

  const openWorkbook = async (f?: File) => {
    if (!f || !doc || !DATA) return;
    try {
      const src = readIgbcWorkbook(new Uint8Array(await f.arrayBuffer()), DATA); src.file = f.name;
      if (src.rating !== doc.rating && !(await ask(`This workbook is ${DATA[src.rating].title}, but the set is ${DATA[doc.rating].title}. Switch the set to the workbook's rating? Typed facts are kept.`, { ok: 'Switch' }))) return;
      dispatch({ type: 'UPSERT_DOC', item: { ...doc, rating: src.rating, src, updatedAt: new Date().toISOString() } });
      toast(src.uncached ? 'Read, but the workbook has no calculated values stored. Open it in Excel, let it calculate, save, then load again.' : `Workbook read: ${src.project} · ${src.total - src.blank}/${src.total} figures filled`, src.uncached ? 'err' : 'ok');
    } catch (e) { toast((e as Error).message, 'err'); }
    if (file.current) file.current.value = '';
  };

  if (!DATA) return <div className="card"><div className="bone" style={{ height: 240, borderRadius: 12 }} /></div>;

  const newSet = () => setCreate({ name: hub.projects[0]?.name ?? client.name, rating: 'nb', projectId: hub.projects.find((p) => p.system === 'IGBC')?.id ?? '' });
  const createModal = create && (
    <Modal title="New documentation set" onClose={() => setCreate(null)}
      footer={<><button className="btn btn-out" onClick={() => setCreate(null)}>Cancel</button>
        <button className="btn btn-pri" disabled={!create.name.trim()} onClick={() => {
          const id = uid(); const smp = DATA[create.rating].sample;
          dispatch({ type: 'UPSERT_DOC', item: { id, name: create.name.trim(), rating: create.rating, projectId: create.projectId || undefined, updatedAt: new Date().toISOString(),
            src: { ...smp, rating: create.rating, sample: true }, edits: {}, meta: {} } });
          setActiveId(id); setCreate(null); toast('Created. Showing the worked example until you open the filled workbook.');
        }}><Icon name="plus" size={15} />Create</button></>}>
      <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        <div className="field"><label>Name</label><input value={create.name} onChange={(e) => setCreate({ ...create, name: e.target.value })} placeholder="e.g. Tower A – precertification" /></div>
        <div className="field"><label>Rating system template</label>
          <select value={create.rating} onChange={(e) => setCreate({ ...create, rating: e.target.value })}>
            {[...new Set(Object.values(DATA).map((v) => v.family ?? 'Other'))].map((fam) => (
              <optgroup key={fam} label={fam}>{Object.entries(DATA).filter(([, v]) => (v.family ?? 'Other') === fam).map(([k, v]) => <option key={k} value={k}>{v.title} · {v.sections.reduce((a, s) => a + s.credits.length, 0)} credits{v.facts ? '' : ' · from calculation workbook'}</option>)}</optgroup>))}
          </select></div>
        {hub.settings.modules.certs && <div className="field"><label>Link to certification project (optional)</label>
          <select value={create.projectId} onChange={(e) => setCreate({ ...create, projectId: e.target.value })}><option value="">None</option>{hub.projects.map((p) => <option key={p.id} value={p.id}>{p.system} · {p.name}</option>)}</select></div>}
        <div className="hint">{DATA[create.rating]?.facts ? 'The set starts with an example project. Replace the Project facts with your own; every narrative updates.' : "The set starts with the rating's worked example. Open the project's filled calculation workbook (.xlsx/.xlsm) to fill every figure."}</div>
      </div>
    </Modal>
  );

  if (!doc || !R) {
    return (
      <div>
        <div className="ph"><div><div className="ph-eyebrow">Certifications</div><div className="ph-title">Documentation</div>
          <div className="ph-sub">Credit narratives from your templates, filled from the calculation workbook, with a review workflow per credit.</div></div></div>
        <div className="card"><EmptyState icon={<Icon name="file" size={30} />} title={`No documentation sets for ${client.name} yet`}
          body={`Start a set from one of ${Object.keys(DATA).length} rating templates (IGBC, LEED, GRIHA) (${Object.values(DATA).reduce((a, r) => a + r.sections.reduce((b, s) => b + s.credits.length, 0), 0)} credit narratives). Green figures come from the workbook, yellow facts are typed by the team and confirmed, red marks workbook cells still blank.`}>
          <button className="btn btn-pri btn-lg" onClick={newSet}><Icon name="plus" size={16} />New documentation set</button>
        </EmptyState></div>
        {createModal}
      </div>
    );
  }

  const S = doc.src;
  const groups = R.sections.map((sec) => ({ title: sec.title, credits: sec.credits.filter((c) => (showAll || isTargeted(c, S)) && (filter === 'all' || c.id === 'Project' ? filter === 'all' : (doc.meta[c.id]?.status ?? 'Not started') === filter)) })).filter((g) => g.credits.length);
  const visible = groups.flatMap((g) => g.credits);
  const setMeta = (credit: string, patch: DocSet['meta'][string]) => dispatch({ type: 'DOC_META', id: doc.id, credit, patch });

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Certifications · {R.title}</div>
          <div className="ph-title">{doc.name}</div>
          <div className="ph-sub">
            {S.sample ? <span className="badge b-warn">{R.facts ? 'Example project – enter your Project facts' : 'Worked example – open the filled workbook'}</span> : <span className="badge b-pri">{R.facts ? 'Project facts entered' : `From ${S.file ?? 'workbook'}`}</span>}
            <span>{S.project}</span>{summary && <span>· {summary.pctReady}% of targeted credits ready · {summary.pctFacts}% of facts typed</span>}
          </div>
        </div>
        <div className="ph-actions">
          {hub.docs.length > 1 && <label className="mini">Set <select value={doc.id} onChange={(e) => setActiveId(e.target.value)}>{hub.docs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}
          <button className="btn btn-ghost" onClick={newSet}><Icon name="plus" size={16} />New set</button>
          <input ref={file} type="file" accept=".xlsx,.xlsm" hidden onChange={(e) => openWorkbook(e.target.files?.[0])} />
          {R.facts
            ? <button className="btn btn-out" onClick={() => setFactsOpen(true)}><Icon name="edit" size={16} />Project facts</button>
            : <button className="btn btn-out" onClick={() => file.current?.click()}><Icon name="upload" size={16} />Open filled workbook</button>}
          <button className="btn btn-pri" onClick={async () => { const m = await copyRich(visible.map((c) => creditDoc(c, S, doc.edits))); toast(m || 'Copy was blocked; select the text on a card instead', m ? 'ok' : 'err'); }}><Icon name="copy" size={16} />Copy all for Word</button>
        </div>
      </div>

      {S.uncached && <div className="notice err-n"><Icon name="alert" size={16} /><span>This workbook has no calculated values stored. Open it in Excel, let it calculate, save, then open it here again.</span></div>}
      {!S.sample && S.blank > 0 && <div className="notice"><Icon name="info" size={16} /><span className="grow">{S.total - S.blank} of {S.total} {R.facts ? 'project facts are entered. Red items are still blank: open Project facts.' : 'workbook figures are filled. Red items are still blank in the workbook.'}</span></div>}
      <div className="notice info"><Icon name="check" size={16} /><span className="grow">Every figure, name and document reference must be checked by the project lead before submission. <b>Green</b> = {R.facts ? 'from Project facts' : 'read from the workbook (hover for its cell)'} · <b>yellow</b> = project fact to type and confirm · <b>red</b> = {R.facts ? 'project fact not yet entered' : 'figure not yet filled in the workbook'}.</span></div>

      <div className="docs-wrap">
        <aside className="docs-side">
          <div className="card" style={{ padding: 14 }}>
            {([['Project', S.project], ['Stage', S.totals.stage], ['Claimed points', S.totals.pts], ['Level', S.totals.level], ['Mandatory', S.totals.mand]] as [string, unknown][]).map(([k, v]) => (
              <div key={k} className="row" style={{ justifyContent: 'space-between', fontSize: '.83rem', flexWrap: 'nowrap' }}><span className="muted">{k}</span><b className="num" style={{ textAlign: 'right' }}>{v == null || v === '' ? '–' : String(v)}</b></div>))}
            {summary && (<>
              <div className="divider" style={{ margin: '10px 0' }} />
              <div className="doc-bar">{DOC_STATUSES.map((s) => summary.byStatus[s] ? <span key={s} className={`seg-${STATUS_TONE[s]}`} style={{ flex: summary.byStatus[s] }} title={`${s}: ${summary.byStatus[s]}`} /> : null)}</div>
              <div className="stack" style={{ gap: 3, marginTop: 8 }}>
                {DOC_STATUSES.filter((s) => summary.byStatus[s]).map((s) => (
                  <button key={s} className={`doc-filter${filter === s ? ' on' : ''}`} onClick={() => setFilter(filter === s ? 'all' : s)}><span className={`badge ${STATUS_TONE[s]}`}>{summary.byStatus[s]}</span>{s}</button>))}
              </div>
            </>)}
          </div>
          <label className="row cell-sub" style={{ gap: 6, margin: '10px 2px' }}><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />Show credits targeted "No"</label>
          <nav className="docs-idx" aria-label="Credits">
            {groups.map((g) => (
              <div key={g.title}><div className="share-group" style={{ marginTop: 10 }}>{g.title}</div>
                {g.credits.map((c) => { const n = creditCounts(c, S, doc.edits); const st = doc.meta[c.id]?.status ?? 'Not started';
                  return <a key={c.id} href={`#dc-${c.id.replace(/\W/g, '')}`} className="docs-link"><span className={`dot ${DOC_DONE.includes(st) ? 'ok' : n.fills === n.done && !n.miss ? 'mid' : 'todo'}`} /><code>{c.id}</code><span>{c.name}</span></a>; })}
              </div>))}
          </nav>
        </aside>

        <section style={{ minWidth: 0 }}>
          {filter !== 'all' && <div className="notice info"><Icon name="info" size={16} /><span className="grow">Showing credits with status <b>{filter}</b>.</span><button className="btn btn-sm btn-out" onClick={() => setFilter('all')}>Show all</button></div>}
          {groups.map((g) => (
            <div key={g.title}>
              <div className="sec-title" style={{ marginTop: 18 }}>{g.title}</div>
              {g.credits.map((c) => {
                const n = creditCounts(c, S, doc.edits); const m = doc.meta[c.id] ?? {}; const st = m.status ?? 'Not started';
                const tg = (c.sc ?? [c.id]).map((i) => S.targets[i]).filter(Boolean)[0];
                return (
                  <article key={c.id} id={`dc-${c.id.replace(/\W/g, '')}`} className="card ncard">
                    <div className="ncard-hd">
                      <code className="ncode">{c.id}</code><h3>{c.name}</h3>{c.pts && <span className="cell-sub">{c.pts}</span>}
                      <span className="row" style={{ marginLeft: 'auto', gap: 6 }}>
                        {tg && <span className="badge b-na">Target: {tg}</span>}
                        <span className={`badge ${n.fills === n.done ? 'b-pass' : 'b-warn'}`}>{n.done}/{n.fills} facts</span>
                        {n.miss > 0 && <span className="badge b-fail">{n.miss} {R.facts ? 'project facts missing' : 'blank in workbook'}</span>}
                      </span>
                    </div>
                    {c.id !== 'Project' && (
                      <div className="ncard-meta">
                        <label className="mini">Status <select value={st} onChange={(e) => setMeta(c.id, { status: e.target.value as DocStatus })} className={`st-${STATUS_TONE[st]}`}>{DOC_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
                        <label className="mini">Owner <input defaultValue={m.owner ?? ''} placeholder="e.g. MEP" onBlur={(e) => e.target.value !== (m.owner ?? '') && setMeta(c.id, { owner: e.target.value.trim() })} style={{ width: 110 }} /></label>
                        <label className="mini">Due <input type="date" defaultValue={m.due ?? ''} onChange={(e) => setMeta(c.id, { due: e.target.value })} style={{ width: 140 }} /></label>
                      </div>
                    )}
                    <div className="ndoc">
                      <h4>Intent</h4><p><Text t={c.intent} c={c} part="intent0" src={S} edits={doc.edits} onFill={onFill} /></p>
                      <h4>Approach</h4><ul>{c.approach.map((a, i) => <li key={i}><Text t={a} c={c} part={'approach' + i} src={S} edits={doc.edits} onFill={onFill} /></li>)}</ul>
                      <h4>Supporting documents</h4><ul>{c.evidence.map((a, i) => <li key={i}><Text t={a} c={c} part={'evidence' + i} src={S} edits={doc.edits} onFill={onFill} /></li>)}</ul>
                      <h4>Result</h4><p><Text t={c.result} c={c} part="result0" src={S} edits={doc.edits} onFill={onFill} /></p>
                    </div>
                    {!!c.preempt?.length && <details className="npre"><summary>Reviewer points to cover (team note, not copied)</summary><ul>{c.preempt.map((p, i) => <li key={i}>{p}</li>)}</ul></details>}
                    <div className="row" style={{ marginTop: 10 }}>
                      <button className="btn btn-out btn-sm" onClick={async () => { const msg = await copyRich([creditDoc(c, S, doc.edits)]); toast(msg || 'Copy blocked', msg ? 'ok' : 'err'); }}><Icon name="copy" size={14} />Copy for Word</button>
                      <span className="grow" />
                      {c.id !== 'Project' && !DOC_DONE.includes(st) && n.fills === n.done && n.miss === 0 && <button className="btn btn-ghost btn-sm" onClick={() => setMeta(c.id, { status: 'Ready to submit' })}><Icon name="check" size={14} />Mark ready</button>}
                    </div>
                  </article>
                );
              })}
            </div>
          ))}
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn btn-danger-out btn-sm" onClick={async () => { if (await ask(`Delete documentation set "${doc.name}" and its typed facts?`)) { dispatch({ type: 'DELETE_DOC', id: doc.id }); setActiveId(null); toast('Documentation set deleted', 'info'); } }}><Icon name="trash" size={14} />Delete this set</button>
          </div>
        </section>
      </div>
      {createModal}
      {factsOpen && (
        <Modal title="Project facts" onClose={() => setFactsOpen(false)}
          footer={<><button className="btn btn-out" onClick={() => setFactsOpen(false)}>Cancel</button>
            <button className="btn btn-pri" onClick={() => {
              const values = { ...S.values };
              // Example values never carry over: a fact left blank stays blank (red) until the team types it.
              for (const [n, f] of R.tokens) values[`${n}|${f}`] = (facts[n] ?? (S.sample ? '' : values[`${n}|${f}`]) ?? '').trim();
              const v = (n: string) => R.tokens.find(([t]) => t === n) ? values[`${n}|${R.tokens.find(([t]) => t === n)![1]}`] || undefined : undefined;
              const blank = R.tokens.filter(([n, f]) => !values[`${n}|${f}`]).length;
              dispatch({ type: 'UPDATE_DOC_SRC', id: doc.id, src: { ...S, values, sample: false, blank, total: R.tokens.length, project: v('Proj_Name') ?? S.project,
                totals: { pts: v('Total_Points'), level: v('Cert_Level'), stage: v('Proj_Stage'), mand: undefined } } });
              setFactsOpen(false); toast('Project facts saved; every narrative updated.');
            }}><Icon name="save" size={15} />Save facts</button></>}>
          <div className="hint" style={{ marginBottom: 12 }}>Entered once, used in every credit narrative. Type figures as they should appear in the report (e.g. 38,500).</div>
          <div className="form-grid">
            {R.tokens.map(([n, f]) => (
              <div className="field" key={n}><label>{S.labels[n] ?? n}</label>
                <input defaultValue={S.sample ? '' : S.values[`${n}|${f}`] ?? ''} placeholder={R.sample.values[`${n}|${f}`] ?? ''} onChange={(e) => setFacts((x) => ({ ...x, [n]: e.target.value }))} /></div>))}
          </div>
        </Modal>
      )}
    </div>
  );
};
export default Documentation;

export const partsOf = parts;

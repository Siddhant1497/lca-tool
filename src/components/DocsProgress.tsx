import React from 'react';
import type { DocSummary } from '../utils/docsProgress';
import { DOC_STATUSES, DOC_DONE, type DocStatus } from '../utils/narrative';
import Icon from './ui/Icon';

const TONE: Record<DocStatus, string> = {
  'Not started': 'b-na', Drafting: 'b-warn', 'Internal review': 'b-info', 'Awaiting client': 'b-fail',
  'Ready to submit': 'b-pri', Submitted: 'b-info', 'Reviewer query': 'b-fail', Approved: 'b-pass',
};
const fmtDate = (d?: string) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—');

/** Read-only credit tracker shown to clients: status, due date, what is waiting on them. */
const DocsProgress: React.FC<{ docs: DocSummary[] }> = ({ docs }) => (
  <div>
    <div className="ph"><div><div className="ph-eyebrow">Certification</div><div className="ph-title">Documentation progress</div>
      <div className="ph-sub">Credit-by-credit status of the submission documents.</div></div></div>
    {docs.map((d) => {
      const waiting = d.credits.filter((c) => c.status === 'Awaiting client');
      const sections = [...new Set(d.credits.map((c) => c.section))];
      return (
        <section key={d.id} className="card rise" style={{ marginBottom: 16 }}>
          <div className="card-hd"><span className="card-ic"><Icon name="file" size={17} /></span>
            <div><div className="t">{d.name}</div><div className="s">{d.system} · {d.project}{d.totals.level ? ` · target ${d.totals.level}` : ''}{d.totals.pts ? ` (${d.totals.pts} pts claimed)` : ''}</div></div>
            <div className="r"><span className="badge b-pri">{d.pctReady}% ready</span></div></div>
          <div className="doc-bar" style={{ height: 10 }}>{DOC_STATUSES.map((s) => d.byStatus[s] ? <span key={s} className={`seg-${TONE[s]}`} style={{ flex: d.byStatus[s] }} title={`${s}: ${d.byStatus[s]}`} /> : null)}</div>
          <div className="legend-row">{DOC_STATUSES.filter((s) => d.byStatus[s]).map((s) => <span key={s}><span className={`badge ${TONE[s]}`}>{d.byStatus[s]}</span>{s}</span>)}</div>
          {waiting.length > 0 && <div className="insight warn"><Icon name="alert" size={16} /><span><b>{waiting.length} credit{waiting.length > 1 ? 's' : ''} waiting on your team:</b> {waiting.map((c) => `${c.id} ${c.name}${c.due ? ` (due ${fmtDate(c.due)})` : ''}`).join(' · ')}</span></div>}
          {sections.map((sec) => (
            <div key={sec} style={{ marginTop: 14 }}>
              <div className="share-group">{sec}</div>
              <div className="tbl-wrap"><table>
                <thead><tr><th style={{ width: 90 }}>Credit</th><th>Name</th><th>Points</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead>
                <tbody>{d.credits.filter((c) => c.section === sec).map((c) => (
                  <tr key={c.id}><td><span className="mono cell-sub">{c.id}</span></td><td className="cell-main" style={{ fontWeight: 500 }}>{c.name}</td>
                    <td className="cell-sub">{c.pts}</td><td className="cell-sub">{c.owner ?? '—'}</td><td className="cell-sub">{fmtDate(c.due)}</td>
                    <td><span className={`badge ${TONE[c.status]}`}>{DOC_DONE.includes(c.status) ? '✓ ' : ''}{c.status}</span></td></tr>))}
                </tbody>
              </table></div>
            </div>))}
        </section>
      );
    })}
  </div>
);
export default DocsProgress;

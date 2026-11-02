import React, { useEffect, useMemo, useState } from 'react';
import { useHub } from '../../context/HubContext';
import { useLCA } from '../../context/LCAContext';
import { SHARE_SECTIONS, type SectionKey, type ShareConfig } from '../../context/ShareContext';
import { buildPayload, fillTemplate } from '../../utils/share';
import { saveFile } from '../../utils/platform';
import { disclosures } from '../../utils/hub';
import Icon from '../ui/Icon';
import EmptyState from '../ui/EmptyState';
import Modal from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { SysTag } from './CommandCenter';

const FRAMEWORKS = [
  { id: 'ghgp', label: 'GHG Protocol' }, { id: 'gri', label: 'GRI 305' }, { id: 'brsr', label: 'BRSR Principle 6' }, { id: 'issb', label: 'IFRS S2' },
];
const read = <T,>(k: string): T | null => { try { const s = localStorage.getItem(k); return s ? (JSON.parse(s) as T) : null; } catch { return null; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

/**
 * Build a read-only dashboard for one client: choose sections, frameworks and projects,
 * preview it, then download a single HTML file the client opens in any browser.
 */
const ClientShare: React.FC = () => {
  const { hub, client } = useHub();
  const { dispatch: nav } = useLCA();
  const toast = useToast();
  const certsOn = hub.settings.modules.certs;
  const defaults = (): ShareConfig => ({
    sections: ['kpis', 'pathway', 'split', 'inventory', 'scope3', 'strategy', 'disclosures'],
    frameworks: ['ghgp', 'brsr'], projectIds: [], title: 'Carbon & decarbonisation dashboard',
    preparedBy: read<string>('share_preparedBy') ?? '', note: '', createdAt: '',
  });
  const [cfg, setCfg] = useState<ShareConfig>(() => ({ ...defaults(), ...(read<ShareConfig>(`share_cfg:${client.id}`) ?? {}) }));
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Per-client presets: switching client loads that client's last choices.
  useEffect(() => { setCfg({ ...defaults(), ...(read<ShareConfig>(`share_cfg:${client.id}`) ?? {}) }); }, [client.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { write(`share_cfg:${client.id}`, cfg); write('share_preparedBy', cfg.preparedBy); }, [cfg, client.id]);

  const on = (k: SectionKey) => cfg.sections.includes(k);
  const toggle = (k: SectionKey) => setCfg({ ...cfg, sections: on(k) ? cfg.sections.filter((x) => x !== k) : [...cfg.sections, k] });
  const sections = SHARE_SECTIONS.filter((s) => s.key !== 'certs' || certsOn);
  const groups = [...new Set(sections.map((s) => s.group))];
  const payload = useMemo(() => buildPayload(hub, client.name, { ...cfg, createdAt: new Date().toISOString() }), [hub, client.name, cfg]);
  const latest = hub.ghg[hub.ghg.length - 1];
  const fwReady = latest ? disclosures(hub.ghg, hub.settings, latest.year) : [];

  const make = async () => {
    const res = await fetch('./client-view-template.html');
    if (!res.ok) throw new Error('Client view template not found. Run "npm run build:viewer" (it runs automatically with npm run dev / build).');
    return fillTemplate(await res.text(), buildPayload(hub, client.name, { ...cfg, createdAt: new Date().toISOString() }));
  };
  const doPreview = async () => { setBusy(true); try { setPreview(await make()); } catch (e) { toast((e as Error).message, 'err'); } setBusy(false); };
  const doDownload = async () => {
    setBusy(true);
    try {
      const html = await make();
      const name = `${client.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client'}-dashboard-${new Date().toISOString().slice(0, 10)}.html`;
      if (await saveFile(name, new Blob([html], { type: 'text/html' }))) toast(`Client dashboard ready: ${name}`);
    } catch (e) { toast((e as Error).message, 'err'); }
    setBusy(false);
  };

  if (!hub.loaded || (!hub.ghg.length && !hub.projects.length)) {
    return (
      <div>
        <div className="ph"><div><div className="ph-eyebrow">Carbon & portfolio</div><div className="ph-title">Client sharing</div></div></div>
        <div className="card"><EmptyState icon={<Icon name="link" size={30} />} title={`Nothing to share for ${client.name} yet`}
          body="Add this client's inventory (Carbon Calculator or Data Manager) first. Then choose exactly which sections they see and send them a read-only dashboard.">
          <button className="btn btn-pri btn-lg" onClick={() => nav({ type: 'SET_PAGE', page: 'calculator' })}><Icon name="calc" size={16} />Open Carbon Calculator</button>
        </EmptyState></div>
      </div>
    );
  }

  const inc = payload.state;
  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Carbon & portfolio</div>
          <div className="ph-title">Share with {client.name}</div>
          <div className="ph-sub">Pick what this client may see. They get a read-only dashboard file that contains only that data. Nothing else from your workspace is included.</div>
        </div>
        <div className="ph-actions">
          <button className="btn btn-out" onClick={doPreview} disabled={busy || !cfg.sections.length}><Icon name="grid" size={16} />Preview</button>
          <button className="btn btn-pri" onClick={doDownload} disabled={busy || !cfg.sections.length}><Icon name="download" size={16} />{busy ? 'Building…' : 'Download client dashboard'}</button>
        </div>
      </div>
      {hub.isSample && <div className="notice"><Icon name="alert" size={16} /><span className="grow">This client is using <b>sample data</b>; the shared file will be marked as sample.</span></div>}

      <div className="share-grid">
        <section className="card rise" style={{ ['--i' as string]: 0 }}>
          <div className="card-hd"><span className="card-ic"><Icon name="check" size={17} /></span><div><div className="t">1 · What the client sees</div><div className="s">Unticked sections are left out of the file entirely</div></div>
            <div className="r"><button className="btn btn-ghost btn-sm" onClick={() => setCfg({ ...cfg, sections: sections.map((s) => s.key) })}>All</button><button className="btn btn-ghost btn-sm" onClick={() => setCfg({ ...cfg, sections: [] })}>None</button></div></div>
          {groups.map((g) => (
            <div key={g} style={{ marginBottom: 12 }}>
              <div className="share-group">{g}</div>
              {sections.filter((s) => s.group === g).map((s) => (
                <label key={s.key} className={`share-opt${on(s.key) ? ' on' : ''}`}>
                  <input type="checkbox" checked={on(s.key)} onChange={() => toggle(s.key)} />
                  <span><b>{s.label}</b><span className="cell-sub">{s.hint}</span></span>
                </label>
              ))}
              {g === 'Reporting' && on('disclosures') && (
                <div className="share-sub">
                  {FRAMEWORKS.map((f) => {
                    const r = fwReady.find((x) => x.id === f.id);
                    const pct = r ? Math.round((r.lines.filter((l) => l.status === 'ok').length / r.lines.length) * 100) : 0;
                    return (
                      <label key={f.id} className="row" style={{ gap: 7, fontSize: '.84rem' }}>
                        <input type="checkbox" checked={cfg.frameworks.includes(f.id)} onChange={(e) => setCfg({ ...cfg, frameworks: e.target.checked ? [...cfg.frameworks, f.id] : cfg.frameworks.filter((x) => x !== f.id) })} />
                        {f.label}<span className="cell-sub">· {pct}% available</span>
                      </label>);
                  })}
                </div>
              )}
              {g === 'Certifications' && on('certs') && (
                <div className="share-sub">
                  {hub.projects.length === 0 && <span className="cell-sub">No certification projects for this client.</span>}
                  {hub.projects.map((p) => (
                    <label key={p.id} className="row" style={{ gap: 7, fontSize: '.84rem', flexWrap: 'nowrap' }}>
                      <input type="checkbox" checked={cfg.projectIds.includes(p.id)} onChange={(e) => setCfg({ ...cfg, projectIds: e.target.checked ? [...cfg.projectIds, p.id] : cfg.projectIds.filter((x) => x !== p.id) })} />
                      <SysTag s={p.system} /><span>{p.name}</span>
                    </label>))}
                </div>
              )}
            </div>
          ))}
        </section>

        <div className="stack">
          <section className="card rise" style={{ ['--i' as string]: 1 }}>
            <div className="card-hd"><span className="card-ic"><Icon name="edit" size={17} /></span><div><div className="t">2 · Cover details</div><div className="s">Shown at the top of the client's dashboard</div></div></div>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div className="field"><label>Dashboard title</label><input value={cfg.title} onChange={(e) => setCfg({ ...cfg, title: e.target.value })} /></div>
              <div className="field"><label>Prepared by</label><input value={cfg.preparedBy} onChange={(e) => setCfg({ ...cfg, preparedBy: e.target.value })} placeholder="Your name / firm" /></div>
              <div className="field"><label>Note to the client (optional)</label><textarea rows={3} value={cfg.note} onChange={(e) => setCfg({ ...cfg, note: e.target.value })} placeholder="e.g. Draft for review – FY 2025-26 figures pending March bills." /></div>
            </div>
          </section>

          <section className="card rise" style={{ ['--i' as string]: 2 }}>
            <div className="card-hd"><span className="card-ic"><Icon name="info" size={17} /></span><div><div className="t">3 · What's inside the file</div><div className="s">Data minimisation: only what the ticked sections need</div></div></div>
            <ul className="incl">
              <li className={inc.ghg.length ? 'y' : 'n'}>{inc.ghg.length ? `${inc.ghg.length} inventory years (${inc.ghg[0].year}–${inc.ghg[inc.ghg.length - 1].year})` : 'No inventory data'}</li>
              <li className={inc.ghg.some((g) => g.s3cats) ? 'y' : 'n'}>{inc.ghg.some((g) => g.s3cats) ? 'Scope 3 category split' : 'No Scope 3 category split'}</li>
              <li className={inc.ghg.some((g) => g.denom) ? 'y' : 'n'}>{inc.ghg.some((g) => g.denom) ? 'Intensity denominators (area, FTE, turnover)' : 'No floor area / headcount / turnover'}</li>
              <li className={inc.levers.length ? 'y' : 'n'}>{inc.levers.length ? `${inc.levers.length} decarbonisation levers` : 'No levers'}</li>
              {certsOn && <li className={inc.projects.length ? 'y' : 'n'}>{inc.projects.length ? `${inc.projects.length} certification project(s)` : 'No certification projects'}</li>}
              <li className="n">Activity data, emission-factor library, other clients — never included</li>
            </ul>
          </section>

          <section className="card rise" style={{ ['--i' as string]: 3 }}>
            <div className="card-hd"><span className="card-ic"><Icon name="link" size={17} /></span><div><div className="t">How the client opens it</div></div></div>
            <ol className="how">
              <li>Download the dashboard file (one <code>.html</code> file, works offline).</li>
              <li>Send it by email, WhatsApp or a shared drive link — or upload it to your website / any static host for a web link.</li>
              <li>The client double-clicks it: it opens in their browser as a read-only dashboard. No login or install needed.</li>
            </ol>
            <div className="hint">Data changes later? Generate a new file. Each file is a dated snapshot.</div>
          </section>
        </div>
      </div>

      {preview && (
        <Modal wide title={`Preview – what ${client.name} will see`} onClose={() => setPreview(null)}
          footer={<><span className="cell-sub grow">Read-only preview</span><button className="btn btn-out" onClick={() => setPreview(null)}>Close</button><button className="btn btn-pri" onClick={() => { setPreview(null); void doDownload(); }}><Icon name="download" size={15} />Download</button></>}>
          <iframe title="Client dashboard preview" srcDoc={preview} className="share-frame" />
        </Modal>
      )}
    </div>
  );
};
export default ClientShare;

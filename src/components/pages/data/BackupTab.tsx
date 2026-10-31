import React, { useRef } from 'react';
import { useHub } from '../../../context/HubContext';
import { download, toCsv, activityT } from '../../../utils/hub';
import type { HubState } from '../../../types/hub';
import Icon from '../../ui/Icon';
import { useToast } from '../../ui/Toast';
import { Section } from './fields';

const stamp = () => new Date().toISOString().slice(0, 10);

const BackupTab: React.FC = () => {
  const { hub, dispatch } = useHub();
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);

  const exports = [
    { label: 'GHG inventory', n: hub.ghg.length, run: () => download(`ghg-inventory-${stamp()}.csv`, toCsv(['year', 'scope1', 'scope2', 'scope3', 'scope2_market'], hub.ghg.map((g) => [g.year, g.scope1, g.scope2, g.scope3, g.scope2m ?? '']))) },
    { label: 'Certification projects', n: hub.projects.length, run: () => download(`certifications-${stamp()}.csv`, toCsv(['name', 'system', 'version', 'target', 'needed', 'secured', 'likely', 'max', 'unit', 'stage', 'next_action'], hub.projects.map((p) => [p.name, p.system, p.version, p.targetLabel, p.needed, p.secured, p.likely, p.max, p.unit, p.stage, p.next]))) },
    { label: 'Decarbonisation levers', n: hub.levers.length, run: () => download(`levers-${stamp()}.csv`, toCsv(['name', 'scope', 'abatement_tco2e_yr', 'status'], hub.levers.map((l) => [l.name, l.scope, l.abatement, l.status]))) },
    { label: 'Activities with factors', n: hub.activities.length, run: () => download(`activities-${stamp()}.csv`, toCsv(['year', 'description', 'quantity', 'unit', 'factor', 'kgco2e_per_unit', 'scope', 'scope2_basis', 'tco2e', 'factor_source'], hub.activities.map((a) => { const f = hub.factors.find((x) => x.id === a.factorId); return [a.year, a.description, a.quantity, f?.unit, f?.name, f?.kgPerUnit, f?.scope, f?.s2basis ?? '', activityT(a, f).toFixed(3), f?.source]; }))) },
  ];

  const restore = async (file?: File) => {
    if (!file) return;
    try {
      const s = JSON.parse(await file.text()) as Partial<HubState>;
      if (!s || typeof s !== 'object' || !Array.isArray(s.ghg) || !Array.isArray(s.projects)) throw new Error('Not a SustainHub backup file.');
      if (!confirm('Replace all current portfolio data with this backup?')) return;
      dispatch({ type: 'RESTORE', state: s as HubState });
      toast(`Restored ${s.ghg.length} years, ${s.projects.length} projects`);
    } catch (e) { toast(e instanceof SyntaxError ? 'File is not valid JSON.' : (e as Error).message, 'err'); }
    if (ref.current) ref.current.value = '';
  };

  return (
    <>
      <Section title="Export to CSV" sub="Opens in Excel. Use these for client deliverables or to move data into a reporting template.">
        <div className="tbl-wrap"><table><tbody>
          {exports.map((e) => (
            <tr key={e.label}><td className="cell-main">{e.label}</td><td className="cell-sub">{e.n} row{e.n === 1 ? '' : 's'}</td>
              <td style={{ textAlign: 'right' }}><button className="btn btn-out btn-sm" disabled={!e.n} onClick={e.run}><Icon name="download" size={14} />CSV</button></td></tr>
          ))}
        </tbody></table></div>
      </Section>

      <Section title="Backup & restore" sub="Data is stored only in this browser. Download a backup regularly, and to move between computers.">
        <div className="row">
          <button className="btn btn-pri" onClick={() => { download(`sustainhub-backup-${stamp()}.json`, JSON.stringify(hub, null, 2), 'application/json'); toast('Backup downloaded'); }}><Icon name="download" size={16} />Download backup (.json)</button>
          <input ref={ref} type="file" accept=".json,application/json" hidden onChange={(e) => restore(e.target.files?.[0])} />
          <button className="btn btn-out" onClick={() => ref.current?.click()}><Icon name="upload" size={16} />Restore from backup</button>
        </div>
      </Section>

      <Section title="Danger zone" sub="These cannot be undone, so download a backup first.">
        <div className="row">
          <button className="btn btn-danger-out" onClick={() => { if (confirm('Delete ALL portfolio data (inventory, projects, levers, factors, activities)?')) { dispatch({ type: 'CLEAR' }); toast('All portfolio data cleared', 'info'); } }}><Icon name="trash" size={16} />Clear all portfolio data</button>
          <button className="btn btn-ghost" onClick={() => { if (confirm('Replace current data with the illustrative sample?')) { dispatch({ type: 'LOAD_SAMPLE' }); toast('Sample data loaded', 'info'); } }}>Load sample data</button>
        </div>
      </Section>
    </>
  );
};
export default BackupTab;

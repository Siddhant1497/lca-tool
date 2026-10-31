import React, { useState } from 'react';
import { useHub } from '../../context/HubContext';
import { useLCA } from '../../context/LCAContext';
import Icon, { type IconName } from '../ui/Icon';
import InventoryTab from './data/InventoryTab';
import ProjectsTab from './data/ProjectsTab';
import LeversTab from './data/LeversTab';
import CalculatorTab from './data/CalculatorTab';
import BackupTab from './data/BackupTab';

type Tab = 'inventory' | 'projects' | 'levers' | 'calc' | 'backup';

const DataManager: React.FC = () => {
  const { hub } = useHub();
  const { dispatch } = useLCA();
  const [tab, setTab] = useState<Tab>('inventory');
  const tabs: { id: Tab; label: string; icon: IconName; count?: number }[] = [
    { id: 'inventory', label: 'GHG inventory', icon: 'chart', count: hub.ghg.length },
    { id: 'projects', label: 'Certifications', icon: 'building', count: hub.projects.length },
    { id: 'levers', label: 'Levers', icon: 'zap', count: hub.levers.length },
    { id: 'calc', label: 'Activity calculator', icon: 'calc', count: hub.activities.length },
    { id: 'backup', label: 'Export & backup', icon: 'save' },
  ];
  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Portfolio</div>
          <div className="ph-title">Data Manager</div>
          <div className="ph-sub">Everything the Command Center shows comes from here. Changes save automatically in this browser.</div>
        </div>
        <div className="ph-actions">
          <button className="btn btn-pri" onClick={() => dispatch({ type: 'SET_PAGE', page: 'hub' })}><Icon name="grid" size={16} />View dashboard</button>
        </div>
      </div>
      {hub.isSample && <div className="notice"><Icon name="alert" size={16} /><span>You are editing the illustrative sample. Use <b>Export & backup → Clear all</b> to start with your own data.</span></div>}
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={15} />{t.label}{t.count !== undefined && <span className="count">{t.count}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'inventory' && <InventoryTab />}
        {tab === 'projects' && <ProjectsTab />}
        {tab === 'levers' && <LeversTab />}
        {tab === 'calc' && <CalculatorTab />}
        {tab === 'backup' && <BackupTab />}
      </div>
    </div>
  );
};
export default DataManager;

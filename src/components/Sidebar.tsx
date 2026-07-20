import React from 'react';
import { useLCA } from '../context/LCAContext';
import type { AppPage } from '../types/lca';

const NAV: { page: AppPage; icon: string; label: string; sect?: string }[] = [
  { page: 'dashboard',  icon: '🏠', label: 'Dashboard',     sect: 'OVERVIEW' },
  { page: 'project',    icon: '📐', label: 'Project Setup', sect: 'SETUP' },
  { page: 'materials',  icon: '🧱', label: 'Materials' },
  { page: 'results',    icon: '📊', label: 'LCA Results',   sect: 'ANALYSIS' },
  { page: 'compliance', icon: '✅', label: 'Compliance' },
  { page: 'export',     icon: '📄', label: 'Export Report', sect: 'REPORT' },
];

const Sidebar: React.FC = () => {
  const { state, dispatch } = useLCA();
  return (
    <aside className="sidebar">
      {NAV.map((item) => (
        <React.Fragment key={item.page}>
          {item.sect && <div className="nav-sect">{item.sect}</div>}
          <button
            className={`nav-item${state.activePage === item.page ? ' active' : ''}`}
            onClick={() => dispatch({ type: 'SET_PAGE', page: item.page })}
          >
            <span>{item.icon}</span>{item.label}
          </button>
        </React.Fragment>
      ))}
    </aside>
  );
};
export default Sidebar;

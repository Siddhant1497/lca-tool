import React from 'react';
import { useLCA } from '../context/LCAContext';
import { useUi } from '../context/UiContext';
import type { AppPage } from '../types/lca';

const NAV: { page: AppPage; icon: string; label: string; sect?: string }[] = [
  { page: 'hub',        icon: '🌍', label: 'Command Center', sect: 'PORTFOLIO' },
  { page: 'dashboard',  icon: '🏠', label: 'LCA Overview',   sect: 'LCA' },
  { page: 'project',    icon: '📐', label: 'Project Setup' },
  { page: 'materials',  icon: '🧱', label: 'Materials' },
  { page: 'results',    icon: '📊', label: 'LCA Results',    sect: 'ANALYSIS' },
  { page: 'compliance', icon: '✅', label: 'Compliance' },
  { page: 'export',     icon: '📄', label: 'Export Report',  sect: 'REPORT' },
];

const Sidebar: React.FC = () => {
  const { state, dispatch } = useLCA();
  const { collapsed, toggleSidebar } = useUi();
  return (
    <aside className="sidebar" aria-label="Primary">
      <nav>
        {NAV.map((item) => (
          <React.Fragment key={item.page}>
            {item.sect && <div className="nav-sect"><span>{item.sect}</span></div>}
            <button
              className={`nav-item${state.activePage === item.page ? ' active' : ''}`}
              aria-current={state.activePage === item.page ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
              onClick={() => dispatch({ type: 'SET_PAGE', page: item.page })}
            >
              <span className="ni" aria-hidden>{item.icon}</span>
              <span className="nl">{item.label}</span>
            </button>
          </React.Fragment>
        ))}
      </nav>
      <button className="nav-item collapse-btn" onClick={toggleSidebar}
        aria-expanded={!collapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar  [' : undefined}>
        <span className="ni" aria-hidden>{collapsed ? '»' : '«'}</span>
        <span className="nl">Collapse <kbd>[</kbd></span>
      </button>
    </aside>
  );
};
export default Sidebar;

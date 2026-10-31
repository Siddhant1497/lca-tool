import React from 'react';
import { useLCA } from '../context/LCAContext';
import { useUi } from '../context/UiContext';
import { useHub } from '../context/HubContext';
import { atRisk } from '../utils/hub';
import Icon from './ui/Icon';
import { NAV } from './nav';

const Sidebar: React.FC = () => {
  const { state, dispatch } = useLCA();
  const { collapsed, toggleSidebar } = useUi();
  const { hub } = useHub();
  const risk = hub.projects.filter(atRisk).length;
  return (
    <aside className="sidebar" aria-label="Primary">
      <nav>
        {NAV.map((item) => {
          const active = state.activePage === item.page;
          return (
            <React.Fragment key={item.page}>
              {item.sect && <div className="nav-sect">{item.sect}</div>}
              <button className={`nav-item${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : undefined} onClick={() => dispatch({ type: 'SET_PAGE', page: item.page })}>
                <span className="ni"><Icon name={item.icon} /></span>
                <span className="nl">{item.label}</span>
                {item.page === 'hub' && risk > 0 && <span className="nav-badge" title={`${risk} certification(s) at risk`}>{risk}</span>}
              </button>
            </React.Fragment>
          );
        })}
      </nav>
      <button className="nav-item collapse-btn" onClick={toggleSidebar} aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar  [' : undefined}>
        <span className="ni"><Icon name={collapsed ? 'chevR' : 'chevL'} /></span>
        <span className="nl">Collapse</span><kbd>[</kbd>
      </button>
    </aside>
  );
};
export default Sidebar;

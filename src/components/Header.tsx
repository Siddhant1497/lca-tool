import React from 'react';
import { useLCA } from '../context/LCAContext';
import { useUi } from '../context/UiContext';
import { useHub } from '../context/HubContext';
import Icon from './ui/Icon';
import { sectionOf } from './nav';

const Header: React.FC = () => {
  const { state } = useLCA();
  const { hub } = useHub();
  const { theme, toggleTheme } = useUi();
  const { sect, label } = sectionOf(state.activePage);
  const isHub = sect !== 'Building LCA';
  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark"><Icon name="leaf" size={18} /></span>
        <span className="brand-name">Sustain<span>Hub</span></span>
      </div>
      <nav className="crumbs" aria-label="Breadcrumb">
        <span className="hide-sm">{sect}</span><Icon name="chevR" size={14} /><b>{label}</b>
      </nav>
      <div className="hdr-right">
        <button className="hdr-search" aria-label="Open command palette (Ctrl+K)"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}>
          <Icon name="search" size={15} /><span>Search or jump to…</span><kbd>Ctrl K</kbd>
        </button>
        <span className="chip" title={isHub ? 'Portfolio data' : 'Active LCA project'}>
          <span className="dot" style={isHub && hub.isSample ? { background: 'var(--warn)' } : undefined} />
          {isHub ? (hub.isSample ? 'Sample portfolio' : hub.loaded ? 'My portfolio' : 'No data yet') : (state.project?.name ?? 'LCA project')}
        </span>
        <button className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title="Toggle theme">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
      </div>
    </header>
  );
};
export default Header;

import React from 'react';
import { useLCA } from '../context/LCAContext';
import { useUi } from '../context/UiContext';

const Header: React.FC = () => {
  const { state } = useLCA();
  const { theme, toggleTheme } = useUi();
  return (
    <header className="header">
      <span className="logo">🌿 Sustain<span>Hub</span></span>
      <span style={{ color: '#93C5FD' }}>|</span>
      <span className="hdr-proj">{state.project?.name ?? 'LCA Tool'}</span>
      <span className="sub">GHG · LEED · IGBC · GRIHA · EDGE · WELL · Fitwel · LCA</span>
      <button className="theme-btn" onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title="Toggle dark mode">
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </header>
  );
};
export default Header;

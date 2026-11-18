import React from 'react';
import { useLCA } from '../context/LCAContext';

const Header: React.FC = () => {
  const { state } = useLCA();
  return (
    <header className="header">
      <span className="logo">🏗️ LCA<span>Tool</span></span>
      <span style={{ color: '#93C5FD' }}>|</span>
      <span style={{ fontSize: '.88rem', color: '#BFDBFE' }}>{state.project?.name ?? 'LCA Tool'}</span>
      <span className="sub">Free screening LCA · generic data · EN 15978 modules</span>
    </header>
  );
};
export default Header;

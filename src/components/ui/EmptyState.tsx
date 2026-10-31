import React from 'react';

interface Props { icon: React.ReactNode; title: string; body: string; children?: React.ReactNode; compact?: boolean }

/** Intentional empty state: says what this area is for, what to do next, and offers the action. */
const EmptyState: React.FC<Props> = ({ icon, title, body, children, compact }) => (
  <div className={`empty-state${compact ? ' compact' : ''}`}>
    <div className="es-art" aria-hidden>{icon}</div>
    <h3>{title}</h3>
    <p>{body}</p>
    {children && <div className="row" style={{ justifyContent: 'center' }}>{children}</div>}
  </div>
);
export default EmptyState;

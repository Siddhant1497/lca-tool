import React from 'react';

/** Number inputs keep a string draft so users can type "1." or clear the box without the value jumping. */
export type Draft<T> = { [K in keyof T]: T[K] extends number ? string : T[K] extends number | null | undefined ? string : T[K] };
export const n = (s: string) => (s.trim() === '' ? NaN : Number(s));
export const okNum = (s: string, min = 0) => Number.isFinite(n(s)) && n(s) >= min;

interface FProps { label: string; error?: string | false; hint?: string; className?: string; children: React.ReactNode }
export const Field: React.FC<FProps> = ({ label, error, hint, className = '', children }) => (
  <div className={`field ${className}`}>
    <label>{label}</label>
    {children}
    {error ? <span className="hint" style={{ color: 'var(--err)' }}>{error}</span> : hint ? <span className="hint">{hint}</span> : null}
  </div>
);

export const Num: React.FC<{ value: string; onChange: (v: string) => void; invalid?: boolean; step?: number; placeholder?: string; label?: string }> =
  ({ value, onChange, invalid, step = 1, placeholder, label }) => (
    <input type="number" inputMode="decimal" step={step} value={value} placeholder={placeholder} aria-label={label}
      className={invalid ? 'invalid' : ''} onChange={(e) => onChange(e.target.value)} />
  );

/** Wraps a table section with title, description and actions. */
export const Section: React.FC<{ title: string; sub?: string; actions?: React.ReactNode; children: React.ReactNode }> = ({ title, sub, actions, children }) => (
  <section className="card rise" style={{ marginBottom: 16 }}>
    <div className="card-hd">
      <div><div className="t">{title}</div>{sub && <div className="s">{sub}</div>}</div>
      {actions && <div className="r">{actions}</div>}
    </div>
    {children}
  </section>
);

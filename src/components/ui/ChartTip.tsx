import React from 'react';
import { fmt } from '../../utils/hub';

interface P { active?: boolean; label?: string | number; payload?: { name: string; value: number; color?: string; fill?: string; stroke?: string }[];
  unit?: string; showTotal?: boolean; title?: (l: string | number | undefined) => string }

/** Themed tooltip shared by all Command Center charts. */
const ChartTip: React.FC<P> = ({ active, label, payload, unit = 'tCO₂e', showTotal, title }) => {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null);
  const sum = rows.reduce((a, p) => a + (Number(p.value) || 0), 0);
  return (
    <div className="chart-tip">
      <div className="h">{title ? title(label) : label}</div>
      {rows.map((p) => (
        <div className="l" key={p.name}>
          <span><span className="sw" style={{ background: p.color || p.fill || p.stroke }} />{p.name}</span>
          <b>{fmt(p.value)} <span className="muted" style={{ fontWeight: 400 }}>{unit}</span></b>
        </div>
      ))}
      {showTotal && rows.length > 1 && <div className="l tot"><span>Total</span><b>{fmt(sum)} <span className="muted" style={{ fontWeight: 400 }}>{unit}</span></b></div>}
    </div>
  );
};
export default ChartTip;

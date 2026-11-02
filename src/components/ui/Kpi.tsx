import React from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';
import Icon, { type IconName } from './Icon';

interface Props {
  icon: IconName; tone?: 'pri' | 'acc' | 'warn' | 'err' | 's1' | 's2' | 's3';
  label: string; value: React.ReactNode; unit?: string; foot?: React.ReactNode;
  spark?: number[]; i?: number;
}

const Kpi: React.FC<Props> = ({ icon, tone = 'pri', label, value, unit, foot, spark, i = 0 }) => (
  <div className={`kpi rise tone-${tone}`} style={{ ['--i' as string]: i }}>
    <div className="kpi-top">
      <span className="kpi-ic"><Icon name={icon} size={16} /></span>
      <span className="kpi-lbl">{label}</span>
    </div>
    <div className="kpi-val">{value}{unit && <span className="kpi-unit">{unit}</span>}</div>
    <div className="kpi-foot">
      <div className="kpi-sub">{foot}</div>
      {spark && spark.length > 1 && (
        <div className="kpi-spark" aria-hidden>
          <ResponsiveContainer>
            <AreaChart data={spark.map((v, k) => ({ k, v }))} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs><linearGradient id={`sg-${label.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity={0.35} /><stop offset="1" stopColor="currentColor" stopOpacity={0} />
              </linearGradient></defs>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Area dataKey="v" stroke="currentColor" strokeWidth={1.75} fill={`url(#sg-${label.replace(/\W/g, '')})`} isAnimationActive animationDuration={900} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  </div>
);
export default Kpi;

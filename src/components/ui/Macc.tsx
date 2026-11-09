import React, { useLayoutEffect, useRef, useState } from 'react';
import type { MaccBar } from '../../utils/hub';
import { fmt } from '../../utils/hub';

/**
 * Marginal abatement cost curve. Bar width = abatement (tCO2e/yr), height = cost per tonne.
 * Bars below zero save money. Custom SVG because MACC bars have variable widths.
 */
const Macc: React.FC<{ bars: MaccBar[]; currency: string; height?: number }> = ({ bars, currency, height = 280 }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState<{ b: MaccBar; x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(e.contentRect.width, 280)));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  const pad = { l: 58, r: 12, t: 14, b: 30 };
  const iw = w - pad.l - pad.r, ih = height - pad.t - pad.b;
  const xMax = bars.length ? bars[bars.length - 1].x1 : 1;
  const lo = Math.min(0, ...bars.map((b) => b.cost)), hi = Math.max(0, ...bars.map((b) => b.cost));
  const span = hi - lo || 1, yLo = lo - span * 0.08, yHi = hi + span * 0.12;
  const X = (v: number) => pad.l + (v / xMax) * iw;
  const Y = (v: number) => pad.t + ((yHi - v) / (yHi - yLo)) * ih;
  const step = niceStep(yHi - yLo, 5);
  const yt: number[] = []; for (let t = Math.ceil(yLo / step) * step; t <= yHi; t += step) yt.push(+t.toFixed(6));
  const xstep = niceStep(xMax, Math.max(2, Math.floor(iw / 90)));
  const xt: number[] = []; for (let t = 0; t <= xMax + 1e-9; t += xstep) xt.push(t);
  const saving = bars.filter((b) => b.cost < 0).reduce((a, b) => a + (b.x1 - b.x0), 0);

  return (
    <div ref={wrap} style={{ position: 'relative' }} onMouseLeave={() => setHover(null)}>
      <svg width={w} height={height} role="img" aria-label={`MACC: ${bars.length} levers, ${fmt(xMax)} tCO₂e/yr total, ${fmt(saving)} at net saving`}>
        {yt.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={w - pad.r} y1={Y(t)} y2={Y(t)} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : '3 3'} />
            <text x={pad.l - 8} y={Y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">{kfmt(t)}</text>
          </g>
        ))}
        {xt.map((t) => <text key={t} x={X(t)} y={height - 10} textAnchor="middle" fontSize={11} fill="var(--muted)">{kfmt(t)}</text>)}
        <line x1={pad.l} x2={w - pad.r} y1={Y(0)} y2={Y(0)} stroke="var(--border-strong)" strokeWidth={1.5} />
        {bars.map((b, i) => {
          const x = X(b.x0) + 1, bw = Math.max(X(b.x1) - X(b.x0) - 2, 2);
          const y = b.cost >= 0 ? Y(b.cost) : Y(0), bh = Math.max(Math.abs(Y(b.cost) - Y(0)), 2);
          const fill = b.cost < 0 ? 'var(--acc)' : 'var(--warn)';
          return (
            <g key={b.id} className="macc-bar" style={{ ['--i' as string]: i }}
              onMouseMove={(e) => { const r = wrap.current!.getBoundingClientRect(); setHover({ b, x: e.clientX - r.left, y: e.clientY - r.top }); }}>
              <rect x={x} y={y} width={bw} height={bh} rx={3} fill={fill} opacity={hover && hover.b.id !== b.id ? 0.45 : 0.9} />
              {bw > 46 && <text x={x + bw / 2} y={b.cost >= 0 ? y - 5 : y + bh + 12} textAnchor="middle" fontSize={10} fill="var(--muted)">{shorten(b.name, Math.floor(bw / 6))}</text>}
            </g>
          );
        })}
        <text x={12} y={pad.t + ih / 2} fontSize={10} fill="var(--subtle)" transform={`rotate(-90 12 ${pad.t + ih / 2})`} textAnchor="middle">{currency}/tCO₂e</text>
      </svg>
      {hover && (
        <div className="chart-tip" style={{ position: 'absolute', left: Math.min(hover.x + 12, w - 200), top: Math.max(hover.y - 80, 0), pointerEvents: 'none' }}>
          <div className="h">{hover.b.name}</div>
          <div className="l"><span>Cost</span><b>{currency}{fmt(hover.b.cost)} /t</b></div>
          <div className="l"><span>Abatement</span><b>{fmt(hover.b.x1 - hover.b.x0)} t/yr</b></div>
          <div className="l"><span>Annual {hover.b.cost < 0 ? 'saving' : 'cost'}</span><b>{currency}{kfmt(Math.abs(hover.b.cost * (hover.b.x1 - hover.b.x0)))}</b></div>
          <div className="l"><span>Scope · status</span><b>S{hover.b.scope} · {hover.b.status}</b></div>
        </div>
      )}
    </div>
  );
};

function niceStep(range: number, n: number) {
  const raw = range / n, mag = Math.pow(10, Math.floor(Math.log10(raw || 1))), f = raw / mag;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
}
const kfmt = (v: number) => (Math.abs(v) >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(+v.toFixed(1)));
const shorten = (s: string, n: number) => (s.length > n ? s.slice(0, Math.max(n - 1, 3)) + '…' : s);

export default Macc;

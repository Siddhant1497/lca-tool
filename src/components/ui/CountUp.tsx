import React, { useEffect, useRef, useState } from 'react';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Animates a number from its previous value to `value` (ease-out). Honors reduced-motion. */
const CountUp: React.FC<{ value: number; decimals?: number; duration?: number }> = ({ value, decimals = 0, duration = 900 }) => {
  const [shown, setShown] = useState(reduced() ? value : 0);
  const from = useRef(shown);
  useEffect(() => {
    if (reduced()) { setShown(value); return; }
    const start = performance.now(), a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const v = a + (value - a) * (1 - Math.pow(1 - p, 3));
      setShown(v); from.current = v;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{shown.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
};
export default CountUp;

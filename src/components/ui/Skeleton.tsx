import React from 'react';

/** Layout-matching placeholder for the Command Center (same grid as the real page, so nothing jumps). */
export const Bone: React.FC<{ h?: number; w?: string; r?: number }> = ({ h = 14, w = '100%', r = 6 }) => (
  <div className="bone" style={{ height: h, width: w, borderRadius: r }} />
);

const HubSkeleton: React.FC = () => (
  <div role="status" aria-busy="true" aria-label="Loading dashboard">
    <div className="ph"><div style={{ width: 280 }}><Bone h={22} w="70%" /><div style={{ height: 8 }} /><Bone h={12} /></div></div>
    <div className="kpi-grid">
      {Array.from({ length: 6 }, (_, i) => (
        <div className="kpi" key={i}><Bone h={10} w="55%" /><div style={{ height: 12 }} /><Bone h={26} w="70%" /><div style={{ height: 10 }} /><Bone h={10} w="85%" /></div>
      ))}
    </div>
    <div className="hub-grid">
      {[0, 1, 2, 3].map((i) => (
        <div className="card" key={i}><Bone h={14} w="40%" /><div style={{ height: 14 }} /><Bone h={250} r={10} /></div>
      ))}
    </div>
    <span className="sr-only">Loading…</span>
  </div>
);
export default HubSkeleton;

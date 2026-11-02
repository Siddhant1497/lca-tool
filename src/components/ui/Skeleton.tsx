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
        <div className="kpi" key={i}><div className="row" style={{ gap: 9 }}><Bone h={28} w="28px" r={8} /><Bone h={10} w="50%" /></div><div style={{ height: 12 }} /><Bone h={28} w="65%" /><div style={{ height: 12 }} /><Bone h={14} w="45%" r={999} /></div>
      ))}
    </div>
    <div className="hub-grid">
      {['c7', 'c5', 'c7', 'c5'].map((c, i) => (
        <div className={`card ${c}`} key={i}><div className="row" style={{ gap: 12, marginBottom: 16 }}><Bone h={34} w="34px" r={10} /><div style={{ flex: 1 }}><Bone h={13} w="45%" /><div style={{ height: 6 }} /><Bone h={10} w="65%" /></div></div><Bone h={260} r={10} /></div>
      ))}
    </div>
    <span className="sr-only">Loading…</span>
  </div>
);
export default HubSkeleton;

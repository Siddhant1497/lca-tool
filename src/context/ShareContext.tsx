import React, { createContext, useContext } from 'react';

/** Sections a consultant can include in a client's read-only dashboard. */
export const SHARE_SECTIONS = [
  { key: 'kpis', group: 'Overview', label: 'Headline KPIs', hint: 'Total emissions, change vs base year, pathway status' },
  { key: 'pathway', group: 'Overview', label: 'Pathway vs 1.5°C', hint: 'Scope 1+2 trajectory and target line' },
  { key: 'split', group: 'Emissions', label: 'Scope split', hint: 'Share of Scope 1, 2 and 3 in the latest year' },
  { key: 'inventory', group: 'Emissions', label: 'Inventory trend', hint: 'Emissions by scope over the years' },
  { key: 'scope3', group: 'Emissions', label: 'Scope 3 hotspots', hint: 'Scope 3 by GHG Protocol category' },
  { key: 'intensity', group: 'Emissions', label: 'Intensity', hint: 'Per m², per employee, per turnover' },
  { key: 'levers', group: 'Decarbonisation', label: 'Levers & MACC', hint: 'Measures, abatement and cost per tonne' },
  { key: 'strategy', group: 'Decarbonisation', label: 'Decarbonisation strategy', hint: 'Targets, gap, hotspots, roadmap, summary' },
  { key: 'disclosures', group: 'Reporting', label: 'Disclosure tables', hint: 'GHG Protocol, GRI, BRSR, IFRS S2 (choose below)' },
  { key: 'certs', group: 'Certifications', label: 'Certification status', hint: 'Selected projects: progress, gap, next action' },
  { key: 'docs', group: 'Certifications', label: 'Documentation progress', hint: 'Credit-by-credit status and due dates (no narrative text)' },
] as const;
export type SectionKey = typeof SHARE_SECTIONS[number]['key'];

export interface ShareConfig {
  sections: SectionKey[];
  frameworks: string[];         // disclosure framework ids
  projectIds: string[];         // certification projects to include
  docIds?: string[];            // documentation sets to include
  portalUrl?: string;           // this client's live portal page
  title: string; preparedBy: string; note: string; createdAt: string;
}

interface ShareCtx { readOnly: boolean; show: (k: SectionKey) => boolean; config: ShareConfig | null }
const Ctx = createContext<ShareCtx>({ readOnly: false, show: () => true, config: null });

export const ShareProvider: React.FC<{ config: ShareConfig; children: React.ReactNode }> = ({ config, children }) => (
  <Ctx.Provider value={{ readOnly: true, config, show: (k) => config.sections.includes(k) }}>{children}</Ctx.Provider>
);
/** In the main app everything shows and editing is allowed; inside a shared client view only chosen sections render, read-only. */
export const useShare = () => useContext(Ctx);

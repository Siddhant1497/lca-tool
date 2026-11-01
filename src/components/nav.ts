import type { AppPage } from '../types/lca';
import type { IconName } from './ui/Icon';

export const NAV: { page: AppPage; icon: IconName; label: string; sect?: string }[] = [
  { page: 'hub',        icon: 'grid',     label: 'Command Center', sect: 'Portfolio' },
  { page: 'data',       icon: 'database', label: 'Data Manager' },
  { page: 'reports',    icon: 'clipboard', label: 'Disclosures' },
  { page: 'dashboard',  icon: 'home',     label: 'LCA Overview',   sect: 'Building LCA' },
  { page: 'project',    icon: 'ruler',    label: 'Project Setup' },
  { page: 'materials',  icon: 'layers',   label: 'Materials' },
  { page: 'results',    icon: 'chart',    label: 'LCA Results' },
  { page: 'compliance', icon: 'check',    label: 'Compliance' },
  { page: 'export',     icon: 'file',     label: 'Export Report',  sect: 'Report' },
];

export const sectionOf = (page: AppPage) => {
  let sect = '';
  for (const n of NAV) { if (n.sect) sect = n.sect; if (n.page === page) return { sect, label: n.label }; }
  return { sect: '', label: '' };
};

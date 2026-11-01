import type { AppPage } from '../types/lca';
import type { IconName } from './ui/Icon';

export interface NavItem { page: AppPage; icon: IconName; label: string; sect?: string; module?: 'lca' }
export const NAV: NavItem[] = [
  { page: 'hub',        icon: 'grid',      label: 'Command Center', sect: 'Carbon & portfolio' },
  { page: 'calculator', icon: 'calc',      label: 'Carbon Calculator' },
  { page: 'strategy',   icon: 'target',    label: 'Decarbonisation Strategy' },
  { page: 'reports',    icon: 'clipboard', label: 'Disclosures' },
  { page: 'data',       icon: 'database',  label: 'Data Manager' },
  { page: 'dashboard',  icon: 'home',      label: 'LCA Overview',   sect: 'Building LCA', module: 'lca' },
  { page: 'project',    icon: 'ruler',     label: 'Project Setup',  module: 'lca' },
  { page: 'materials',  icon: 'layers',    label: 'Materials',      module: 'lca' },
  { page: 'results',    icon: 'chart',     label: 'LCA Results',    module: 'lca' },
  { page: 'compliance', icon: 'check',     label: 'Compliance',     module: 'lca' },
  { page: 'export',     icon: 'file',      label: 'Export Report',  module: 'lca' },
];
/** Nav filtered by enabled modules; a hidden section's header moves to its first visible item. */
export const visibleNav = (mods: { lca: boolean }) => NAV.filter((n) => !n.module || mods[n.module]);

export const sectionOf = (page: AppPage) => {
  let sect = '';
  for (const n of NAV) { if (n.sect) sect = n.sect; if (n.page === page) return { sect, label: n.label }; }
  return { sect: '', label: '' };
};

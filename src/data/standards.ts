import type { StandardType } from '../types/lca';

export interface StandardMeta {
  id: StandardType;
  name: string;
  organization: string;
  year: number;
  description: string;
  creditPoints?: number;
  mandatoryStages: string[];
}

export const STANDARDS: StandardMeta[] = [
  {
    id: 'LEED_v4_MRc1', name: 'LEED v4 MRc1',
    organization: 'U.S. Green Building Council (USGBC)', year: 2013,
    description: 'Option 4, whole-building LCA of structure and enclosure: ≥10% reduction vs baseline in ≥3 of 6 impact categories (one must be GWP), no category more than 5% worse. 3 points.',
    creditPoints: 3, mandatoryStages: ['A1-A3'],
  },
  {
    id: 'LEED_v4_1_MRc1', name: 'LEED v4.1 MRc1',
    organization: 'U.S. Green Building Council (USGBC)', year: 2019,
    description: 'Option 2, whole-building LCA: 1 point for conducting the LCA, more for reductions vs baseline (indicative; confirm in the current reference guide).',
    creditPoints: 4, mandatoryStages: ['A1-A3'],
  },
  {
    id: 'EN_15978', name: 'EN 15978:2011',
    organization: 'European Committee for Standardization (CEN)', year: 2011,
    description: 'European framework for whole-building LCA covering stages A–D.',
    mandatoryStages: ['A1-A3', 'B6', 'C1', 'C2', 'C3', 'C4'],
  },
  {
    id: 'BREEAM_Mat01', name: 'BREEAM Mat 01',
    organization: 'Building Research Establishment (BRE)', year: 2018,
    description: 'Environmental impact of building materials. Credits depend on the scheme version and an approved LCA tool, so they are not estimated here.',
    mandatoryStages: ['A1-A3'],
  },
  {
    id: 'ISO_14044', name: 'ISO 14044:2006',
    organization: 'International Organization for Standardization (ISO)', year: 2006,
    description: 'International requirements and guidelines for LCA studies.',
    mandatoryStages: [],
  },
];

/** LEED whole-building LCA rules. All paths need GWP among the improved categories and no category more than 5% worse. */
export const LEED_RULES = {
  maxIncrease: 0.05,
  // v4 MRc1 Option 4 (BD+C): 10% in 3 categories incl. GWP = 3 points.
  v4: [{ points: 3, minReduction: 0.10, minCategories: 3 }],
  // v4.1 MRc1 Option 2: path 1 (LCA conducted) = 1; path 2: 5% in 3 incl. GWP; path 3: 10% in 3 incl. GWP;
  // path 4: 20% GWP and 10% in 2 others. Paths 2 and 4 are indicative; confirm in the current reference guide.
  v4_1: [
    { points: 2, minReduction: 0.05, minCategories: 3 },
    { points: 3, minReduction: 0.10, minCategories: 3 },
    { points: 4, minReduction: 0.10, minCategories: 3, minGWP: 0.20 },
  ],
};

/** Illustrative ranges only (kg CO₂e/m² GFA, embodied). Not an official benchmark: use a national or project-specific one where available. */
export const EMBODIED_CARBON_BENCHMARKS: Record<string, { low: number; median: number; high: number }> = {
  residential_single: { low: 350, median: 550, high: 900 },
  residential_multi:  { low: 400, median: 600, high: 950 },
  office:             { low: 450, median: 700, high: 1100 },
  education:          { low: 400, median: 650, high: 1000 },
  retail:             { low: 350, median: 600, high: 950 },
  industrial:         { low: 250, median: 450, high: 750 },
  healthcare:         { low: 500, median: 800, high: 1300 },
  hospitality:        { low: 450, median: 700, high: 1100 },
  mixed_use:          { low: 420, median: 650, high: 1050 },
  other:              { low: 400, median: 650, high: 1050 },
};

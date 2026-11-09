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
    description: 'Option 4 whole-building LCA (structure and enclosure, 60 years): ≥10% reduction vs baseline in at least 3 of 6 impact categories, one of them GWP, with no category more than 5% worse = 3 points.',
    creditPoints: 3, mandatoryStages: ['A1-A3'],
  },
  {
    id: 'LEED_v4_1_MRc1', name: 'LEED v4.1 MRc1',
    organization: 'U.S. Green Building Council (USGBC)', year: 2019,
    description: 'Option 4 whole-building LCA, 60 years: Path 1 conduct the LCA (1 pt); Path 2 ≥5% GWP and ≥5% in two other categories (2 pts); Path 3 ≥10% GWP and ≥5% in two others, none >5% worse (3 pts); Path 4 Path 3 plus reuse/salvage (4 pts).',
    creditPoints: 4, mandatoryStages: ['A1-A3'],
  },
  {
    id: 'EN_15978', name: 'EN 15978:2011',
    organization: 'European Committee for Standardization (CEN)', year: 2011,
    description: 'European framework for whole-building LCA: modules A–C in the result, module D reported separately.',
    mandatoryStages: ['A1-A3', 'B6', 'C1-C4'],
  },
  {
    id: 'BREEAM_Mat01', name: 'BREEAM Mat 01',
    organization: 'Building Research Establishment (BRE)', year: 2018,
    description: 'Environmental impact of building materials. Indicative only: credits here are scaled on GWP reduction vs a notional baseline; BREEAM awards Mat 01 through its own LCA tool and options.',
    creditPoints: 6, mandatoryStages: ['A1-A3'],
  },
  {
    id: 'ISO_14044', name: 'ISO 14044:2006',
    organization: 'International Organization for Standardization (ISO)', year: 2006,
    description: 'International requirements and guidelines for LCA studies.',
    mandatoryStages: [],
  },
];

export const BREEAM_THRESHOLDS = [
  { credits: 1, gwpReduction: 0.05 },
  { credits: 2, gwpReduction: 0.10 },
  { credits: 3, gwpReduction: 0.15 },
  { credits: 4, gwpReduction: 0.20 },
  { credits: 5, gwpReduction: 0.25 },
  { credits: 6, gwpReduction: 0.30 },
];

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

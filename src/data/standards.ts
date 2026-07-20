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
    description: 'Whole-building LCA – at least 10% improvement in ≥3 of 6 impact categories vs baseline.',
    creditPoints: 3, mandatoryStages: ['A1-A3'],
  },
  {
    id: 'LEED_v4_1_MRc1', name: 'LEED v4.1 MRc1',
    organization: 'U.S. Green Building Council (USGBC)', year: 2019,
    description: 'Updated LCA credit – A1-A5 required; 1-5 points based on % reduction achieved.',
    creditPoints: 5, mandatoryStages: ['A1-A3', 'A4', 'A5'],
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
    description: 'Environmental impact of building materials – credits awarded for GWP reduction vs notional baseline.',
    creditPoints: 6, mandatoryStages: ['A1-A3'],
  },
  {
    id: 'ISO_14044', name: 'ISO 14044:2006',
    organization: 'International Organization for Standardization (ISO)', year: 2006,
    description: 'International requirements and guidelines for LCA studies.',
    mandatoryStages: [],
  },
];

export const LEED_THRESHOLDS = {
  v4: [
    { points: 1, minReduction: 0.10, minCategories: 3 },
    { points: 2, minReduction: 0.15, minCategories: 3 },
    { points: 3, minReduction: 0.20, minCategories: 3 },
  ],
  v4_1: [
    { points: 1, minReduction: 0.05, minCategories: 3 },
    { points: 2, minReduction: 0.10, minCategories: 3 },
    { points: 3, minReduction: 0.15, minCategories: 4 },
    { points: 4, minReduction: 0.20, minCategories: 5 },
    { points: 5, minReduction: 0.25, minCategories: 6 },
  ],
};

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

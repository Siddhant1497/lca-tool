export interface GhgYear { year: number; scope1: number; scope2: number; scope3: number } // tCO2e

export type CertSystem = 'LEED' | 'IGBC' | 'GRIHA' | 'EDGE' | 'WELL' | 'Fitwel' | 'Other';
export type CertStage = 'Registered' | 'Design' | 'Construction' | 'Submitted' | 'Certified';

export interface CertCategory { name: string; max: number; secured: number; likely: number }

export interface CertProject {
  id: string; name: string; system: CertSystem; version: string;
  targetLabel: string;       // e.g. "Gold"
  needed: number;            // score needed for the target level
  secured: number;           // confirmed / awarded
  likely: number;            // pursued, not yet confirmed
  max: number;               // maximum available
  unit: 'pts' | '%';
  stage: CertStage;
  next: string;              // next action
  categories?: CertCategory[];
}

export type LeverStatus = 'Implemented' | 'In progress' | 'Planned' | 'Identified';
export interface Lever { id: string; name: string; scope: 1 | 2 | 3; abatement: number; status: LeverStatus } // tCO2e/yr

export interface HubSettings { targetYear: number; annualPct: number } // linear % of base-year S1+2 per year

export interface HubState {
  loaded: boolean; isSample: boolean;
  ghg: GhgYear[]; projects: CertProject[]; levers: Lever[]; settings: HubSettings;
}

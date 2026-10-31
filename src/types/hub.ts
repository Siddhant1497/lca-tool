/** Yearly inventory, tCO2e. scope2 = location-based; scope2m = market-based (optional, GHG Protocol dual reporting). */
export interface GhgYear { year: number; scope1: number; scope2: number; scope2m?: number | null; scope3: number }

export type CertSystem = 'LEED' | 'IGBC' | 'GRIHA' | 'EDGE' | 'WELL' | 'Fitwel' | 'Other';
export type CertStage = 'Registered' | 'Design' | 'Construction' | 'Submitted' | 'Certified';
export const CERT_SYSTEMS: CertSystem[] = ['LEED', 'IGBC', 'GRIHA', 'EDGE', 'WELL', 'Fitwel', 'Other'];
export const CERT_STAGES: CertStage[] = ['Registered', 'Design', 'Construction', 'Submitted', 'Certified'];

export interface CertCategory { name: string; max: number; secured: number; likely: number }

export interface CertProject {
  id: string; name: string; system: CertSystem; version: string;
  targetLabel: string; needed: number; secured: number; likely: number; max: number;
  unit: 'pts' | '%'; stage: CertStage; next: string;
  categories?: CertCategory[];
}

export type LeverStatus = 'Implemented' | 'In progress' | 'Planned' | 'Identified';
export const LEVER_STATUSES: LeverStatus[] = ['Implemented', 'In progress', 'Planned', 'Identified'];
export interface Lever { id: string; name: string; scope: 1 | 2 | 3; abatement: number; status: LeverStatus } // tCO2e/yr

/** User-entered emission factor. Nothing is prefilled: every factor must carry its own source. */
export interface EmissionFactor {
  id: string; name: string; unit: string; kgPerUnit: number; scope: 1 | 2 | 3;
  s2basis?: 'location' | 'market'; source: string;
}
export interface Activity { id: string; year: number; factorId: string; description: string; quantity: number }

export type S2Method = 'location' | 'market';
export interface HubSettings { targetYear: number; annualPct: number; s2Method: S2Method }

export interface HubState {
  loaded: boolean; isSample: boolean;
  ghg: GhgYear[]; projects: CertProject[]; levers: Lever[];
  factors: EmissionFactor[]; activities: Activity[];
  settings: HubSettings;
}

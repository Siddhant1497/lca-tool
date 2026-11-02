/** Yearly inventory, tCO2e. scope2 = location-based; scope2m = market-based (optional, GHG Protocol dual reporting). */
export interface GhgYear {
  year: number; scope1: number; scope2: number; scope2m?: number | null; scope3: number;
  /** Optional Scope 3 split by GHG Protocol category (1–15). When present, scope3 equals the sum. */
  s3cats?: Partial<Record<number, number>>;
  /** Optional intensity denominators for the year. */
  denom?: { area?: number; fte?: number; revenue?: number };
}

/** GHG Protocol Corporate Value Chain (Scope 3) Standard categories. */
export const S3_CATEGORIES: { n: number; name: string; stream: 'Upstream' | 'Downstream' }[] = [
  { n: 1, name: 'Purchased goods & services', stream: 'Upstream' },
  { n: 2, name: 'Capital goods', stream: 'Upstream' },
  { n: 3, name: 'Fuel- & energy-related activities', stream: 'Upstream' },
  { n: 4, name: 'Upstream transportation & distribution', stream: 'Upstream' },
  { n: 5, name: 'Waste generated in operations', stream: 'Upstream' },
  { n: 6, name: 'Business travel', stream: 'Upstream' },
  { n: 7, name: 'Employee commuting', stream: 'Upstream' },
  { n: 8, name: 'Upstream leased assets', stream: 'Upstream' },
  { n: 9, name: 'Downstream transportation & distribution', stream: 'Downstream' },
  { n: 10, name: 'Processing of sold products', stream: 'Downstream' },
  { n: 11, name: 'Use of sold products', stream: 'Downstream' },
  { n: 12, name: 'End-of-life treatment of sold products', stream: 'Downstream' },
  { n: 13, name: 'Downstream leased assets', stream: 'Downstream' },
  { n: 14, name: 'Franchises', stream: 'Downstream' },
  { n: 15, name: 'Investments', stream: 'Downstream' },
];

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
export interface Lever {
  id: string; name: string; scope: 1 | 2 | 3;
  abatement: number;          // tCO2e/yr at full delivery
  status: LeverStatus;
  year?: number;              // delivery year (full effect from this year)
  costPerT?: number;          // currency per tCO2e abated (negative = net saving) for the MACC
  measureId?: string;         // link to the strategy measure library
}

/** User-entered emission factor. Nothing is prefilled: every factor must carry its own source. */
export interface EmissionFactor {
  id: string; name: string; unit: string; kgPerUnit: number; scope: 1 | 2 | 3;
  s2basis?: 'location' | 'market'; s3cat?: number; source: string;
  /** Provenance for factors imported from a published dataset. Editing the value clears `official`. */
  official?: boolean; pack?: string; ref?: string; url?: string;
}
export type DataQuality = 'Measured' | 'Calculated' | 'Estimated';
export const DATA_QUALITY: DataQuality[] = ['Measured', 'Calculated', 'Estimated'];
export interface Activity {
  id: string; year: number; factorId: string; description: string; quantity: number;
  site?: string; quality?: DataQuality;
}

export type S2Method = 'location' | 'market';
export type RevenueUnit = '₹ crore' | '₹ lakh' | '₹ million' | 'USD million' | 'EUR million';
export const REVENUE_UNITS: { id: RevenueUnit; base: string; mult: number }[] = [
  { id: '₹ crore', base: '₹', mult: 1e7 }, { id: '₹ lakh', base: '₹', mult: 1e5 }, { id: '₹ million', base: '₹', mult: 1e6 },
  { id: 'USD million', base: 'USD', mult: 1e6 }, { id: 'EUR million', base: 'EUR', mult: 1e6 },
];
export interface HubSettings {
  targetYear: number; annualPct: number; s2Method: S2Method;
  revenueUnit: RevenueUnit; currency: string; orgName: string;
  /** Optional modules: switch off what you don't use (carbon accounting is always on). */
  modules: { certs: boolean; lca: boolean };
  /** Long-term ambition: Scope 3 linear rate, net-zero year and depth of reduction vs base year. */
  s3Pct: number; netZeroYear: number; nzPct: number;
}

/** A documentation set: one rating-system narrative pack for one project, filled from its calculation workbook. */
export interface DocSet {
  id: string; name: string; rating: string; projectId?: string; updatedAt: string;
  src: import('../utils/narrative').NSource;
  edits: Record<string, string>;                       // typed facts, keyed like the IGBC Narrative Builder
  meta: Record<string, { status?: import('../utils/narrative').DocStatus; owner?: string; due?: string; note?: string }>;
}

export interface HubState {
  loaded: boolean; isSample: boolean;
  ghg: GhgYear[]; projects: CertProject[]; levers: Lever[];
  factors: EmissionFactor[]; activities: Activity[];
  docs: DocSet[];
  settings: HubSettings;
}

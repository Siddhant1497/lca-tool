export interface ImpactValues {
  GWP: number;        // Global Warming Potential – kg CO₂ eq
  ODP: number;        // Ozone Depletion Potential – kg CFC-11 eq
  AP: number;         // Acidification Potential – kg SO₂ eq
  EP: number;         // Eutrophication Potential – kg PO₄ eq
  POCP: number;       // Photochemical Ozone Creation – kg C₂H₄ eq
  ADP_fossil: number; // Abiotic Depletion (fossil) – MJ
}

export const ZERO_IMPACTS: ImpactValues = { GWP: 0, ODP: 0, AP: 0, EP: 0, POCP: 0, ADP_fossil: 0 };

export const IMPACT_META: Record<keyof ImpactValues, { label: string; unit: string; color: string; description: string }> = {
  GWP:        { label: 'Global Warming Potential',     unit: 'kg CO₂ eq',    color: '#EF4444', description: 'Contribution to climate change (100-year horizon)' },
  ODP:        { label: 'Ozone Depletion Potential',    unit: 'kg CFC-11 eq', color: '#8B5CF6', description: 'Potential to damage the stratospheric ozone layer' },
  AP:         { label: 'Acidification Potential',      unit: 'kg SO₂ eq',    color: '#F97316', description: 'Contribution to acid rain and soil/water acidification' },
  EP:         { label: 'Eutrophication Potential',     unit: 'kg PO₄ eq',    color: '#10B981', description: 'Contribution to over-fertilization of ecosystems' },
  POCP:       { label: 'Photochemical Ozone Creation', unit: 'kg C₂H₄ eq',  color: '#F59E0B', description: 'Contribution to ground-level ozone (smog) formation' },
  ADP_fossil: { label: 'Abiotic Depletion (Fossil)',   unit: 'MJ',           color: '#6B7280', description: 'Consumption of non-renewable fossil fuel resources' },
};

export const LIFECYCLE_STAGES = ['A1-A3','A4','A5','B1','B2','B3','B4','B5','B6','B7','C1','C2','C3','C4','D'] as const;
export type LifeCycleStage = typeof LIFECYCLE_STAGES[number];

export const STAGE_META: Record<LifeCycleStage, { label: string; phase: 'production'|'construction'|'use'|'eol'|'beyond'; description: string }> = {
  'A1-A3': { label: 'Product Stage',         phase: 'production',   description: 'Raw material extraction, transport & manufacturing' },
  'A4':    { label: 'Transport to Site',      phase: 'construction', description: 'Transport of products to building site' },
  'A5':    { label: 'Construction Process',   phase: 'construction', description: 'Installation and construction-site waste' },
  'B1':    { label: 'Use',                    phase: 'use',          description: 'Emissions during use (e.g. from coatings)' },
  'B2':    { label: 'Maintenance',            phase: 'use',          description: 'Cleaning and preventive maintenance' },
  'B3':    { label: 'Repair',                 phase: 'use',          description: 'Repair activities during service life' },
  'B4':    { label: 'Replacement',            phase: 'use',          description: 'Full replacement at end of component service life' },
  'B5':    { label: 'Refurbishment',          phase: 'use',          description: 'Major refurbishment over building life' },
  'B6':    { label: 'Operational Energy',     phase: 'use',          description: 'Energy consumption during building operation' },
  'B7':    { label: 'Operational Water',      phase: 'use',          description: 'Water consumption during building operation' },
  'C1':    { label: 'Deconstruction',         phase: 'eol',          description: 'Demolition or deconstruction at end of life' },
  'C2':    { label: 'Transport (EoL)',        phase: 'eol',          description: 'Transport of waste to processing facilities' },
  'C3':    { label: 'Waste Processing',       phase: 'eol',          description: 'Recycling, energy recovery or processing' },
  'C4':    { label: 'Disposal',               phase: 'eol',          description: 'Landfill or final disposal' },
  'D':     { label: 'Beyond System Boundary', phase: 'beyond',       description: 'Net benefits from reuse, recovery & recycling' },
};

export const PHASE_COLORS: Record<string, string> = {
  production: '#3B82F6', construction: '#F59E0B', use: '#10B981', eol: '#EF4444', beyond: '#8B5CF6',
};

export type MaterialCategory = 'concrete'|'steel'|'timber'|'masonry'|'insulation'|'glazing'|'cladding'|'finishes'|'mep'|'roofing'|'other';

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  concrete: 'Concrete & Cement', steel: 'Steel & Metals', timber: 'Timber & Wood',
  masonry: 'Masonry & Stone', insulation: 'Insulation', glazing: 'Glazing',
  cladding: 'Cladding & Facades', finishes: 'Finishes & Interiors', mep: 'MEP / Services',
  roofing: 'Roofing', other: 'Other',
};

export interface EPDStageData {
  A1_A3: ImpactValues;
  A4?: Partial<ImpactValues>;
  A5?: Partial<ImpactValues>;
  C1_C4?: Partial<ImpactValues>;
  D?: Partial<ImpactValues>;
}

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  unit: 'kg'|'m3'|'m2'|'m'|'pcs';
  density?: number;       // kg/m³
  serviceLife: number;    // years
  epd: EPDStageData;
  source: string;
  description?: string;
  biogenicCarbonIncluded?: boolean;
}

export type BuildingType = 'residential_single'|'residential_multi'|'office'|'education'|'retail'|'industrial'|'healthcare'|'hospitality'|'mixed_use'|'other';

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  residential_single: 'Residential – Single Family',
  residential_multi:  'Residential – Multi-Family',
  office:             'Office / Commercial',
  education:          'Education',
  retail:             'Retail',
  industrial:         'Industrial / Warehouse',
  healthcare:         'Healthcare',
  hospitality:        'Hospitality / Hotel',
  mixed_use:          'Mixed Use',
  other:              'Other',
};

export interface Project {
  id: string;
  name: string;
  description: string;
  buildingType: BuildingType;
  grossFloorArea: number;
  conditionedFloorArea?: number;
  stories: number;
  buildingHeight?: number;
  lifespan: number;           // years (RSP)
  location: string;
  country: string;
  energyIntensity?: number;   // kWh/m²/yr
  gridCarbonIntensity?: number; // kg CO₂/kWh
  createdAt: string;
  updatedAt: string;
}

export interface MaterialEntry {
  id: string;
  materialId: string;
  customName?: string;
  quantity: number;
  unit: string;
  stage: LifeCycleStage;
  component: string;
  notes?: string;
  includeReplacement: boolean;
}

export interface ImpactBreakdown {
  materialId: string;
  entryId: string;
  name: string;
  component: string;
  stage: LifeCycleStage;
  quantity: number;
  unit: string;
  impacts: ImpactValues;
  percentOfTotal: number;
}

export interface LCAResults {
  total: ImpactValues;
  byStage: Partial<Record<LifeCycleStage, ImpactValues>>;
  byPhase: Record<string, ImpactValues>;
  byComponent: Record<string, ImpactValues>;
  byMaterial: ImpactBreakdown[];
  perM2: ImpactValues;
  perM2PerYear: ImpactValues;
  operationalCarbon: number;
  embodiedCarbon: number;
}

export type StandardType = 'LEED_v4_MRc1'|'LEED_v4_1_MRc1'|'EN_15978'|'BREEAM_Mat01'|'ISO_14044';

export interface RequirementResult {
  id: string;
  description: string;
  status: 'pass'|'fail'|'warning'|'na';
  value?: number|string;
  threshold?: number|string;
  unit?: string;
  notes?: string;
}

export interface ComplianceResult {
  standard: StandardType;
  label: string;
  compliant: boolean;
  score?: number;
  maxScore?: number;
  creditPoints?: number;
  requirements: RequirementResult[];
  summary: string;
  recommendations: string[];
}

export type AppPage = 'dashboard'|'project'|'materials'|'results'|'compliance'|'export';

export interface AppState {
  project: Project | null;
  materialEntries: MaterialEntry[];
  baselineEntries: MaterialEntry[];
  hasBaseline: boolean;
  activePage: AppPage;
}

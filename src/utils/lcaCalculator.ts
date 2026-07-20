import type { ImpactValues, MaterialEntry, LCAResults, Project, ImpactBreakdown, LifeCycleStage } from '../types/lca';
import { ZERO_IMPACTS, STAGE_META } from '../types/lca';
import { getMaterialById } from '../data/materials';

export const addImpacts = (a: ImpactValues, b: Partial<ImpactValues>): ImpactValues => ({
  GWP:        a.GWP        + (b.GWP        ?? 0),
  ODP:        a.ODP        + (b.ODP        ?? 0),
  AP:         a.AP         + (b.AP         ?? 0),
  EP:         a.EP         + (b.EP         ?? 0),
  POCP:       a.POCP       + (b.POCP       ?? 0),
  ADP_fossil: a.ADP_fossil + (b.ADP_fossil ?? 0),
});

export const scaleImpacts = (v: Partial<ImpactValues>, factor: number): ImpactValues => ({
  GWP:        (v.GWP        ?? 0) * factor,
  ODP:        (v.ODP        ?? 0) * factor,
  AP:         (v.AP         ?? 0) * factor,
  EP:         (v.EP         ?? 0) * factor,
  POCP:       (v.POCP       ?? 0) * factor,
  ADP_fossil: (v.ADP_fossil ?? 0) * factor,
});

export const subtractImpacts = (a: ImpactValues, b: ImpactValues): ImpactValues => ({
  GWP: a.GWP - b.GWP, ODP: a.ODP - b.ODP, AP: a.AP - b.AP,
  EP: a.EP - b.EP, POCP: a.POCP - b.POCP, ADP_fossil: a.ADP_fossil - b.ADP_fossil,
});

/** Returns fraction: (proposed - baseline) / |baseline| */
export const percentDiff = (baseline: ImpactValues, proposed: ImpactValues): Partial<ImpactValues> => {
  const keys = ['GWP', 'ODP', 'AP', 'EP', 'POCP', 'ADP_fossil'] as const;
  const result: Partial<ImpactValues> = {};
  for (const k of keys) result[k] = baseline[k] !== 0 ? (proposed[k] - baseline[k]) / Math.abs(baseline[k]) : 0;
  return result;
};

/** Convert entry quantity to kg for calculation */
const toKg = (entry: MaterialEntry): number => {
  const mat = getMaterialById(entry.materialId);
  if (!mat) return 0;
  if (mat.unit === 'kg') return entry.quantity;
  if (mat.unit === 'm3' && mat.density) return entry.quantity * mat.density;
  // m2 / m / pcs: impacts declared per functional unit so pass through as-is
  return entry.quantity;
};

export const calculateEntryImpacts = (entry: MaterialEntry, projectLifespan: number): ImpactValues => {
  const mat = getMaterialById(entry.materialId);
  if (!mat) return { ...ZERO_IMPACTS };

  const qty = toKg(entry);
  let total: ImpactValues = { ...ZERO_IMPACTS };

  total = addImpacts(total, scaleImpacts(mat.epd.A1_A3, qty));
  if (mat.epd.A4)    total = addImpacts(total, scaleImpacts(mat.epd.A4,    qty));
  if (mat.epd.A5)    total = addImpacts(total, scaleImpacts(mat.epd.A5,    qty));
  if (mat.epd.C1_C4) total = addImpacts(total, scaleImpacts(mat.epd.C1_C4, qty));
  if (mat.epd.D)     total = addImpacts(total, scaleImpacts(mat.epd.D,     qty));

  if (entry.includeReplacement && mat.serviceLife < projectLifespan) {
    const reps = Math.floor(projectLifespan / mat.serviceLife) - 1;
    if (reps > 0) total = addImpacts(total, scaleImpacts(mat.epd.A1_A3, qty * reps));
  }

  return total;
};

export const calculateLCA = (entries: MaterialEntry[], project: Project): LCAResults => {
  const byStage: Partial<Record<LifeCycleStage, ImpactValues>> = {};
  const byComponent: Record<string, ImpactValues> = {};
  const breakdowns: ImpactBreakdown[] = [];
  let total: ImpactValues = { ...ZERO_IMPACTS };

  for (const entry of entries) {
    const mat = getMaterialById(entry.materialId);
    if (!mat) continue;
    const impacts = calculateEntryImpacts(entry, project.lifespan);
    total = addImpacts(total, impacts);

    const prevStage = byStage[entry.stage] ?? { ...ZERO_IMPACTS };
    byStage[entry.stage] = addImpacts(prevStage, impacts);

    const prevComp = byComponent[entry.component] ?? { ...ZERO_IMPACTS };
    byComponent[entry.component] = addImpacts(prevComp, impacts);

    breakdowns.push({
      materialId: entry.materialId, entryId: entry.id,
      name: entry.customName ?? mat.name,
      component: entry.component, stage: entry.stage,
      quantity: entry.quantity, unit: entry.unit,
      impacts, percentOfTotal: 0,
    });
  }

  let operationalCarbon = 0;
  if (project.energyIntensity && project.gridCarbonIntensity && project.grossFloorArea) {
    operationalCarbon = project.energyIntensity * project.gridCarbonIntensity * project.grossFloorArea * project.lifespan;
    total = addImpacts(total, {
      GWP: operationalCarbon,
      ADP_fossil: project.energyIntensity * project.grossFloorArea * project.lifespan * 3.6,
    });
  }

  const embodiedCarbon = total.GWP - operationalCarbon;

  for (const b of breakdowns) b.percentOfTotal = total.GWP !== 0 ? (b.impacts.GWP / total.GWP) * 100 : 0;
  breakdowns.sort((a, b) => b.impacts.GWP - a.impacts.GWP);

  const byPhase: Record<string, ImpactValues> = {};
  for (const [stage, impacts] of Object.entries(byStage)) {
    const phase = STAGE_META[stage as LifeCycleStage]?.phase ?? 'other';
    byPhase[phase] = addImpacts(byPhase[phase] ?? { ...ZERO_IMPACTS }, impacts!);
  }

  const area = project.grossFloorArea || 1;
  const perM2 = scaleImpacts(total, 1 / area);
  const perM2PerYear = scaleImpacts(perM2, 1 / project.lifespan);

  return { total, byStage, byPhase, byComponent, byMaterial: breakdowns, perM2, perM2PerYear, operationalCarbon, embodiedCarbon };
};

export const formatGWP = (v: number): string => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} Mt CO₂ eq`;
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(1)} t CO₂ eq`;
  return `${v.toFixed(1)} kg CO₂ eq`;
};

export const formatImpact = (v: number, cat: keyof ImpactValues): string => {
  if (cat === 'ODP') return v.toExponential(2);
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(1)}k`;
  return v.toFixed(2);
};

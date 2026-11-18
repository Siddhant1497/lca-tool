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

/**
 * Quantity in the material's declared unit. EPD values in the database are per declared unit
 * (kg, m³ or m²), so no conversion is applied. (Converting m³ to kg here would multiply
 * per-m³ factors by density, overstating concrete by ~2,400x.)
 */
const toKg = (entry: MaterialEntry): number => (getMaterialById(entry.materialId) ? entry.quantity : 0);

/**
 * Impacts of one inventory entry, split by life-cycle module.
 * Entries in the default product stage (A1-A3) are allocated module by module from the EPD
 * (A1-A3, A4, A5, C1-C4, D), plus replacements in B4. Entries the user assigns to another
 * stage (e.g. A5 site waste, B4 replacement items) count the material's A1-A3 data in that stage.
 */
export const calculateEntryModules = (entry: MaterialEntry, projectLifespan: number): Partial<Record<LifeCycleStage, ImpactValues>> => {
  const mat = getMaterialById(entry.materialId);
  const out: Partial<Record<LifeCycleStage, ImpactValues>> = {};
  if (!mat) return out;
  const qty = toKg(entry);
  const put = (stage: LifeCycleStage, v: Partial<ImpactValues> | undefined, factor = qty) => {
    if (v) out[stage] = addImpacts(out[stage] ?? { ...ZERO_IMPACTS }, scaleImpacts(v, factor));
  };
  if (entry.stage !== 'A1-A3') { put(entry.stage, mat.epd.A1_A3); return out; }
  put('A1-A3', mat.epd.A1_A3); put('A4', mat.epd.A4); put('A5', mat.epd.A5); put('C1-C4', mat.epd.C1_C4); put('D', mat.epd.D);
  if (entry.includeReplacement && mat.serviceLife < projectLifespan) {
    const reps = Math.ceil(projectLifespan / mat.serviceLife) - 1;  // EN 15978: replacements within the study period
    if (reps > 0) for (const v of [mat.epd.A1_A3, mat.epd.A4, mat.epd.C1_C4]) put('B4', v, qty * reps);
  }
  return out;
};

/** Whole-life impacts of one entry (A–C). Module D is excluded, as EN 15978 reports it separately. */
export const calculateEntryImpacts = (entry: MaterialEntry, projectLifespan: number): ImpactValues => {
  let total: ImpactValues = { ...ZERO_IMPACTS };
  for (const [stage, v] of Object.entries(calculateEntryModules(entry, projectLifespan))) if (stage !== 'D') total = addImpacts(total, v!);
  return total;
};

export const calculateLCA = (entries: MaterialEntry[], project: Project): LCAResults => {
  const byStage: Partial<Record<LifeCycleStage, ImpactValues>> = {};
  const byComponent: Record<string, ImpactValues> = {};
  const breakdowns: ImpactBreakdown[] = [];
  let total: ImpactValues = { ...ZERO_IMPACTS };
  let moduleD: ImpactValues = { ...ZERO_IMPACTS };

  for (const entry of entries) {
    const mat = getMaterialById(entry.materialId);
    if (!mat) continue;
    let impacts: ImpactValues = { ...ZERO_IMPACTS };
    for (const [s, v] of Object.entries(calculateEntryModules(entry, project.lifespan))) {
      const stage = s as LifeCycleStage;
      byStage[stage] = addImpacts(byStage[stage] ?? { ...ZERO_IMPACTS }, v!);
      if (stage === 'D') moduleD = addImpacts(moduleD, v!);
      else impacts = addImpacts(impacts, v!);
    }
    total = addImpacts(total, impacts);

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
    byStage.B6 = addImpacts(byStage.B6 ?? { ...ZERO_IMPACTS }, {
      GWP: operationalCarbon, ADP_fossil: project.energyIntensity * project.grossFloorArea * project.lifespan * 3.6,
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

  return { total, byStage, byPhase, byComponent, byMaterial: breakdowns, perM2, perM2PerYear, operationalCarbon, embodiedCarbon, moduleD };
};

export const formatGWP = (v: number): string => {
  // 1,000 kg = 1 t; 1,000,000 kg = 1,000 t (not a megatonne)
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toLocaleString('en-US', { maximumFractionDigits: 1 })} t CO₂ eq`;
  return `${v.toFixed(1)} kg CO₂ eq`;
};

export const formatImpact = (v: number, cat: keyof ImpactValues): string => {
  if (cat === 'ODP') return v.toExponential(2);
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(1)}k`;
  return v.toFixed(2);
};

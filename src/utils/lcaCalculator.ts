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
 * Quantity in the material's declared unit. Impacts in materials.ts are given per declared unit
 * (kg, m³, m², m or piece), so the quantity is used as entered. Converting m³ to kg with the density
 * here would multiply per-m³ factors by the density a second time (2,400× for concrete).
 */
const toDeclaredUnits = (entry: MaterialEntry): number => (getMaterialById(entry.materialId) ? entry.quantity : 0);

/**
 * Impacts of one entry split by EN 15978 module, from the EPD's declared modules:
 * A1–A3, A4, A5, B4 (replacements over the reference study period), C1–C4 and D.
 */
export const calculateEntryModules = (entry: MaterialEntry, projectLifespan: number): Partial<Record<LifeCycleStage, ImpactValues>> => {
  const mat = getMaterialById(entry.materialId);
  if (!mat) return {};
  const qty = toDeclaredUnits(entry);
  const out: Partial<Record<LifeCycleStage, ImpactValues>> = { 'A1-A3': scaleImpacts(mat.epd.A1_A3, qty) };
  if (mat.epd.A4) out.A4 = scaleImpacts(mat.epd.A4, qty);
  if (mat.epd.A5) out.A5 = scaleImpacts(mat.epd.A5, qty);
  if (entry.includeReplacement && mat.serviceLife > 0 && mat.serviceLife < projectLifespan) {
    const reps = Math.ceil(projectLifespan / mat.serviceLife) - 1;
    // each replacement repeats production, transport, installation and end of life of the replaced product
    if (reps > 0) out.B4 = [mat.epd.A1_A3, mat.epd.A4, mat.epd.A5, mat.epd.C1_C4].reduce<ImpactValues>((t, m) => (m ? addImpacts(t, scaleImpacts(m, qty * reps)) : t), { ...ZERO_IMPACTS });
  }
  if (mat.epd.C1_C4) out['C1-C4'] = scaleImpacts(mat.epd.C1_C4, qty);
  if (mat.epd.D) out.D = scaleImpacts(mat.epd.D, qty);
  return out;
};

/** Whole-life impacts of one entry, modules A–C (module D excluded, as in the building total). */
export const calculateEntryImpacts = (entry: MaterialEntry, projectLifespan: number): ImpactValues =>
  Object.entries(calculateEntryModules(entry, projectLifespan)).reduce<ImpactValues>((t, [st, v]) => (st === 'D' ? t : addImpacts(t, v!)), { ...ZERO_IMPACTS });

export const calculateLCA = (entries: MaterialEntry[], project: Project): LCAResults => {
  const byStage: Partial<Record<LifeCycleStage, ImpactValues>> = {};
  const byComponent: Record<string, ImpactValues> = {};
  const breakdowns: ImpactBreakdown[] = [];
  let total: ImpactValues = { ...ZERO_IMPACTS };
  let moduleD: ImpactValues = { ...ZERO_IMPACTS };

  for (const entry of entries) {
    const mat = getMaterialById(entry.materialId);
    if (!mat) continue;
    const modules = calculateEntryModules(entry, project.lifespan);
    for (const [st, v] of Object.entries(modules) as [LifeCycleStage, ImpactValues][]) {
      byStage[st] = addImpacts(byStage[st] ?? { ...ZERO_IMPACTS }, v);
      if (st === 'D') moduleD = addImpacts(moduleD, v);
    }
    const impacts = calculateEntryImpacts(entry, project.lifespan);
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
    const b6 = { ...ZERO_IMPACTS, GWP: operationalCarbon, ADP_fossil: project.energyIntensity * project.grossFloorArea * project.lifespan * 3.6 };
    total = addImpacts(total, b6);
    byStage.B6 = b6;
  }

  const embodiedCarbon = total.GWP - operationalCarbon;

  for (const b of breakdowns) b.percentOfTotal = total.GWP !== 0 ? (b.impacts.GWP / total.GWP) * 100 : 0;
  breakdowns.sort((a, b) => b.impacts.GWP - a.impacts.GWP);

  const byPhase: Record<string, ImpactValues> = {};
  for (const [stage, impacts] of Object.entries(byStage)) {
    if (stage === 'D') continue;   // reported separately as moduleD
    const phase = STAGE_META[stage as LifeCycleStage]?.phase ?? 'other';
    byPhase[phase] = addImpacts(byPhase[phase] ?? { ...ZERO_IMPACTS }, impacts!);
  }

  const area = project.grossFloorArea || 1;
  const perM2 = scaleImpacts(total, 1 / area);
  const perM2PerYear = scaleImpacts(perM2, 1 / project.lifespan);

  return { total, byStage, byPhase, byComponent, byMaterial: breakdowns, perM2, perM2PerYear, operationalCarbon, embodiedCarbon, moduleD };
};

/** kg CO₂e → readable text. Large values stay in tonnes (1,000 kg = 1 t), never scaled to kt/Mt. */
export const formatGWP = (v: number): string => {
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toLocaleString('en-IN', { maximumFractionDigits: Math.abs(v) >= 1_000_000 ? 0 : 1 })} t CO₂e`;
  return `${v.toFixed(1)} kg CO₂e`;
};

export const formatImpact = (v: number, cat: keyof ImpactValues): string => {
  if (cat === 'ODP') return v.toExponential(2);
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(1)}k`;
  return v.toFixed(2);
};

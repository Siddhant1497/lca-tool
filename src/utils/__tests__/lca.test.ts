import { describe, it, expect } from 'vitest';
import { calculateLCA, calculateEntryModules, formatGWP } from '../lcaCalculator';
import { checkLEEDv4, checkLEEDv41, checkEN15978 } from '../complianceChecker';
import { MATERIALS, getMaterialById } from '../../data/materials';
import type { MaterialEntry, Project } from '../../types/lca';

const project: Project = { id: 'p', name: 'Test', description: '', buildingType: 'office', grossFloorArea: 10_000, stories: 5, lifespan: 60, location: '', country: 'IN', createdAt: '', updatedAt: '' };
const entry = (materialId: string, quantity: number, includeReplacement = false): MaterialEntry =>
  ({ id: materialId + quantity, materialId, quantity, unit: getMaterialById(materialId)!.unit, stage: 'A1-A3', component: 'Frame', includeReplacement });

describe('building LCA calculation', () => {
  it('uses per-m³ concrete factors as declared (no second density multiplication)', () => {
    const r = calculateLCA([entry('concrete_c25', 100)], project);
    expect(r.byStage['A1-A3']!.GWP).toBeCloseTo(100 * 259, 6);          // 259 kgCO2e/m³ × 100 m³
    expect(r.total.GWP).toBeCloseTo(100 * (259 + 5.2 + 3.6), 6);        // A1–A3 + A4 + C1–C4
    expect(r.moduleD.GWP).toBeCloseTo(100 * -4.1, 6);                   // D reported separately
    expect(r.perM2.GWP).toBeCloseTo(2.678, 6);
  });
  it('puts each EPD module in its own stage and keeps D out of the total', () => {
    const r = calculateLCA([entry('concrete_c25', 10)], project);
    expect(Object.keys(r.byStage).sort()).toEqual(['A1-A3', 'A4', 'C1-C4', 'D']);
    expect(r.byPhase.beyond).toBeUndefined();
    const sumAC = ['A1-A3', 'A4', 'C1-C4'].reduce((a, s) => a + r.byStage[s as 'A4']!.GWP, 0);
    expect(r.total.GWP).toBeCloseTo(sumAC, 9);
  });
  it('counts replacements as ceil(RSP / service life) − 1 and repeats A1–A5 and C', () => {
    const m = MATERIALS.find((x) => x.serviceLife > 0 && x.serviceLife < 60 && 60 % x.serviceLife !== 0)!;
    const reps = Math.ceil(60 / m.serviceLife) - 1;
    const mods = calculateEntryModules(entry(m.id, 1, true), 60);
    const once = ['A1_A3', 'A4', 'A5', 'C1_C4'].reduce((a, k) => a + ((m.epd as unknown as Record<string, { GWP: number } | undefined>)[k]?.GWP ?? 0), 0);
    expect(mods.B4!.GWP).toBeCloseTo(once * reps, 9);
  });
  it('adds operational energy as module B6', () => {
    const r = calculateLCA([entry('concrete_c25', 1)], { ...project, energyIntensity: 100, gridCarbonIntensity: 0.71 });
    expect(r.byStage.B6!.GWP).toBeCloseTo(100 * 0.71 * 10_000 * 60, 3);
    expect(r.operationalCarbon).toBeCloseTo(r.byStage.B6!.GWP, 3);
  });
  it('formats kg as tonnes, never mislabelled as Mt', () => {
    expect(formatGWP(1_455_620_000)).toBe('14,55,620 t CO₂e');   // 1.46 million tonnes
    expect(formatGWP(606_000)).toBe('606 t CO₂e');
    expect(formatGWP(950)).toBe('950.0 kg CO₂e');
  });
});

describe('LEED MRc1 Option 4 scoring (reference guide rules)', () => {
  const base = calculateLCA([entry('concrete_c25', 1000), entry('steel_section_virgin', 50_000)], project);
  const scaled = (f: number) => ({ ...base, total: Object.fromEntries(Object.entries(base.total).map(([k, v]) => [k, v * f])) as unknown as typeof base.total });
  it('v4: 3 points only with ≥10% cut in 3 categories including GWP and none >5% worse', () => {
    expect(checkLEEDv4(scaled(0.88), base, project, true).creditPoints).toBe(3);
    expect(checkLEEDv4(scaled(0.95), base, project, true).creditPoints).toBe(0);
    const oneWorse = scaled(0.85); oneWorse.total = { ...oneWorse.total, ODP: base.total.ODP * 1.06 };
    expect(checkLEEDv4(oneWorse, base, project, true).creditPoints).toBe(0);
  });
  it('v4.1: 1 pt for the LCA, 2 at −5%, 3 at −10% with no category >5% worse', () => {
    expect(checkLEEDv41(base, null, project, false).creditPoints).toBe(1);
    expect(checkLEEDv41(scaled(0.94), base, project, true).creditPoints).toBe(2);
    expect(checkLEEDv41(scaled(0.89), base, project, true).creditPoints).toBe(3);
    expect(checkLEEDv41(base, null, { ...project, lifespan: 50 }, false).creditPoints).toBe(0);
  });
  it('EN 15978 accepts aggregated C1–C4 from EPDs and reports D separately', () => {
    const r = checkEN15978(base, project);
    expect(r.requirements.find((q) => q.id === 'stage_C')!.status).toBe('pass');
    expect(r.requirements.find((q) => q.id === 'moduleD')!.status).toBe('pass');
  });
});

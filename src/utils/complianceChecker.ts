import type { LCAResults, Project, ComplianceResult, RequirementResult, MaterialEntry, ImpactValues } from '../types/lca';
import { percentDiff } from './lcaCalculator';
import { LEED_THRESHOLDS, BREEAM_THRESHOLDS, EMBODIED_CARBON_BENCHMARKS } from '../data/standards';

const p = (id: string, desc: string, value?: string, notes?: string): RequirementResult =>
  ({ id, description: desc, status: 'pass', value, notes });
const f = (id: string, desc: string, value?: string, threshold?: string, notes?: string): RequirementResult =>
  ({ id, description: desc, status: 'fail', value, threshold, notes });
const w = (id: string, desc: string, value?: string, notes?: string): RequirementResult =>
  ({ id, description: desc, status: 'warning', value, notes });

const IMPACT_KEYS: (keyof ImpactValues)[] = ['GWP', 'ODP', 'AP', 'EP', 'POCP', 'ADP_fossil'];

export const checkLEEDv4 = (
  proposed: LCAResults, baseline: LCAResults | null, project: Project, hasBaseline: boolean,
): ComplianceResult => {
  const reqs: RequirementResult[] = [];
  const recs: string[] = [];

  reqs.push(p('scope', 'Whole-building LCA scope defined'));
  reqs.push(project.grossFloorArea > 0
    ? p('gfa', 'GFA / functional unit defined', `${project.grossFloorArea} m² × ${project.lifespan} yr`)
    : f('gfa', 'GFA must be set', '0 m²', '>0 m²'));

  if (project.lifespan < 60) {
    reqs.push(w('rsp', 'RSP recommended ≥60 yr for LEED', `${project.lifespan} yr`));
    recs.push('Set the Reference Study Period to at least 60 years (LEED default).');
  } else {
    reqs.push(p('rsp', 'RSP ≥60 years', `${project.lifespan} yr`));
  }

  const stages = new Set(Object.keys(proposed.byStage));
  reqs.push(stages.has('A1-A3')
    ? p('a1a3', 'Stage A1–A3 included (mandatory)')
    : f('a1a3', 'Stage A1–A3 missing – required by LEED v4', 'Missing', 'Required'));
  if (!stages.has('A1-A3')) recs.push('Add A1–A3 materials to your inventory.');

  const allNonZero = IMPACT_KEYS.every((k) => proposed.total[k] !== 0);
  reqs.push(allNonZero
    ? p('impacts', 'All 6 mandatory impact categories have values')
    : w('impacts', 'Some impact categories show zero – verify EPD data'));
  if (!allNonZero) recs.push('Ensure EPD data covers all 6 mandatory categories.');

  let creditPoints = 0;
  if (!hasBaseline || !baseline) {
    reqs.push(w('baseline', 'Baseline not defined – credit points cannot be calculated'));
    recs.push('Define a baseline (code-minimum) building in the Materials → Baseline tab.');
  } else {
    const diff = percentDiff(baseline.total, proposed.total);
    for (const tier of LEED_THRESHOLDS.v4) {
      if (IMPACT_KEYS.filter((k) => (diff[k] ?? 0) <= -tier.minReduction).length >= tier.minCategories) {
        creditPoints = tier.points;
      }
    }
    const reductions = IMPACT_KEYS.filter((k) => (diff[k] ?? 0) < 0).length;
    reqs.push(reductions >= 3
      ? p('reduction', `Improvement achieved in ${reductions}/6 impact categories (≥3 required)`, `${reductions} categories`)
      : f('reduction', 'Need ≥10% reduction in at least 3 categories', `${reductions}`, '≥3 categories'));
    reqs.push({
      id: 'gwp_delta', description: 'GWP change vs. baseline',
      status: (diff.GWP ?? 0) <= -0.10 ? 'pass' : (diff.GWP ?? 0) < 0 ? 'warning' : 'fail',
      value: `${((diff.GWP ?? 0) * 100).toFixed(1)}%`, threshold: '≤ −10%',
    });
    if (creditPoints === 0) recs.push('Improve material selection to achieve ≥10% reduction in ≥3 impact categories.');
  }

  const compliant = reqs.every((r) => r.status !== 'fail');
  return {
    standard: 'LEED_v4_MRc1', label: 'LEED v4 – MRc1 Building LCA', compliant,
    score: creditPoints, maxScore: 3, creditPoints, requirements: reqs,
    summary: compliant ? `Compliant – ${creditPoints}/3 pts` : 'Not fully compliant. Address failing items.',
    recommendations: recs,
  };
};

export const checkLEEDv41 = (
  proposed: LCAResults, baseline: LCAResults | null, project: Project, hasBaseline: boolean,
): ComplianceResult => {
  const reqs: RequirementResult[] = [];
  const recs: string[] = [];
  let creditPoints = 0;

  reqs.push(project.grossFloorArea > 0
    ? p('gfa', 'GFA defined', `${project.grossFloorArea} m²`)
    : f('gfa', 'GFA not set'));

  const stages = new Set(Object.keys(proposed.byStage));
  for (const s of ['A1-A3', 'A4', 'A5']) {
    reqs.push(stages.has(s)
      ? p(`stage_${s}`, `Stage ${s} included`)
      : f(`stage_${s}`, `Stage ${s} required by LEED v4.1`, 'Missing'));
    if (!stages.has(s)) recs.push(`Add materials for stage ${s}.`);
  }

  if (!hasBaseline || !baseline) {
    reqs.push(w('baseline', 'Baseline not defined'));
    recs.push('Create a baseline model to earn credit points.');
  } else {
    const diff = percentDiff(baseline.total, proposed.total);
    for (const tier of LEED_THRESHOLDS.v4_1) {
      if (IMPACT_KEYS.filter((k) => (diff[k] ?? 0) <= -tier.minReduction).length >= tier.minCategories) {
        creditPoints = tier.points;
      }
    }
    reqs.push({
      id: 'pts', description: 'Credit points earned',
      status: creditPoints > 0 ? 'pass' : 'fail',
      value: `${creditPoints} pts`, threshold: '≥1 pt',
    });
  }

  const compliant = reqs.every((r) => r.status !== 'fail');
  return {
    standard: 'LEED_v4_1_MRc1', label: 'LEED v4.1 – MRc1 Building LCA', compliant,
    score: creditPoints, maxScore: 5, creditPoints, requirements: reqs,
    summary: compliant ? `Compliant – ${creditPoints}/5 pts` : 'Not fully compliant.',
    recommendations: recs,
  };
};

export const checkEN15978 = (results: LCAResults, project: Project): ComplianceResult => {
  const reqs: RequirementResult[] = [];
  const recs: string[] = [];

  reqs.push(p('std', 'Assessment framework: EN 15978:2011'));
  reqs.push(project.grossFloorArea > 0 && project.lifespan > 0
    ? p('func', 'Functional unit defined', `${project.grossFloorArea} m² · ${project.lifespan} yr`)
    : f('func', 'Functional unit incomplete'));

  const stages = new Set(Object.keys(results.byStage));
  reqs.push(stages.has('A1-A3') ? p('a1a3', 'Stage A1–A3 included') : f('a1a3', 'Stage A1–A3 missing'));

  for (const s of ['B6', 'C1', 'C2', 'C3', 'C4']) {
    reqs.push(stages.has(s)
      ? p(`stage_${s}`, `Stage ${s} reported`)
      : w(`stage_${s}`, `Stage ${s} recommended (or declare as NR)`, 'Not reported'));
    if (!stages.has(s)) recs.push(`Include stage ${s} or declare it as "Not Relevant" with justification.`);
  }

  const allPresent = IMPACT_KEYS.every((k) => results.total[k] !== 0);
  reqs.push(allPresent ? p('impacts', 'All impact categories reported') : w('impacts', 'Some impact categories are zero'));

  const bm = EMBODIED_CARBON_BENCHMARKS[project.buildingType] ?? EMBODIED_CARBON_BENCHMARKS.other;
  const gwpM2 = results.perM2.GWP;
  const bmStatus = gwpM2 > bm.high ? 'fail' : gwpM2 > bm.median ? 'warning' : 'pass';
  reqs.push({
    id: 'gwp_bm', description: 'GWP/m² vs. industry benchmark', status: bmStatus,
    value: `${gwpM2.toFixed(0)} kg CO₂/m²`, threshold: `Median: ${bm.median}`,
    notes: `Range for ${project.buildingType.replace(/_/g, ' ')}: ${bm.low}–${bm.high} kg CO₂/m²`,
  });
  if (bmStatus === 'fail') recs.push('Embodied carbon is above the high benchmark. Review structural and insulation materials.');
  if (bmStatus === 'warning') recs.push('Embodied carbon is above the industry median. Consider low-carbon alternatives.');

  const compliant = reqs.every((r) => r.status !== 'fail');
  return {
    standard: 'EN_15978', label: 'EN 15978:2011', compliant, requirements: reqs,
    summary: compliant ? 'Meets EN 15978 requirements.' : 'Does not fully meet EN 15978.',
    recommendations: recs,
  };
};

export const checkBREEAM = (
  proposed: LCAResults, baseline: LCAResults | null, hasBaseline: boolean,
): ComplianceResult => {
  const reqs: RequirementResult[] = [];
  const recs: string[] = [];
  let credits = 0;

  reqs.push(p('scope', 'Whole-building LCA conducted'));

  if (!hasBaseline || !baseline) {
    reqs.push(w('baseline', 'Notional baseline not defined'));
    recs.push('Define a notional baseline to calculate BREEAM Mat 01 credits.');
  } else {
    const gwpDiff = (proposed.total.GWP - baseline.total.GWP) / Math.abs(baseline.total.GWP);
    for (const tier of BREEAM_THRESHOLDS) {
      if (gwpDiff <= -tier.gwpReduction) credits = tier.credits;
    }
    reqs.push({
      id: 'gwp', description: 'GWP reduction vs. notional baseline', value: `${(gwpDiff * 100).toFixed(1)}%`,
      status: credits > 0 ? 'pass' : 'fail', threshold: `≤ −${BREEAM_THRESHOLDS[0].gwpReduction * 100}%`,
    });
    if (credits < 6) recs.push(`Need ${6 - credits} more credits – reduce GWP by ≥${BREEAM_THRESHOLDS[credits]?.gwpReduction * 100}% vs. baseline.`);
  }

  const compliant = reqs.every((r) => r.status !== 'fail');
  return {
    standard: 'BREEAM_Mat01', label: 'BREEAM Mat 01', compliant,
    score: credits, maxScore: 6, creditPoints: credits, requirements: reqs,
    summary: compliant ? `${credits}/6 BREEAM credits.` : 'Not compliant.',
    recommendations: recs,
  };
};

export const checkISO14044 = (results: LCAResults, project: Project, entries: MaterialEntry[]): ComplianceResult => {
  const reqs: RequirementResult[] = [
    p('goal', 'Goal & scope defined (project details entered)'),
    entries.length > 0 ? p('lci', 'Life Cycle Inventory (LCI) completed', `${entries.length} entries`) : f('lci', 'LCI empty', '0 entries', '≥1'),
    results.total.GWP !== 0 ? p('lcia', 'Life Cycle Impact Assessment performed') : w('lcia', 'LCIA results appear empty'),
    p('interp', 'Interpretation stage: results available for review'),
  ];
  const compliant = reqs.every((r) => r.status !== 'fail');
  return {
    standard: 'ISO_14044', label: 'ISO 14044:2006', compliant, requirements: reqs,
    summary: compliant ? 'ISO 14044 phases completed.' : 'Incomplete study.',
    recommendations: [],
  };
};

export const runAllCompliance = (
  proposed: LCAResults, baseline: LCAResults | null, project: Project,
  entries: MaterialEntry[], hasBaseline: boolean,
): ComplianceResult[] => [
  checkLEEDv4(proposed, baseline, project, hasBaseline),
  checkLEEDv41(proposed, baseline, project, hasBaseline),
  checkEN15978(proposed, project),
  checkBREEAM(proposed, baseline, hasBaseline),
  checkISO14044(proposed, project, entries),
];

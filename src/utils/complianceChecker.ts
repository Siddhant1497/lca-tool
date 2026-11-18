import type { LCAResults, Project, ComplianceResult, RequirementResult, MaterialEntry, ImpactValues } from '../types/lca';
import { percentDiff } from './lcaCalculator';
import { LEED_RULES, EMBODIED_CARBON_BENCHMARKS } from '../data/standards';

const p = (id: string, desc: string, value?: string, notes?: string): RequirementResult =>
  ({ id, description: desc, status: 'pass', value, notes });
const f = (id: string, desc: string, value?: string, threshold?: string, notes?: string): RequirementResult =>
  ({ id, description: desc, status: 'fail', value, threshold, notes });
const w = (id: string, desc: string, value?: string, notes?: string): RequirementResult =>
  ({ id, description: desc, status: 'warning', value, notes });

const IMPACT_KEYS: (keyof ImpactValues)[] = ['GWP', 'ODP', 'AP', 'EP', 'POCP', 'ADP_fossil'];

/** Highest LEED tier met: GWP must be among the improved categories, and no category may be more than 5% worse. */
const leedTier = (diff: Partial<ImpactValues>, tiers: { points: number; minReduction: number; minCategories: number; minGWP?: number }[]) => {
  const worst = Math.max(...IMPACT_KEYS.map((k) => diff[k] ?? 0));
  let pts = 0;
  for (const t of tiers) {
    const gwp = -(diff.GWP ?? 0);
    const improved = IMPACT_KEYS.filter((k) => -(diff[k] ?? 0) >= t.minReduction);
    const gwpOk = gwp >= (t.minGWP ?? t.minReduction);
    const others = improved.filter((k) => k !== 'GWP').length;
    if (gwpOk && others >= t.minCategories - 1 && worst <= LEED_RULES.maxIncrease) pts = Math.max(pts, t.points);
  }
  return { pts, worst };
};

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
    recs.push('Define a baseline building in the Materials → Baseline tab.');
  } else {
    const diff = percentDiff(baseline.total, proposed.total);
    const { pts, worst } = leedTier(diff, LEED_RULES.v4);
    creditPoints = pts;
    const reductions = IMPACT_KEYS.filter((k) => (diff[k] ?? 0) <= -0.10).length;
    reqs.push(reductions >= 3
      ? p('reduction', `≥10% reduction in ${reductions}/6 impact categories (≥3 required)`, `${reductions} categories`)
      : f('reduction', 'Need ≥10% reduction in at least 3 categories, one of them GWP', `${reductions}`, '≥3 categories'));
    reqs.push({
      id: 'gwp_delta', description: 'GWP change vs. baseline (GWP must be one of the improved categories)',
      status: (diff.GWP ?? 0) <= -0.10 ? 'pass' : (diff.GWP ?? 0) < 0 ? 'warning' : 'fail',
      value: `${((diff.GWP ?? 0) * 100).toFixed(1)}%`, threshold: '≤ −10%',
    });
    reqs.push(worst <= LEED_RULES.maxIncrease
      ? p('no_increase', 'No impact category more than 5% worse than baseline', `worst: ${(worst * 100).toFixed(1)}%`)
      : f('no_increase', 'An impact category is more than 5% worse than baseline', `${(worst * 100).toFixed(1)}%`, '≤ +5%'));
    if (creditPoints === 0) recs.push('Improve material selection to reach ≥10% reduction in ≥3 categories including GWP, with none more than 5% worse.');
  }
  recs.push('Indicative only. LEED v4 MRc1 Option 4 assesses structure and enclosure; confirm scope and data with the current LEED reference guide.');

  const compliant = reqs.every((r) => r.status !== 'fail');
  return {
    standard: 'LEED_v4_MRc1', label: 'LEED v4 – MRc1 Building LCA', compliant,
    score: creditPoints, maxScore: 3, creditPoints, requirements: reqs,
    summary: compliant ? `Indicative: ${creditPoints}/3 pts` : 'Not fully compliant. Address failing items.',
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
  reqs.push(stages.has('A1-A3') ? p('lca', 'Whole-building LCA conducted (path 1: 1 point)') : f('lca', 'No A1–A3 materials in the inventory', 'Missing'));
  if (stages.has('A1-A3')) creditPoints = 1;
  if (project.lifespan < 60) reqs.push(w('rsp', 'Reference study period of at least 60 years expected', `${project.lifespan} yr`));

  if (!hasBaseline || !baseline) {
    reqs.push(w('baseline', 'Baseline not defined – only path 1 can be estimated'));
    recs.push('Create a baseline model to estimate reduction paths 2–4.');
  } else {
    const diff = percentDiff(baseline.total, proposed.total);
    const { pts, worst } = leedTier(diff, LEED_RULES.v4_1);
    creditPoints = Math.max(creditPoints, pts);
    reqs.push({
      id: 'gwp', description: 'GWP change vs. baseline', value: `${((diff.GWP ?? 0) * 100).toFixed(1)}%`,
      status: (diff.GWP ?? 0) <= -0.05 ? 'pass' : 'warning', threshold: '≤ −5% (path 2)',
    });
    reqs.push(worst <= LEED_RULES.maxIncrease
      ? p('no_increase', 'No impact category more than 5% worse than baseline', `worst: ${(worst * 100).toFixed(1)}%`)
      : f('no_increase', 'An impact category is more than 5% worse than baseline', `${(worst * 100).toFixed(1)}%`, '≤ +5%'));
  }
  recs.push('Indicative only. Paths 2 and 4 thresholds should be confirmed in the current LEED v4.1 reference guide.');

  const compliant = reqs.every((r) => r.status !== 'fail');
  return {
    standard: 'LEED_v4_1_MRc1', label: 'LEED v4.1 – MRc1 Building LCA', compliant,
    score: creditPoints, maxScore: 4, creditPoints, requirements: reqs,
    summary: compliant ? `Indicative: ${creditPoints}/4 pts` : 'Not fully compliant.',
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
  const gwpM2 = results.embodiedCarbon / (project.grossFloorArea || 1);
  const bmStatus = gwpM2 > bm.median ? 'warning' : 'pass';
  reqs.push({
    id: 'gwp_bm', description: 'Embodied GWP/m² vs. illustrative range (not an official benchmark)', status: bmStatus,
    value: `${gwpM2.toFixed(0)} kg CO₂/m²`, threshold: `Median: ${bm.median}`,
    notes: `Illustrative range for ${project.buildingType.replace(/_/g, ' ')}: ${bm.low}–${bm.high} kg CO₂/m². Use a national or project-specific benchmark where one exists.`,
  });
  if (bmStatus === 'warning') recs.push('Embodied carbon is above the illustrative median. Review structure, envelope and insulation choices.');
  reqs.push(p('d_sep', 'Module D reported separately, not added to the A–C total'));

  const compliant = reqs.every((r) => r.status !== 'fail');
  return {
    standard: 'EN_15978', label: 'EN 15978:2011', compliant, requirements: reqs,
    summary: compliant ? 'Reporting structure follows EN 15978 modules.' : 'Reporting incomplete against EN 15978.',
    recommendations: recs,
  };
};

export const checkBREEAM = (
  proposed: LCAResults, baseline: LCAResults | null, hasBaseline: boolean,
): ComplianceResult => {
  const reqs: RequirementResult[] = [];
  const recs: string[] = [];
  reqs.push(p('scope', 'Whole-building LCA conducted'));

  if (hasBaseline && baseline) {
    const gwpDiff = (proposed.total.GWP - baseline.total.GWP) / Math.abs(baseline.total.GWP || 1);
    reqs.push({ id: 'gwp', description: 'GWP change vs. baseline', value: `${(gwpDiff * 100).toFixed(1)}%`, status: gwpDiff < 0 ? 'pass' : 'warning' });
  }
  reqs.push({ id: 'credits', description: 'Mat 01 credits are not estimated here', status: 'na', notes: 'Credits depend on the BREEAM scheme version and an approved LCA tool.' });
  recs.push('Use a BREEAM-approved LCA tool and the current scheme manual to calculate Mat 01 credits.');

  const compliant = reqs.every((r) => r.status !== 'fail');
  return {
    standard: 'BREEAM_Mat01', label: 'BREEAM Mat 01', compliant,
    requirements: reqs,
    summary: 'Credits not estimated (needs a BREEAM-approved tool).',
    recommendations: recs,
  };
};

export const checkISO14044 = (results: LCAResults, project: Project, entries: MaterialEntry[]): ComplianceResult => {
  const reqs: RequirementResult[] = [
    project.name && project.grossFloorArea > 0 ? p('goal', 'Goal & scope: project and functional unit defined') : f('goal', 'Goal & scope incomplete', 'Missing project name or GFA'),
    entries.length > 0 ? p('lci', 'Life Cycle Inventory (LCI) completed', `${entries.length} entries`) : f('lci', 'LCI empty', '0 entries', '≥1'),
    results.total.GWP !== 0 ? p('lcia', 'Life Cycle Impact Assessment performed') : w('lcia', 'LCIA results appear empty'),
    w('interp', 'Interpretation: document assumptions, data quality and limitations in your report'),
  ];
  const compliant = reqs.every((r) => r.status !== 'fail');
  return {
    standard: 'ISO_14044', label: 'ISO 14044:2006', compliant, requirements: reqs,
    summary: compliant ? 'Checklist only. A comparative public study also needs critical review.' : 'Incomplete study.',
    recommendations: ['ISO 14044 conformance is self-declared here; comparative assertions disclosed to the public require a critical review panel.'],
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

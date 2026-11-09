import type { LCAResults, Project, ComplianceResult, RequirementResult, MaterialEntry, ImpactValues } from '../types/lca';
import { percentDiff } from './lcaCalculator';
import { BREEAM_THRESHOLDS, EMBODIED_CARBON_BENCHMARKS } from '../data/standards';

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

  // LEED v4 BD+C MRc1 Option 4: ≥10% reduction vs baseline in at least 3 of 6 categories, one of them GWP,
  // and no category more than 5% worse → 3 points.
  let creditPoints = 0;
  if (!hasBaseline || !baseline) {
    reqs.push(w('baseline', 'Baseline not defined – credit points cannot be calculated'));
    recs.push('Define a baseline building in the Materials → Baseline tab.');
  } else {
    const diff = percentDiff(baseline.total, proposed.total);
    const cut10 = IMPACT_KEYS.filter((k) => (diff[k] ?? 0) <= -0.10);
    const worse = IMPACT_KEYS.filter((k) => (diff[k] ?? 0) > 0.05);
    const ok = cut10.includes('GWP') && cut10.length >= 3 && worse.length === 0;
    if (ok) creditPoints = 3;
    reqs.push(cut10.length >= 3 && cut10.includes('GWP')
      ? p('reduction', `≥10% reduction in ${cut10.length}/6 categories including GWP`, `${cut10.length} categories`, '≥3 incl. GWP')
      : f('reduction', 'Need ≥10% reduction in at least 3 categories, one of them GWP', `${cut10.length}${cut10.includes('GWP') ? '' : ' (GWP not)'}`, '≥3 incl. GWP'));
    reqs.push(worse.length === 0
      ? p('no_increase', 'No impact category more than 5% above baseline')
      : f('no_increase', `More than 5% above baseline: ${worse.join(', ')}`, `${worse.length}`, '0'));
    reqs.push({
      id: 'gwp_delta', description: 'GWP change vs. baseline',
      status: (diff.GWP ?? 0) <= -0.10 ? 'pass' : (diff.GWP ?? 0) < 0 ? 'warning' : 'fail',
      value: `${((diff.GWP ?? 0) * 100).toFixed(1)}%`, threshold: '≤ −10%',
    });
    if (!ok) recs.push('Reach ≥10% reduction in GWP and two other categories without any category rising more than 5%.');
  }

  const compliant = reqs.every((r) => r.status !== 'fail');
  return {
    standard: 'LEED_v4_MRc1', label: 'LEED v4 – MRc1 Building LCA (Option 4)', compliant,
    score: creditPoints, maxScore: 3, creditPoints, requirements: reqs,
    summary: !compliant ? 'Not fully compliant. Address failing items.' : creditPoints ? `Option 4 achieved – ${creditPoints}/3 pts` : 'Inputs complete; no points until a baseline comparison meets the thresholds.',
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

  // LEED v4.1 BD+C MRc1 Option 4 (whole-building LCA of structure and enclosure, 60-year service life):
  // Path 1 conduct the LCA = 1 pt; Path 2 ≥5% GWP and ≥5% in two other categories = 2 pts;
  // Path 3 ≥10% GWP and ≥5% in two others, no category >5% worse = 3 pts; Path 4 = Path 3 plus reuse/salvage = 4 pts.
  const stages = new Set(Object.keys(proposed.byStage));
  const lcaDone = stages.has('A1-A3') && project.grossFloorArea > 0 && project.lifespan >= 60;
  reqs.push(stages.has('A1-A3') ? p('stage_A1-A3', 'Product stage A1–A3 included') : f('stage_A1-A3', 'Product stage A1–A3 missing', 'Missing'));
  for (const [st, label] of [['A4', 'Transport to site (A4)'], ['C1-C4', 'End of life (C1–C4)']] as const) {
    const has = stages.has(st) || (st === 'C1-C4' && ['C1', 'C2', 'C3', 'C4'].some((x) => stages.has(x)));
    reqs.push(has ? p(`stage_${st}`, `${label} included`) : w(`stage_${st}`, `${label} expected for cradle-to-grave`, 'Not reported'));
  }
  reqs.push(project.lifespan >= 60 ? p('rsp', 'Service life ≥ 60 years', `${project.lifespan} yr`) : f('rsp', 'Service life must be at least 60 years', `${project.lifespan} yr`, '≥60 yr'));
  if (lcaDone) creditPoints = 1;
  if (!hasBaseline || !baseline) {
    reqs.push(w('baseline', 'Baseline not defined – Path 1 only (1 pt)'));
    recs.push('Add a baseline building to pursue Paths 2–3.');
  } else if (lcaDone) {
    const diff = percentDiff(baseline.total, proposed.total);
    const others5 = IMPACT_KEYS.filter((k) => k !== 'GWP' && (diff[k] ?? 0) <= -0.05).length;
    const worse = IMPACT_KEYS.filter((k) => (diff[k] ?? 0) > 0.05);
    const g = diff.GWP ?? 0;
    if (g <= -0.05 && others5 >= 2) creditPoints = 2;
    if (g <= -0.10 && others5 >= 2 && worse.length === 0) creditPoints = 3;
    reqs.push({ id: 'gwp_delta', description: 'GWP change vs. baseline', status: g <= -0.05 ? 'pass' : 'warning', value: `${(g * 100).toFixed(1)}%`, threshold: '≤ −5% (Path 2) / ≤ −10% (Path 3)' });
    reqs.push(others5 >= 2 ? p('others', `≥5% reduction in ${others5} other categories`) : w('others', 'Need ≥5% reduction in two categories besides GWP', `${others5}`, '≥2'));
    if (worse.length) reqs.push(w('no_increase', `More than 5% above baseline: ${worse.join(', ')} (blocks Path 3)`));
    if (creditPoints === 3) recs.push('Path 4 (4 pts): show building reuse or salvaged materials in the LCA as well.');
  }
  reqs.push({ id: 'pts', description: 'Option 4 points', status: creditPoints > 0 ? 'pass' : 'fail', value: `${creditPoints} pts`, threshold: '1–4 pts' });

  const compliant = reqs.every((r) => r.status !== 'fail');
  return {
    standard: 'LEED_v4_1_MRc1', label: 'LEED v4.1 – MRc1 Building LCA (Option 4)', compliant,
    score: creditPoints, maxScore: 4, creditPoints, requirements: reqs,
    summary: compliant ? `Option 4 – ${creditPoints}/4 pts` : 'Not fully compliant.',
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

  for (const s of ['A4', 'A5', 'B4', 'B6']) {
    reqs.push(stages.has(s)
      ? p(`stage_${s}`, `Module ${s} reported`)
      : w(`stage_${s}`, `Module ${s} recommended (or declare as not relevant)`, 'Not reported'));
    if (!stages.has(s)) recs.push(`Include module ${s} or declare it as "not relevant" with justification.`);
  }
  const eol = stages.has('C1-C4') || ['C1', 'C2', 'C3', 'C4'].every((x) => stages.has(x));
  reqs.push(eol ? p('stage_C', 'End of life C1–C4 reported') : w('stage_C', 'End of life C1–C4 recommended', 'Not reported'));
  if (!eol) recs.push('Include end of life (C1–C4) from the EPDs.');
  reqs.push(p('moduleD', 'Module D reported separately, outside the A–C total', `${results.moduleD.GWP.toFixed(0)} kg CO₂e`));

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
    summary: compliant ? `${credits}/6 credits (indicative; confirm in the BREEAM Mat 01 tool).` : 'Not compliant (indicative).',
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

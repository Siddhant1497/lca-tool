/**
 * Decarbonisation measure library. Qualitative on purpose: abatement and cost depend on the asset,
 * so they are entered per project when a measure is added to the plan (and ideally backed by an
 * energy model, LCA or vendor quote). LEED v4/v4.1 BD+C credit links are given where they apply.
 */
export type SourceKey = 'electricity' | 'fuel' | 'refrigerant' | 'fleet' | 'cat1' | 'cat2' | 'cat3' | 'cat4' | 'cat5' | 'cat6' | 'cat7' | 'cat11' | 'cat13' | 'general';
export type Horizon = 'Now' | 'Next' | 'Later';
export interface Measure { id: string; title: string; applies: SourceKey[]; scope: 1 | 2 | 3; kind: string; horizon: Horizon; what: string; credits?: string }

export const SOURCE_LABEL: Record<SourceKey, string> = {
  electricity: 'Purchased electricity', fuel: 'Stationary fuels & DG sets', refrigerant: 'Refrigerant leakage', fleet: 'Owned fleet',
  cat1: 'Purchased goods & services', cat2: 'Capital goods & construction', cat3: 'Fuel- & energy-related', cat4: 'Upstream transport',
  cat5: 'Waste', cat6: 'Business travel', cat7: 'Employee commuting', cat11: 'Use of sold products', cat13: 'Downstream leased assets', general: 'Cross-cutting',
};

export const MEASURES: Measure[] = [
  { id: 'hvac-rcx', title: 'HVAC optimisation & retro-commissioning', applies: ['electricity', 'fuel'], scope: 2, kind: 'Efficiency', horizon: 'Now',
    what: 'Fix schedules, set-points and sequences, remove simultaneous heating and cooling, reset chilled-water temperatures. Verify savings against a calibrated energy model or metered baseline.', credits: 'LEED EA Enhanced Commissioning · EA Optimize Energy Performance' },
  { id: 'led', title: 'LED lighting with occupancy & daylight controls', applies: ['electricity'], scope: 2, kind: 'Efficiency', horizon: 'Now',
    what: 'Replace remaining fluorescent/HID fittings; add occupancy sensing and daylight dimming in perimeter zones (use daylight simulation to size zones).', credits: 'LEED EA Optimize Energy Performance' },
  { id: 'meter', title: 'Sub-metering & BMS analytics', applies: ['electricity', 'fuel'], scope: 2, kind: 'Data & controls', horizon: 'Now',
    what: 'Meter major end uses and tenants so savings can be measured, verified and kept. It is also the basis for moving data quality from "estimated" to "measured".', credits: 'LEED EA Advanced Energy Metering' },
  { id: 'solar', title: 'On-site solar PV (rooftop / carport)', applies: ['electricity'], scope: 2, kind: 'Renewables', horizon: 'Next',
    what: 'Size from available roof area and load profile; consider net metering limits. Reduces both location- and market-based Scope 2.', credits: 'LEED EA Renewable Energy' },
  { id: 'ppa', title: 'Off-site renewable PPA / open access / green tariff', applies: ['electricity'], scope: 2, kind: 'Renewables', horizon: 'Next',
    what: 'Reduces market-based Scope 2 only. Location-based stays the same. Check contract quality (vintage, market boundary, retirement of certificates) against GHG Protocol Scope 2 Quality Criteria.', credits: 'LEED EA Green Power and Carbon Offsets' },
  { id: 'envelope', title: 'Envelope & glazing upgrade at refurbishment', applies: ['electricity', 'fuel'], scope: 2, kind: 'Efficiency', horizon: 'Later',
    what: 'Time with façade or roof replacement. Test options (U-value, SHGC, shading) in an energy simulation before specifying.', credits: 'LEED EA Optimize Energy Performance' },
  { id: 'dg', title: 'Cut DG-set run hours (grid reliability, solar + storage)', applies: ['fuel'], scope: 1, kind: 'Fuel switch', horizon: 'Next',
    what: 'Log DG run hours by cause; reduce through better grid supply agreements, UPS/battery storage for short outages and load shedding of non-critical loads.' },
  { id: 'heatpump', title: 'Electrify heating & hot water with heat pumps', applies: ['fuel'], scope: 1, kind: 'Electrification', horizon: 'Next',
    what: 'Replace gas/diesel boilers and water heaters. Shifts emissions to Scope 2, so pair with renewables for the full benefit.' },
  { id: 'boiler', title: 'Boiler & thermal system tuning', applies: ['fuel'], scope: 1, kind: 'Efficiency', horizon: 'Now',
    what: 'Combustion tuning, condensate recovery, pipe insulation and controls on existing boilers or thermic-fluid heaters.' },
  { id: 'leak', title: 'Refrigerant leak detection & management log', applies: ['refrigerant'], scope: 1, kind: 'Fugitive control', horizon: 'Now',
    what: 'Keep an asset-level log of charge and top-ups (that log is your Scope 1 activity data), with leak checks and repair-on-detection.', credits: 'LEED EA Enhanced Refrigerant Management' },
  { id: 'lowgwp', title: 'Move to low-GWP refrigerants at replacement', applies: ['refrigerant'], scope: 1, kind: 'Fugitive control', horizon: 'Later',
    what: 'Specify lower-GWP refrigerants when chillers, VRF or split units reach end of life. Compare options on GWP and on efficiency.', credits: 'LEED EA Enhanced Refrigerant Management' },
  { id: 'ev', title: 'Fleet electrification & charging', applies: ['fleet'], scope: 1, kind: 'Electrification', horizon: 'Next',
    what: 'Replace pool cars and site vehicles at end of lease; install charging. Moves emissions into Scope 2.', credits: 'LEED LT Electric Vehicles' },
  { id: 'route', title: 'Route optimisation & driver training', applies: ['fleet', 'cat4'], scope: 1, kind: 'Efficiency', horizon: 'Now',
    what: 'Telematics, eco-driving and trip consolidation cut fuel use with almost no capital outlay.' },
  { id: 'supplier', title: 'Supplier engagement & emission data requests', applies: ['cat1', 'cat2', 'cat4'], scope: 3, kind: 'Engagement', horizon: 'Now',
    what: 'Ask top suppliers by spend for product-level EPDs or supplier-specific factors. That moves Scope 3 off spend-based estimates and shows real reductions.' },
  { id: 'procure', title: 'Low-carbon procurement criteria', applies: ['cat1', 'cat2'], scope: 3, kind: 'Procurement', horizon: 'Next',
    what: 'Add GWP limits (from EPDs) to tenders for high-impact categories: concrete, steel, aluminium, glass and insulation.', credits: 'LEED MR Environmental Product Declarations' },
  { id: 'wblca', title: 'Embodied-carbon targets through whole-building LCA', applies: ['cat2'], scope: 3, kind: 'Design', horizon: 'Now',
    what: 'Set a kgCO₂e/m² target at concept stage and test structure and façade options in the Building LCA module before design freeze.', credits: 'LEED MR Building Life-Cycle Impact Reduction' },
  { id: 'concrete', title: 'Low-carbon concrete & recycled-content steel', applies: ['cat2', 'cat1'], scope: 3, kind: 'Materials', horizon: 'Next',
    what: 'Use cement replacement (GGBS, fly ash, calcined clay) and optimised mixes, plus higher recycled-content or EAF steel. Back the choice with supplier EPDs.', credits: 'LEED MR Building Life-Cycle Impact Reduction' },
  { id: 'reuse', title: 'Retrofit and reuse before new build', applies: ['cat2'], scope: 3, kind: 'Design', horizon: 'Later',
    what: 'Keeping structure and façade avoids most upfront embodied carbon; compare retrofit and new-build options on whole-life carbon.', credits: 'LEED MR Building Life-Cycle Impact Reduction' },
  { id: 'freight', title: 'Freight mode shift & load consolidation', applies: ['cat4'], scope: 3, kind: 'Logistics', horizon: 'Next',
    what: 'Shift long-haul road freight to rail where available, consolidate deliveries, prefer local suppliers for heavy materials.' },
  { id: 'waste', title: 'Waste segregation & diversion from landfill', applies: ['cat5'], scope: 3, kind: 'Circularity', horizon: 'Now',
    what: 'Segregate at source and use composting, recycling and authorised C&D recyclers. Track diverted tonnage by stream.', credits: 'LEED MR Construction and Demolition Waste Management' },
  { id: 'travel', title: 'Business travel policy', applies: ['cat6'], scope: 3, kind: 'Policy', horizon: 'Now',
    what: 'Rail over short-haul flights, economy class by default, virtual-first for internal meetings, and travel budgets in carbon as well as cost.' },
  { id: 'commute', title: 'Commuting programme', applies: ['cat7'], scope: 3, kind: 'Engagement', horizon: 'Now',
    what: 'Employee shuttles, transit passes, cycle parking and showers, carpool matching and hybrid working. Survey commuting annually for data.', credits: 'LEED LT Bicycle Facilities · LT Reduced Parking Footprint' },
  { id: 'products', title: 'Efficient products / high-performance sold buildings', applies: ['cat11'], scope: 3, kind: 'Design', horizon: 'Next',
    what: 'For developers: the operational energy of sold buildings often sits in Category 11. Raise design energy performance and pre-fit solar to cut it.', credits: 'LEED EA Optimize Energy Performance' },
  { id: 'greenlease', title: 'Green leases & tenant data sharing', applies: ['cat13'], scope: 3, kind: 'Engagement', horizon: 'Now',
    what: 'Lease clauses for energy-data sharing, efficiency standards in fit-outs and shared savings. Turns estimated tenant emissions into measured ones.' },
  { id: 'wtt', title: 'Cut fuel & electricity use (reduces WTT and T&D losses)', applies: ['cat3'], scope: 3, kind: 'Efficiency', horizon: 'Now',
    what: 'Category 3 follows your energy use, so every Scope 1 and 2 efficiency measure also reduces it. No separate action is needed beyond tracking it.' },
  { id: 'icp', title: 'Internal carbon price', applies: ['general'], scope: 1, kind: 'Governance', horizon: 'Next',
    what: 'A shadow price on capex decisions makes low-carbon options visible in investment appraisal.' },
  { id: 'govern', title: 'Board-approved targets, governance & annual review', applies: ['general'], scope: 1, kind: 'Governance', horizon: 'Now',
    what: 'Adopt the targets above, assign owners per lever, review progress annually and recalculate the base year when structural changes exceed your threshold.' },
];

/** Classify a factor name into a source bucket for hotspot → measure matching. */
export function sourceKeyOf(name: string, scope: number, s3cat?: number): SourceKey {
  const s = name.toLowerCase();
  if (scope === 3) {
    if (s3cat && ([1, 2, 3, 4, 5, 6, 7, 11, 13] as number[]).includes(s3cat)) return `cat${s3cat}` as SourceKey;
    // Untagged Scope 3 factors: infer from the name (e.g. DESNZ "Business travel- air").
    if (/commut/.test(s)) return 'cat7';
    if (/business travel|flight|air travel|hotel|rail|taxi|passenger/.test(s)) return 'cat6';
    if (/freight|hgv|deliver|haul|shipping|cargo|tonne\.km/.test(s)) return 'cat4';
    if (/waste|landfill|recycl|compost|incinerat/.test(s)) return 'cat5';
    if (/wtt|well-to-tank|transmission|distribution loss|t&d/.test(s)) return 'cat3';
    return 'cat1';
  }
  if (scope === 2) return 'electricity';
  if (/refrig|hfc|r-?\d{2,3}|r-?4\d\d[a-z]?/.test(s)) return 'refrigerant';
  if (/\b(car|cars|van|vans|vehicle|fleet|truck|hgv|motorbike|bus)\b/.test(s)) return 'fleet';
  if (/electric|grid|kwh|mwh/.test(s)) return 'electricity';
  return 'fuel';
}

/**
 * Cost–benefit library for green building measures, priced for the Indian market.
 *
 * Every number carries a source and a tier:
 *  - official: read from a government or regulator document (tariff order, BEE/CEA/MNRE publication).
 *  - market:   published Indian market prices (B2B listings, EPC price guides). Wide ranges; use project quotes.
 *  - estimate: engineering assumption with no single published source. Shown in amber; replace with your
 *              DesignBuilder results or contractor quotes before using the numbers in a report.
 * Collected 10 Nov 2026.
 */

export type CbaTier = 'official' | 'market' | 'estimate' | 'research';
export interface CbaSource { id: string; title: string; publisher: string; date: string; url?: string; tier: CbaTier; note: string }

export const CBA_SOURCES: CbaSource[] = [
  { id: 'merc', tier: 'official', publisher: 'Maharashtra Electricity Regulatory Commission', date: 'Mar 2025 (MYT order, Case 75 of 2025)',
    title: 'MSEDCL tariffs FY 2025-26 to FY 2029-30 (press note, Annexures 1, 3 and 4)', url: 'https://merc.gov.in/wp-content/uploads/2025/03/Press-Note_MSEDCL-MYT-Order_English.pdf',
    note: 'FY 2026-27: HT-II Commercial demand ₹560/kVA/month, energy ₹8.83 + wheeling ₹0.60 per kVAh; average billing rate ₹11.24/kWh. LT-II(C) non-residential >50 kW: ₹525/kVA/month, ₹12.16 + ₹1.14 per kVAh. kVAh billing applies to HT and LT >20 kW.' },
  { id: 'beecool', tier: 'official', publisher: 'Bureau of Energy Efficiency and GIZ', date: '2025',
    title: 'Future-Proofing India\'s Cooling: District Cooling within the ICAP Framework (Tables 1 and 2)', url: 'https://beeindia.gov.in/WriteReadData/L45218/6904453686817686.pdf',
    note: 'Annual operating efficiency (kWh/TRh): room AC 0.886, chiller system 1.007 (BEE 2-star screw + ECSBC auxiliaries + AHUs), VRF 0.658, packaged DX 1.269. 5-star centrifugal chiller 0.38 kWh/TRh + pumps 0.10 + tower 0.06 + AHU 0.25 = 0.79. Rated: 2-star screw 0.63 kW/TR, 5-star centrifugal 0.53 kW/TR. EFLH: daytime commercial 2,500 h, 24-hour commercial 5,000 h, residential 1,500 h.' },
  { id: 'cea', tier: 'official', publisher: 'Central Electricity Authority', date: 'v22.0, Aug 2026',
    title: 'CO₂ Baseline Database for the Indian Power Sector, Annexure-I', url: 'https://cea.nic.in/cdm-co2-baseline-database/?lang=en',
    note: 'All-India weighted average grid emission factor FY 2025-26: 0.675 tCO₂/MWh (FY 2024-25: 0.710).' },
  { id: 'ecbc', tier: 'official', publisher: 'Bureau of Energy Efficiency', date: '2017',
    title: 'Energy Conservation Building Code 2017, lighting power density (building area method) and envelope', url: 'https://beeindia.gov.in/sites/default/files/ECBC%202017.pdf',
    note: 'Office LPD: 9.5 W/m² (ECBC), 7.6 W/m² (ECBC+), 5.0 W/m² (SuperECBC). Roof assembly U-factor 0.33 W/m²K for most occupancies and climates.' },
  { id: 'undp', tier: 'official', publisher: 'UNDP-GEF-BEE Energy Efficiency in Commercial Buildings project', date: '2017',
    title: 'ECBC compliance: incremental cost and payback', url: 'https://www.aeee.in/wp-content/uploads/2017/10/UNDP-GEF-BEE-Project-by-UNDP.pdf',
    note: 'Incremental cost 0.8–4% of construction cost; simple payback 1–4 years. ECBC ≈ 25%, ECBC+ ≈ 35%, SuperECBC ≥ 50% savings vs a conventional building.' },
  { id: 'mnre', tier: 'official', publisher: 'Ministry of New and Renewable Energy (as reported)', date: '13 Feb 2024',
    title: 'Benchmark cost for grid-connected rooftop solar (residential)', url: 'https://renewablewatch.in/2024/01/10/mnre-introduces-new-cfa-benchmarks-under-phase-ii-of-rooftop-solar-programme/',
    note: '₹50,000/kW for the first 2 kW and ₹45,000/kW above (general category states). Residential benchmark: use only as a ceiling check for C&I.' },
  { id: 'rbi', tier: 'official', publisher: 'Reserve Bank of India, MPC (as reported)', date: '5 Jun 2026',
    title: 'Monetary policy statement', url: 'https://www.business-standard.com/finance/news/rbi-holds-repo-rate-at-5-25-keeps-policy-stance-neutral-126060500287_1.html',
    note: 'Repo rate 5.25%; FY 2026-27 CPI projection 5.1%. Used as the default O&M inflation; the discount rate is your cost of capital.' },
  { id: 'eesl', tier: 'official', publisher: 'EESL UJALA programme via Tata Power-DDL', date: '2021–2023',
    title: 'UJALA / EEP appliance prices', url: 'https://www.tatapower-ddl.com/Editor_UploadedDocuments/Content/EEP-FAQs_(25-04-23).pdf',
    note: '20 W LED tube ₹180–220; BEE 5-star fan ₹1,150–1,200; BLDC fan ₹3,000. Programme prices, below retail.' },
  { id: 'cisolar', tier: 'market', publisher: 'Indian C&I solar EPC price guides', date: '2025–2026',
    title: 'Commercial rooftop solar EPC cost per kW', url: 'https://brightleaf.energy/blogs/commercial-solar-system-cost-india-2026/',
    note: '100 kW C&I rooftop: ₹38,000–52,000 per kW installed (lower for larger plants; 20 kW ₹55,000–65,000/kW).' },
  { id: 'chiller', tier: 'market', publisher: 'IndiaMART / TradeIndia listings', date: '2025–2026',
    title: 'Water-cooled screw and magnetic-bearing centrifugal chiller prices', url: 'https://dir.indiamart.com/impcat/water-cooled-screw-chillers.html',
    note: 'Screw: about ₹16,000–27,000 per TR (60–200 TR listings). Magnetic-bearing: from about ₹25,000 per TR. Asking prices; compare quotes at the same IPLV and scope.' },
  { id: 'vfd', tier: 'market', publisher: 'Industrial distributor list prices; HVAC audit guide', date: '2025–2026',
    title: 'Variable frequency drive prices', url: 'https://www.industrybuying.com/delta-FAM157253/',
    note: 'Drive only: about ₹740–1,500 per kW (22–185 kW). Installed with panel for AHU/pump: about ₹5,000–6,800 per kW.' },
  { id: 'xps', tier: 'market', publisher: 'Indian supplier listings and insulation guide', date: '2025–2026',
    title: 'XPS roof insulation, 50 mm', url: 'https://www.studiomatrx.org/guides/xps-insulation-india',
    note: 'Board ₹500–695/m²; installed about ₹430–700/m² (material + contractor).' },
  { id: 'coolroof', tier: 'market', publisher: 'Cool roof coating suppliers; RMI India and Lodha', date: '2025',
    title: 'Cool roof coatings and high-albedo tiles', url: 'https://www.lodhagroup.com/blogs/sustainability/cool-roof-benefits-government-policies-challenges',
    note: 'Coating, material + application ₹200–400/m²; high-albedo tiles ₹540–1,080/m².' },
  { id: 'glazing', tier: 'market', publisher: 'Window and glass supplier guides and listings', date: '2025–2026',
    title: 'Single glazing vs double-glazed low-e units', url: 'https://woodenmax.in/blog/energy-efficient-windows-guide',
    note: 'Single glass windows ₹4,300–6,500/m²; DGU low-e ₹10,800–15,100/m² (with frame). Glass-only DGU listings from ₹2,260–3,070/m².' },
  { id: 'stp', tier: 'market', publisher: 'STP cost guides (India)', date: '2025–2026',
    title: 'Sewage treatment plant capex and opex', url: 'https://www.studiomatrx.org/guides/commercial-stp-cost',
    note: 'MBBR/SBR ₹30,000–60,000 per KLD; MBR ₹65,000–1,10,000 per KLD. Running cost ₹14–28 per kL treated; 0.5–1.5 kWh per KLD.' },
  { id: 'fixtures', tier: 'market', publisher: 'Water-efficient fixture guides (India)', date: '2025–2026',
    title: 'Aerators, sensor taps and dual-flush', url: 'https://www.studiomatrx.org/guides/water-saving-faucet-india',
    note: 'Brass aerator ₹120–500; battery sensor tap ₹2,500–5,000; dual-flush 3/6 L.' },
  { id: 'cement', tier: 'market', publisher: 'Cement price trackers (India)', date: '2025',
    title: 'OPC 53 vs PPC prices', url: 'https://infralens.in/prices/cement',
    note: 'OPC 53 ₹400–455 per 50 kg bag in metros; PPC/PSC typically ₹20–40 per bag cheaper (5–8%).' },
  { id: 'lbnl', tier: 'research', publisher: 'Lawrence Berkeley National Laboratory', date: '2010s',
    title: 'Advanced lighting controls testbed: occupancy and daylight controls', url: 'https://eta-publications.lbl.gov/publications/comparison-control-options-private',
    note: 'Commissioned occupancy + daylight controls: up to 46% lighting savings. Default here: 25%.' },
  { id: 'est', tier: 'estimate', publisher: 'SustainHub engineering assumption', date: '2026',
    title: 'Engineering estimate', note: 'No single published Indian source. Replace with project quotes, DesignBuilder results or measured data.' },
];

export type CbaCategory = 'Design & process' | 'HVAC' | 'Lighting' | 'Envelope' | 'Renewables' | 'Water' | 'Materials';
export const CBA_CATEGORIES: CbaCategory[] = ['Design & process', 'HVAC', 'Lighting', 'Envelope', 'Renewables', 'Water', 'Materials'];

export type BuildingUse = 'day' | '24h' | 'res';
export const USE_LABEL: Record<BuildingUse, string> = { day: 'Daytime commercial (office, retail, education)', '24h': '24-hour commercial (hospital, hotel, data, transit)', res: 'Residential' };
export const EFLH: Record<BuildingUse, number> = { day: 2500, '24h': 5000, res: 1500 };        // BEE/GIZ 2025, Table 1
export const LIGHT_HOURS: Record<BuildingUse, number> = { day: 2750, '24h': 6500, res: 1800 };  // estimate

/** Baseline cooling system presets, annual operating efficiency kWh/TRh (BEE/GIZ 2025, Table 2). */
export const COOLING_PRESETS = [
  { id: 'chiller', label: 'Water-cooled chiller plant, BEE 2-star screw', kwhTRh: 1.007 },
  { id: 'vrf', label: 'VRF system', kwhTRh: 0.658 },
  { id: 'dx', label: 'Packaged / ducted DX', kwhTRh: 1.269 },
  { id: 'rac', label: 'Room / split ACs, 3-star inverter', kwhTRh: 0.886 },
] as const;

export interface TariffPreset { id: string; label: string; energy: number; demand: number; source: string; note: string }
export const TARIFF_PRESETS: TariffPreset[] = [
  { id: 'msedcl-ht2-27', label: 'MSEDCL HT-II Commercial, FY 2026-27', energy: 9.43, demand: 560, source: 'merc', note: 'Energy ₹8.83 + wheeling ₹0.60 per kVAh; demand ₹560/kVA/month.' },
  { id: 'msedcl-lt2c-27', label: 'MSEDCL LT-II(C) Non-residential >50 kW, FY 2026-27', energy: 13.30, demand: 525, source: 'merc', note: 'Energy ₹12.16 + wheeling ₹1.14 per kVAh; demand ₹525/kVA/month.' },
  { id: 'msedcl-ht2-abr', label: 'MSEDCL HT-II average billing rate, FY 2026-27 (all-in, no demand split)', energy: 11.24, demand: 0, source: 'merc', note: 'Average billing rate includes fixed charges; use when demand savings are not modelled separately.' },
  { id: 'custom', label: 'Custom (enter your DISCOM tariff)', energy: 10, demand: 500, source: 'est', note: 'Enter the energy, wheeling and demand charges from your tariff order.' },
];

/** Project basis: shared inputs every measure reads. */
export interface CbaBasis {
  name: string; gfa: number; use: BuildingUse;
  annualKwh: number;         // whole-building electricity, kWh/yr (bills or energy model baseline)
  coolingTR: number; eflh: number; baseKwhTRh: number; coolingPreset: string;
  lightHours: number; occupants: number; workDays: number; roofArea: number;
  tariffPreset: string; energyRate: number; demandRate: number; dutyPct: number; escalation: number;
  waterRate: number; waterEsc: number;
  discount: number; cpi: number; years: number;
  gridEF: number; gridDecline: number; carbonPrice: number;
  capexCase: 'low' | 'typical' | 'high';
}

export const DEFAULT_BASIS: CbaBasis = {
  name: 'New office building', gfa: 10000, use: 'day',
  annualKwh: 1_500_000, coolingTR: 435, eflh: 2500, baseKwhTRh: 1.007, coolingPreset: 'chiller',
  lightHours: 2750, occupants: 1000, workDays: 260, roofArea: 2500,
  tariffPreset: 'msedcl-ht2-27', energyRate: 9.43, demandRate: 560, dutyPct: 0, escalation: 2,
  waterRate: 60, waterEsc: 5,
  discount: 10, cpi: 5.1, years: 20,
  gridEF: 0.675, gridDecline: 2, carbonPrice: 0,
  capexCase: 'typical',
};

/** Which basis fields carry which source (for the source badges next to inputs). */
export const BASIS_SOURCES: Partial<Record<keyof CbaBasis, string>> = {
  eflh: 'beecool', baseKwhTRh: 'beecool', energyRate: 'merc', demandRate: 'merc', gridEF: 'cea', cpi: 'rbi',
  annualKwh: 'est', coolingTR: 'est', lightHours: 'est', waterRate: 'est', escalation: 'est', gridDecline: 'est', discount: 'est',
};

/** What a measure does to the building for one year, before pricing. */
export interface MeasureEffect {
  kwh?: number;          // electricity saved directly, kWh/yr (negative = extra use)
  trh?: number;          // cooling load removed, TRh/yr (priced at the baseline plant efficiency; interacts in the package)
  plant?: number;        // new cooling plant efficiency, kWh/TRh (applies to whatever cooling load remains)
  kva?: number;          // contract demand reduced, kVA
  kl?: number;           // water saved, kL/yr
  om?: number;           // extra O&M cost, ₹/yr (negative = O&M saving)
  embodiedT?: number;    // one-time embodied carbon saved, tCO2e
  degrade?: number;      // %/yr output decline (PV)
  steps: string[];       // human-readable calculation trace
}

export interface MeasureInput { key: string; label: string; unit: string; def: (b: CbaBasis) => number; step?: number; src?: string }
export interface CbaMeasure {
  id: string; name: string; cat: CbaCategory; what: string;
  inputs: MeasureInput[];
  /** Cost per unit of `qty` (or lump sum when qty is absent). incremental = premium over the conventional option. */
  cost: { per: string; qty?: string; low: number; typical: number; high: number; basis: 'incremental' | 'full'; src: string[] };
  life: number;
  calc: (b: CbaBasis, v: Record<string, number>) => MeasureEffect;
  src: string[];         // sources for the savings method
  credits: string;
  defaultOn?: boolean;
}

const f0 = (n: number) => Math.round(n).toLocaleString('en-IN');
const COOL_FRAC = 0.8;    // share of lighting heat removed by the cooling plant in an AC building (estimate)
const kWhPerTRh = 3.517;  // 1 TRh = 3.517 kWh of heat

/* ───────────────────────────── measure library ───────────────────────────── */
export const CBA_MEASURES: CbaMeasure[] = [
  /* Design & process */
  { id: 'model', cat: 'Design & process', name: 'Whole-building energy simulation and design optimisation',
    what: 'Energy model (e.g. DesignBuilder/EnergyPlus) at concept and design stage to test envelope, glazing, shading, HVAC and controls options against an ECBC / ASHRAE 90.1 baseline.',
    inputs: [{ key: 'pct', label: 'Saving found by optimisation', unit: '% of building electricity', def: () => 5, step: 0.5, src: 'est' }],
    cost: { per: 'lump sum (modelling fee)', low: 150_000, typical: 300_000, high: 600_000, basis: 'full', src: ['est'] },
    life: 20, src: ['undp', 'est'], credits: 'LEED EAp2/EAc2 · IGBC EE · GRIHA Cr 7', defaultOn: true,
    calc: (b, v) => ({ kwh: b.annualKwh * v.pct / 100, steps: [`${f0(b.annualKwh)} kWh/yr × ${v.pct}% = ${f0(b.annualKwh * v.pct / 100)} kWh/yr`, 'Replace the % with (baseline − proposed) / baseline from your model, or enter the simulated kWh directly.'] }) },
  { id: 'cx', cat: 'Design & process', name: 'Enhanced commissioning (design review to seasonal testing)',
    what: 'Third-party commissioning authority from design to 10 months after handover.',
    inputs: [{ key: 'pct', label: 'Energy saved by commissioning', unit: '% of building electricity', def: () => 5, step: 0.5, src: 'est' }],
    cost: { per: '₹/m² of GFA', qty: 'gfa', low: 40, typical: 80, high: 150, basis: 'full', src: ['est'] },
    life: 8, src: ['est'], credits: 'LEED EAc1 · IGBC EE · GRIHA Cr 27',
    calc: (b, v) => ({ kwh: b.annualKwh * v.pct / 100, steps: [`${f0(b.annualKwh)} kWh/yr × ${v.pct}% = ${f0(b.annualKwh * v.pct / 100)} kWh/yr`, 'Benefit assumed to last 8 years without recommissioning.'] }) },
  { id: 'bms', cat: 'Design & process', name: 'BMS with smart energy and water metering',
    what: 'Building management system with sub-metering of HVAC, lighting, plug loads and water, and monthly performance review.',
    inputs: [{ key: 'pct', label: 'Saving from monitoring and control', unit: '% of building electricity', def: () => 5, step: 0.5, src: 'est' }],
    cost: { per: '₹/m² of GFA', qty: 'gfa', low: 250, typical: 450, high: 800, basis: 'full', src: ['est'] },
    life: 12, src: ['est'], credits: 'LEED EAc3 · IGBC EE · GRIHA Cr 28',
    calc: (b, v) => ({ kwh: b.annualKwh * v.pct / 100, steps: [`${f0(b.annualKwh)} kWh/yr × ${v.pct}% = ${f0(b.annualKwh * v.pct / 100)} kWh/yr`] }) },

  /* HVAC */
  { id: 'chiller', cat: 'HVAC', name: 'Chiller plant: BEE 2-star screw → 5-star centrifugal / magnetic-bearing',
    what: 'Higher-efficiency water-cooled chillers with ECSBC/Super ECSBC pumps and towers. Applies to the cooling load left after load-reduction measures.',
    inputs: [
      { key: 'tr', label: 'Plant capacity', unit: 'TR', def: (b) => b.coolingTR },
      { key: 'newEff', label: 'Proposed system efficiency', unit: 'kWh/TRh', def: () => 0.79, step: 0.01, src: 'beecool' },
      { key: 'dkw', label: 'Rated chiller power saved', unit: 'kW/TR', def: () => 0.10, step: 0.01, src: 'beecool' },
    ],
    cost: { per: '₹/TR (premium over 2-star screw)', qty: 'tr', low: 4000, typical: 8000, high: 14000, basis: 'incremental', src: ['chiller', 'est'] },
    life: 20, src: ['beecool'], credits: 'LEED EAc2 · IGBC EE · GRIHA Cr 7',
    calc: (b, v) => {
      const trh = v.tr * b.eflh;
      return { plant: v.newEff, kva: v.tr * v.dkw / 0.95,
        steps: [`Cooling delivered ${f0(v.tr)} TR × ${f0(b.eflh)} EFLH = ${f0(trh)} TRh/yr`,
          `Saving ${f0(trh)} × (${b.baseKwhTRh} − ${v.newEff}) = ${f0(trh * (b.baseKwhTRh - v.newEff))} kWh/yr (stand-alone)`,
          `Demand ${f0(v.tr)} TR × ${v.dkw} kW/TR ÷ 0.95 pf = ${f0(v.tr * v.dkw / 0.95)} kVA`] };
    } },
  { id: 'vrf', cat: 'HVAC', name: 'Packaged / ducted DX → VRF',
    what: 'Replace packaged or ducted split units with an inverter VRF system for the same zones.',
    inputs: [{ key: 'tr', label: 'DX capacity replaced', unit: 'TR', def: () => 0 }, { key: 'base', label: 'DX efficiency', unit: 'kWh/TRh', def: () => 1.269, step: 0.01, src: 'beecool' }, { key: 'eff', label: 'VRF efficiency', unit: 'kWh/TRh', def: () => 0.658, step: 0.01, src: 'beecool' }],
    cost: { per: '₹/TR (premium over DX)', qty: 'tr', low: 10000, typical: 20000, high: 35000, basis: 'incremental', src: ['est'] },
    life: 15, src: ['beecool'], credits: 'LEED EAc2 · IGBC EE · GRIHA Cr 7',
    calc: (b, v) => ({ kwh: v.tr * b.eflh * (v.base - v.eff), steps: [`${f0(v.tr)} TR × ${f0(b.eflh)} h × (${v.base} − ${v.eff}) = ${f0(v.tr * b.eflh * (v.base - v.eff))} kWh/yr`, 'Enter the DX tonnage being replaced (0 = not used).'] }) },
  { id: 'rac', cat: 'HVAC', name: 'Split ACs: BEE 3-star → 5-star inverter',
    what: 'Higher-ISEER room and split air conditioners.',
    inputs: [{ key: 'tr', label: 'Split AC capacity', unit: 'TR', def: () => 0 }, { key: 'base', label: '3-star efficiency', unit: 'kWh/TRh', def: () => 0.886, step: 0.01, src: 'beecool' }, { key: 'eff', label: '5-star efficiency', unit: 'kWh/TRh', def: () => 0.709, step: 0.01, src: 'est' }],
    cost: { per: '₹/TR (premium over 3-star)', qty: 'tr', low: 3000, typical: 6000, high: 9000, basis: 'incremental', src: ['est'] },
    life: 10, src: ['beecool', 'est'], credits: 'LEED EAc2 · IGBC EE · GRIHA Cr 7',
    calc: (b, v) => ({ kwh: v.tr * b.eflh * (v.base - v.eff), steps: [`${f0(v.tr)} TR × ${f0(b.eflh)} h × (${v.base} − ${v.eff}) = ${f0(v.tr * b.eflh * (v.base - v.eff))} kWh/yr`, '5-star at ISEER 5.0 vs 3-star at 4.0: 0.886 × 4.0 / 5.0 = 0.709 kWh/TRh.'] }) },
  { id: 'vfd', cat: 'HVAC', name: 'VFDs on AHU fans and chilled/condenser water pumps',
    what: 'Variable-speed drives with static-pressure and ΔP reset; savings follow the fan and pump affinity laws.',
    inputs: [{ key: 'kw', label: 'Motor power controlled', unit: 'kW', def: (b) => Math.round(b.coolingTR * 0.37), src: 'beecool' }, { key: 'lf', label: 'Average load factor', unit: '%', def: () => 80, src: 'est' }, { key: 'pct', label: 'Energy saved', unit: '%', def: () => 30, src: 'est' }],
    cost: { per: '₹/kW installed with panel', qty: 'kw', low: 1500, typical: 4000, high: 6800, basis: 'full', src: ['vfd'] },
    life: 12, src: ['beecool', 'est'], credits: 'LEED EAc2 · IGBC EE · GRIHA Cr 7',
    calc: (b, v) => { const k = v.kw * v.lf / 100 * b.eflh * 1.2 * v.pct / 100; return { kwh: k, steps: [`Default motor kW = TR × 0.37 (AHU 0.25 + pumps 0.12 kW/TR, BEE/GIZ 2025)`, `${f0(v.kw)} kW × ${v.lf}% × ${f0(b.eflh * 1.2)} h × ${v.pct}% = ${f0(k)} kWh/yr`] }; } },
  { id: 'hrw', cat: 'HVAC', name: 'Heat recovery wheel on fresh air',
    what: 'Enthalpy wheel pre-cools and dehumidifies outdoor air with exhaust air.',
    inputs: [{ key: 'ls', label: 'Fresh air', unit: 'L/s', def: (b) => b.occupants * 8.5, src: 'est' }, { key: 'dh', label: 'Average enthalpy difference', unit: 'kJ/kg', def: () => 18, src: 'est' }, { key: 'eff', label: 'Wheel effectiveness', unit: '%', def: () => 70, src: 'est' }],
    cost: { per: '₹ per L/s', qty: 'ls', low: 150, typical: 300, high: 500, basis: 'full', src: ['est'] },
    life: 15, src: ['est'], credits: 'LEED EAc2 / EQ · IGBC EE · GRIHA Cr 7/12',
    calc: (b, v) => {
      const kwhTh = 1.2 * v.ls / 1000 * v.dh * v.eff / 100 * b.eflh;
      const fan = v.ls / 1000 * 200 / 0.6 * b.eflh / 1000;
      return { trh: kwhTh / kWhPerTRh, kwh: -fan, steps: [`Heat recovered 1.2 kg/m³ × ${f0(v.ls)} L/s × ${v.dh} kJ/kg × ${v.eff}% × ${f0(b.eflh)} h = ${f0(kwhTh)} kWh(th) = ${f0(kwhTh / kWhPerTRh)} TRh`, `Extra fan energy for 200 Pa at 60% = ${f0(fan)} kWh/yr`] };
    } },

  /* Lighting */
  { id: 'led', cat: 'Lighting', name: 'LED lighting designed below ECBC LPD',
    what: 'LED luminaires and layout to reach a lower lighting power density than the ECBC 2017 limit.',
    inputs: [{ key: 'area', label: 'Lit area', unit: 'm²', def: (b) => b.gfa }, { key: 'base', label: 'Baseline LPD', unit: 'W/m²', def: () => 9.5, step: 0.1, src: 'ecbc' }, { key: 'lpd', label: 'Proposed LPD', unit: 'W/m²', def: () => 6.0, step: 0.1 }],
    cost: { per: '₹/m² (premium)', qty: 'area', low: 100, typical: 250, high: 450, basis: 'incremental', src: ['eesl', 'est'] },
    life: 15, src: ['ecbc'], credits: 'LEED EAc2 · IGBC EE · GRIHA Cr 7', defaultOn: true,
    calc: (b, v) => { const k = v.area * (v.base - v.lpd) * b.lightHours / 1000; return { kwh: k, trh: k * COOL_FRAC / kWhPerTRh, steps: [`${f0(v.area)} m² × (${v.base} − ${v.lpd}) W/m² × ${f0(b.lightHours)} h = ${f0(k)} kWh/yr`, `Less heat to cool: ${f0(k)} × ${COOL_FRAC} ÷ 3.517 = ${f0(k * COOL_FRAC / kWhPerTRh)} TRh/yr`] }; } },
  { id: 'ctrl', cat: 'Lighting', name: 'Occupancy and daylight-linked lighting controls',
    what: 'Occupancy/vacancy sensors in enclosed rooms and daylight dimming in perimeter zones, commissioned.',
    inputs: [{ key: 'area', label: 'Controlled area', unit: 'm²', def: (b) => b.gfa * 0.7 }, { key: 'lpd', label: 'LPD controlled', unit: 'W/m²', def: () => 6.0, step: 0.1 }, { key: 'pct', label: 'Lighting energy saved', unit: '%', def: () => 25, src: 'lbnl' }],
    cost: { per: '₹/m² controlled', qty: 'area', low: 120, typical: 250, high: 400, basis: 'full', src: ['est'] },
    life: 12, src: ['lbnl'], credits: 'LEED EAc2 / EQ · IGBC EE · GRIHA Cr 7/10', defaultOn: true,
    calc: (b, v) => { const k = v.area * v.lpd * b.lightHours / 1000 * v.pct / 100; return { kwh: k, trh: k * COOL_FRAC / kWhPerTRh, steps: [`${f0(v.area)} m² × ${v.lpd} W/m² × ${f0(b.lightHours)} h × ${v.pct}% = ${f0(k)} kWh/yr`, `Less heat to cool: ${f0(k * COOL_FRAC / kWhPerTRh)} TRh/yr`] }; } },

  /* Envelope */
  { id: 'coolroof', cat: 'Envelope', name: 'Cool roof (high-SRI coating)',
    what: 'Solar-reflective coating (SRI ≥ 78) on exposed roof; reduces heat gain to the top floor.',
    inputs: [{ key: 'area', label: 'Roof area', unit: 'm²', def: (b) => b.roofArea }, { key: 'q', label: 'Heat gain avoided', unit: 'kWh(th)/m²·yr', def: () => 25, src: 'est' }],
    cost: { per: '₹/m²', qty: 'area', low: 200, typical: 300, high: 400, basis: 'full', src: ['coolroof'] },
    life: 10, src: ['est'], credits: 'LEED SSc5 · IGBC SS heat island · GRIHA Cr 3', defaultOn: true,
    calc: (_b, v) => ({ trh: v.area * v.q / kWhPerTRh, steps: [`${f0(v.area)} m² × ${v.q} kWh(th)/m² = ${f0(v.area * v.q)} kWh(th) = ${f0(v.area * v.q / kWhPerTRh)} TRh/yr`, 'Take the heat-gain value from a DesignBuilder run with roof SRI changed.'] }) },
  { id: 'roofins', cat: 'Envelope', name: 'Roof insulation to ECBC (50 mm XPS)',
    what: 'XPS insulation over an RCC roof slab to reach U ≤ 0.33 W/m²K.',
    inputs: [{ key: 'area', label: 'Roof area', unit: 'm²', def: (b) => b.roofArea }, { key: 'u0', label: 'U uninsulated', unit: 'W/m²K', def: () => 2.0, step: 0.01, src: 'est' }, { key: 'u1', label: 'U insulated', unit: 'W/m²K', def: () => 0.33, step: 0.01, src: 'ecbc' }, { key: 'cdh', label: 'Sol-air cooling degree-hours', unit: 'K·h/yr', def: () => 35000, src: 'est' }],
    cost: { per: '₹/m² installed', qty: 'area', low: 430, typical: 550, high: 750, basis: 'full', src: ['xps'] },
    life: 30, src: ['ecbc', 'est'], credits: 'LEED EAc2 · IGBC EE · GRIHA Cr 7',
    calc: (_b, v) => { const q = v.area * (v.u0 - v.u1) * v.cdh / 1000; return { trh: q / kWhPerTRh, steps: [`${f0(v.area)} m² × (${v.u0} − ${v.u1}) W/m²K × ${f0(v.cdh)} K·h ÷ 1000 = ${f0(q)} kWh(th) = ${f0(q / kWhPerTRh)} TRh/yr`, 'Use sol-air degree-hours from the project weather file.'] }; } },
  { id: 'glazing', cat: 'Envelope', name: 'Double-glazed low-e units instead of single clear glass',
    what: 'DGU with low-e coating (SHGC ≈ 0.25, U ≈ 1.8) replacing single clear glass (SHGC ≈ 0.80, U ≈ 5.8).',
    inputs: [{ key: 'area', label: 'Glazing area', unit: 'm²', def: (b) => Math.round(b.gfa * 0.15) }, { key: 'dshgc', label: 'SHGC reduction', unit: '', def: () => 0.55, step: 0.01, src: 'est' }, { key: 'irr', label: 'Solar on glazing, cooling hours', unit: 'kWh/m²·yr', def: () => 450, src: 'est' }, { key: 'du', label: 'U-value reduction', unit: 'W/m²K', def: () => 4.0, step: 0.1, src: 'est' }, { key: 'cdh', label: 'Cooling degree-hours', unit: 'K·h/yr', def: () => 20000, src: 'est' }],
    cost: { per: '₹/m² (premium over single glazing)', qty: 'area', low: 2500, typical: 6500, high: 9500, basis: 'incremental', src: ['glazing'] },
    life: 25, src: ['est'], credits: 'LEED EAc2 · IGBC EE · GRIHA Cr 7/10',
    calc: (_b, v) => { const q = v.area * (v.dshgc * v.irr + v.du * v.cdh / 1000); return { trh: q / kWhPerTRh, steps: [`Solar: ${f0(v.area)} m² × ${v.dshgc} × ${v.irr} = ${f0(v.area * v.dshgc * v.irr)} kWh(th)`, `Conduction: ${f0(v.area)} × ${v.du} × ${f0(v.cdh)} ÷ 1000 = ${f0(v.area * v.du * v.cdh / 1000)} kWh(th)`, `Total ${f0(q)} kWh(th) = ${f0(q / kWhPerTRh)} TRh/yr`] }; } },

  /* Renewables */
  { id: 'pv', cat: 'Renewables', name: 'Rooftop solar PV',
    what: 'Grid-connected rooftop PV under net/gross metering, self-consumed on site.',
    inputs: [{ key: 'kwp', label: 'Capacity', unit: 'kWp', def: (b) => Math.round(b.roofArea * 0.6 / 6.5) }, { key: 'yield', label: 'Specific yield', unit: 'kWh/kWp·yr', def: () => 1400, src: 'est' }, { key: 'om', label: 'O&M', unit: '₹/kWp·yr', def: () => 500, src: 'est' }],
    cost: { per: '₹/kWp installed (C&I EPC)', qty: 'kwp', low: 38000, typical: 45000, high: 52000, basis: 'full', src: ['cisolar', 'mnre'] },
    life: 25, src: ['est'], credits: 'LEED EAc5 · IGBC EE · GRIHA Cr 8', defaultOn: true,
    calc: (_b, v) => ({ kwh: v.kwp * v.yield, om: v.kwp * v.om, degrade: 0.5,
      steps: [`Default capacity: 60% of roof at 6.5 m²/kWp`, `${f0(v.kwp)} kWp × ${f0(v.yield)} kWh/kWp = ${f0(v.kwp * v.yield)} kWh/yr in year 1, falling 0.5%/yr`, 'Check the yield with PVsyst or PVWatts for the site.'] }) },
  { id: 'swh', cat: 'Renewables', name: 'Solar water heating (replacing electric heaters)',
    what: 'Evacuated-tube solar water heaters with electric backup.',
    inputs: [{ key: 'lpd', label: 'Hot water demand', unit: 'litres/day', def: (b) => (b.use === '24h' ? Math.round(b.gfa / 10) : 0) }, { key: 'sf', label: 'Solar fraction', unit: '%', def: () => 70, src: 'est' }, { key: 'dt', label: 'Temperature rise', unit: 'K', def: () => 35, src: 'est' }],
    cost: { per: '₹ per litre/day', qty: 'lpd', low: 125, typical: 200, high: 300, basis: 'full', src: ['est'] },
    life: 15, src: ['est'], credits: 'LEED EAc5 · IGBC EE · GRIHA Cr 8',
    calc: (_b, v) => { const k = v.lpd * 365 * v.dt * 4.186 / 3600 * v.sf / 100 / 0.95; return { kwh: k, steps: [`${f0(v.lpd)} L/day × 365 × ${v.dt} K × 4.186 kJ/kg·K ÷ 3600 × ${v.sf}% ÷ 0.95 heater efficiency = ${f0(k)} kWh/yr`] }; } },

  /* Water */
  { id: 'fixtures', cat: 'Water', name: 'Low-flow fixtures (aerators, sensor taps, dual flush)',
    what: 'Flow fixtures below the IGBC/GRIHA baseline flow rates.',
    inputs: [{ key: 'occ', label: 'Occupants', unit: 'people', def: (b) => b.occupants }, { key: 'lpcd', label: 'Water saved per person', unit: 'litres/day', def: () => 10, src: 'est' }, { key: 'n', label: 'Fixtures fitted', unit: 'nos', def: (b) => Math.round(b.occupants / 8) }],
    cost: { per: '₹ per fixture (premium)', qty: 'n', low: 300, typical: 1500, high: 4000, basis: 'incremental', src: ['fixtures'] },
    life: 10, src: ['est'], credits: 'LEED WEc2 · IGBC WE · GRIHA Cr 13', defaultOn: true,
    calc: (b, v) => { const kl = v.occ * v.lpcd * b.workDays / 1000; return { kl, kwh: kl * 0.4, steps: [`${f0(v.occ)} × ${v.lpcd} L × ${b.workDays} days = ${f0(kl)} kL/yr`, `Pumping saved ${f0(kl)} kL × 0.4 kWh/kL = ${f0(kl * 0.4)} kWh/yr (estimate)`] }; } },
  { id: 'stp', cat: 'Water', name: 'On-site STP with treated-water reuse',
    what: 'MBBR/SBR plant with tertiary treatment; treated water reused for flushing, landscape and cooling tower make-up. Often mandatory: then count only the reuse piping as incremental.',
    inputs: [{ key: 'kld', label: 'Capacity', unit: 'KLD', def: (b) => Math.round(b.occupants * 45 / 1000 * 0.85) }, { key: 'reuse', label: 'Share reused', unit: '%', def: () => 60, src: 'est' }, { key: 'opex', label: 'Running cost', unit: '₹/kL treated', def: () => 20, src: 'stp' }],
    cost: { per: '₹/KLD', qty: 'kld', low: 30000, typical: 45000, high: 60000, basis: 'full', src: ['stp'] },
    life: 15, src: ['stp'], credits: 'LEED WEc2 · IGBC WE · GRIHA Cr 14',
    calc: (b, v) => { const treated = v.kld * b.workDays; const kl = treated * v.reuse / 100; return { kl, om: treated * v.opex, kwh: -treated * 1.0, steps: [`${f0(v.kld)} KLD × ${b.workDays} days = ${f0(treated)} kL treated; ${v.reuse}% reused = ${f0(kl)} kL/yr`, `Running cost ${f0(treated)} × ₹${v.opex} = ₹${f0(treated * v.opex)}/yr; power 1.0 kWh/KLD = ${f0(treated)} kWh/yr`] }; } },
  { id: 'rwh', cat: 'Water', name: 'Rainwater harvesting storage for reuse',
    what: 'Roof run-off collected, filtered and stored for non-potable use.',
    inputs: [{ key: 'area', label: 'Catchment', unit: 'm²', def: (b) => b.roofArea }, { key: 'rain', label: 'Annual rainfall', unit: 'mm', def: () => 800, src: 'est' }, { key: 'cap', label: 'Share captured and used', unit: '%', def: () => 50, src: 'est' }, { key: 'vol', label: 'Storage', unit: 'm³', def: (b) => Math.round(b.roofArea * 0.02) }],
    cost: { per: '₹/m³ of storage', qty: 'vol', low: 6000, typical: 9000, high: 14000, basis: 'full', src: ['est'] },
    life: 25, src: ['est'], credits: 'LEED SSc4 / WE · IGBC SS/WE · GRIHA Cr 15',
    calc: (_b, v) => { const kl = v.area * v.rain / 1000 * 0.85 * v.cap / 100; return { kl, steps: [`${f0(v.area)} m² × ${v.rain} mm × 0.85 run-off × ${v.cap}% = ${f0(kl)} kL/yr`, 'Use the IMD normal rainfall for the city.'] }; } },

  /* Materials (embodied carbon; one-time) */
  { id: 'aac', cat: 'Materials', name: 'AAC blocks instead of fired clay bricks',
    what: 'Autoclaved aerated concrete blocks for walls. Lighter walls can also reduce structure; thermal benefit not counted here.',
    inputs: [{ key: 'vol', label: 'Masonry volume', unit: 'm³', def: (b) => Math.round(b.gfa * 0.12) }, { key: 'dc', label: 'Embodied carbon saved', unit: 'kgCO₂e/m³', def: () => 250, src: 'est' }],
    cost: { per: '₹/m³ (difference vs clay brick)', qty: 'vol', low: -1500, typical: -500, high: 500, basis: 'incremental', src: ['est'] },
    life: 60, src: ['est'], credits: 'LEED MRc1/MRc2 · IGBC MR · GRIHA Cr 19/21',
    calc: (_b, v) => ({ embodiedT: v.vol * v.dc / 1000, steps: [`${f0(v.vol)} m³ × ${v.dc} kgCO₂e/m³ = ${f0(v.vol * v.dc / 1000)} tCO₂e saved once`, 'Clay brick ≈ 0.22 kgCO₂e/kg × 1,900 kg/m³ ≈ 420; AAC ≈ 170 kgCO₂e/m³ (ICE-based estimates; use EPDs).'] }) },
  { id: 'scm', cat: 'Materials', name: 'Fly ash / GGBS blended cement (PPC/PSC) instead of OPC',
    what: 'Replace part of the OPC in concrete with fly ash or GGBS.',
    inputs: [{ key: 'vol', label: 'Concrete volume', unit: 'm³', def: (b) => Math.round(b.gfa * 0.4) }, { key: 'cem', label: 'Cement content', unit: 'kg/m³', def: () => 350, src: 'est' }, { key: 'rep', label: 'Replacement', unit: '%', def: () => 30, src: 'est' }],
    cost: { per: '₹/m³ of concrete (difference)', qty: 'vol', low: -280, typical: -175, high: 0, basis: 'incremental', src: ['cement'] },
    life: 60, src: ['est'], credits: 'LEED MRc1 · IGBC MR · GRIHA Cr 19',
    calc: (_b, v) => { const t = v.vol * v.cem * v.rep / 100 * 0.8 / 1000; return { embodiedT: t, steps: [`${f0(v.vol)} m³ × ${v.cem} kg × ${v.rep}% replaced × 0.8 kgCO₂e/kg avoided = ${f0(t)} tCO₂e saved once`, 'Cost: PPC/PSC ₹20–40 per bag below OPC → ₹140–280 per m³ at 350 kg/m³.'] }; } },
  { id: 'steel', cat: 'Materials', name: 'Recycled-content (EAF) reinforcement steel',
    what: 'Rebar from electric-arc-furnace mills with high scrap content.',
    inputs: [{ key: 't', label: 'Steel', unit: 'tonnes', def: (b) => Math.round(b.gfa * 0.04) }, { key: 'dc', label: 'Embodied carbon saved', unit: 'tCO₂e/t', def: () => 1.0, step: 0.1, src: 'est' }],
    cost: { per: '₹/t (premium)', qty: 't', low: 0, typical: 1000, high: 3000, basis: 'incremental', src: ['est'] },
    life: 60, src: ['est'], credits: 'LEED MRc1/MRc3 · IGBC MR · GRIHA Cr 19/21',
    calc: (_b, v) => ({ embodiedT: v.t * v.dc, steps: [`${f0(v.t)} t × ${v.dc} tCO₂e/t = ${f0(v.t * v.dc)} tCO₂e saved once`, 'Use the mill EPDs: BF-BOF rebar is typically 2–2.5 tCO₂e/t, EAF 0.5–1.5.'] }) },
];

export const sourceById = (id: string) => CBA_SOURCES.find((s) => s.id === id);

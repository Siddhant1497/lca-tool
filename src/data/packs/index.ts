/**
 * Official emission-factor packs. Every value below was read from the publisher's own document
 * (not typed from memory) and carries its edition and table/row reference. Packs are opt-in:
 * nothing enters a calculation until the user picks rows and imports them.
 */
import type { Candidate } from '../../utils/factorImport';

export interface OfficialPack {
  id: string; sourceId: string; title: string; publisher: string; edition: string; published: string;
  url: string; licence?: string; note: string; count: string;
  load: () => Promise<Candidate[]>;
}

/* ── CEA CO₂ Baseline Database v22.0 (Aug 2026), Annexure-I ──────────────────────────
   "Weighted Average Emission Factor (Considering Renewable Energy Generation) of Indian Grid", tCO₂/MWh.
   tCO₂/MWh = kgCO₂/kWh. From FY 2022-23 the series is adjusted for cross-border transfers and includes
   grid-connected captive injection (Annexure-I footnote). v22.0 revised FY 2024-25 using final captive data. */
export const CEA_V22: [string, number][] = [
  ['2013-14', 0.774], ['2014-15', 0.779], ['2015-16', 0.774], ['2016-17', 0.770], ['2017-18', 0.754],
  ['2018-19', 0.744], ['2019-20', 0.713], ['2020-21', 0.703], ['2021-22', 0.715], ['2022-23', 0.716],
  ['2023-24', 0.727], ['2024-25', 0.710], ['2025-26', 0.675],
];
const CEA_URL = 'https://cea.nic.in/api/cdm-report-version/view-pdf/en/82';

/* ── GHG Protocol "IPCC Global Warming Potential Values", v2.0 (7 Aug 2024), 100-year GWPs ── */
export const GWP: Record<string, { ar5: number | null; ar6: number }> = {
  'CO2': { ar5: 1, ar6: 1 },
  'CH4 (fossil)': { ar5: 30, ar6: 29.8 },
  'CH4 (non-fossil)': { ar5: 28, ar6: 27.0 },
  'N2O': { ar5: 265, ar6: 273 },
  'NF3': { ar5: 16100, ar6: 17400 },
  'SF6': { ar5: 23500, ar6: 24300 },
  'HFC-23': { ar5: 12400, ar6: 14600 },
  'HFC-32': { ar5: 677, ar6: 771 },
  'HFC-125': { ar5: 3170, ar6: 3740 },
  'HFC-134a': { ar5: 1300, ar6: 1530 },
  'HFC-143a': { ar5: 4800, ar6: 5810 },
  'HFC-152a': { ar5: 138, ar6: 164 },
  'HFC-227ea': { ar5: 3350, ar6: 3600 },
  'HFC-245fa': { ar5: 858, ar6: 962 },
  'HFO-1234yf': { ar5: null, ar6: 0.501 },   // AR5 lists "<1"
  'HFO-1234ze(E)': { ar5: null, ar6: 1.37 },  // AR5 lists "<1"
};
/** Zeotropic blends by mass fraction (ASHRAE Standard 34). AR5 results reproduce UK DESNZ 2025 values (1924 / 3943 / 1624). */
export const BLENDS: Record<string, [string, number][]> = {
  'R-410A': [['HFC-32', 0.5], ['HFC-125', 0.5]],
  'R-404A': [['HFC-125', 0.44], ['HFC-143a', 0.52], ['HFC-134a', 0.04]],
  'R-407C': [['HFC-32', 0.23], ['HFC-125', 0.25], ['HFC-134a', 0.52]],
};
export const blendGwp = (b: string, ar: 'ar5' | 'ar6') => {
  let t = 0;
  for (const [g, w] of BLENDS[b]) { const v = GWP[g][ar]; if (v == null) return null; t += v * w; }
  return Math.round(t * 10) / 10;
};
const GWP_URL = 'https://ghgprotocol.org/sites/default/files/2024-08/Global-Warming-Potential-Values%20%28August%202024%29.pdf';
const REFRIG: Record<string, string> = { 'HFC-32': 'R-32', 'HFC-125': 'R-125', 'HFC-134a': 'R-134a', 'HFC-143a': 'R-143a', 'HFC-152a': 'R-152a', 'HFC-227ea': 'R-227ea (FM-200)', 'HFC-245fa': 'R-245fa', 'HFO-1234yf': 'R-1234yf', 'HFO-1234ze(E)': 'R-1234ze(E)', 'HFC-23': 'R-23', 'CO2': 'R-744 (CO₂)' };

const gwpPack = (ar: 'ar5' | 'ar6'): Candidate[] => {
  const out: Candidate[] = [];
  for (const [b] of Object.entries(BLENDS)) {
    const v = blendGwp(b, ar); if (v == null) continue;
    out.push({ key: `${ar}-${b}`, name: `Fugitive refrigerant – ${b} (blend, ${ar.toUpperCase()})`, unit: 'kg released', kgPerUnit: v, scope: 1, ref: `Mass-weighted: ${BLENDS[b].map(([g, w]) => `${w * 100}% ${g}`).join(' + ')}` });
  }
  for (const [g, v] of Object.entries(GWP)) {
    if (v[ar] == null) continue;
    const label = REFRIG[g] ? `Fugitive refrigerant – ${REFRIG[g]} / ${g}` : `Gas release – ${g}`;
    out.push({ key: `${ar}-${g}`, name: `${label} (${ar.toUpperCase()})`, unit: 'kg released', kgPerUnit: v[ar] as number, scope: 1, ref: `GWP table, ${g}` });
  }
  return out;
};

type Row = [string, number, string, string, number, number | null];
const desnz = (rows: Row[]): Candidate[] => rows.map(([id, scope, name, unit, v, cat]) => ({
  key: id, name, unit, kgPerUnit: v, scope: (scope === 1 || scope === 2 ? scope : 3) as 1 | 2 | 3, ref: `ID ${id}`, gasUnit: 'kg CO2e', s3cat: cat ?? undefined,
}));

export const PACKS: OfficialPack[] = [
  { id: 'cea-v22', sourceId: 'cea', title: 'India grid electricity, FY 2013-14 to 2025-26', publisher: 'Central Electricity Authority, Govt. of India',
    edition: 'CO₂ Baseline Database v22.0', published: 'August 2026', url: CEA_URL, count: `${CEA_V22.length} years`,
    note: 'All-India weighted average emission factor including renewables (Annexure-I). Use for Scope 2 location-based: pick the factor for the fiscal year of the electricity bills, and re-import when CEA publishes a new version (later versions can revise earlier years).',
    load: async () => CEA_V22.map(([fy, v]) => ({ key: `cea-${fy}`, name: `Grid electricity – India, FY ${fy} (weighted average incl. RE)`, unit: 'kWh', kgPerUnit: v, scope: 2 as const, ref: `Annexure-I, FY ${fy}` })) },
  { id: 'gwp-ar6', sourceId: 'ghgp-gwp', title: 'Refrigerant & gas GWPs – IPCC AR6', publisher: 'GHG Protocol (WRI/WBCSD)', edition: 'GWP Values v2.0 (AR6)', published: '7 Aug 2024',
    url: GWP_URL, count: 'gases + blends', note: 'Fugitive Scope 1: kg of refrigerant topped up (≈ leaked) × GWP. AR6 is the GHG Protocol recommendation; use one AR edition across the whole inventory.', load: async () => gwpPack('ar6') },
  { id: 'gwp-ar5', sourceId: 'ghgp-gwp', title: 'Refrigerant & gas GWPs – IPCC AR5', publisher: 'GHG Protocol (WRI/WBCSD)', edition: 'GWP Values v2.0 (AR5)', published: '7 Aug 2024',
    url: GWP_URL, count: 'gases + blends', note: 'For inventories or programmes still on AR5 (e.g. matching a prior-year base). Do not mix with AR6.', load: async () => gwpPack('ar5') },
  { id: 'desnz-2026', sourceId: 'desnz', title: 'UK conversion factors 2026 – all kg CO₂e rows', publisher: 'UK Dept. for Energy Security & Net Zero', edition: 'GHG conversion factors 2026 (flat file, revised)', published: 'June 2026',
    url: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2026', licence: 'Contains public sector information licensed under the Open Government Licence v3.0.', count: '2,622 factors',
    note: 'Fuels, refrigerants, business travel (flights, hotel stays by country), freight, WTT, waste, water, material use. UK electricity rows apply to UK grids only.',
    load: async () => desnz((await import('./desnz2026.json')).default as Row[]) },
  { id: 'desnz-2025', sourceId: 'desnz', title: 'UK conversion factors 2025 – all kg CO₂e rows', publisher: 'UK Dept. for Energy Security & Net Zero', edition: 'GHG conversion factors 2025 (flat file)', published: 'June 2025',
    url: 'https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025', licence: 'Contains public sector information licensed under the Open Government Licence v3.0.', count: '2,616 factors',
    note: 'Use for reporting periods that the 2025 set covers. Same coverage as 2026.',
    load: async () => desnz((await import('./desnz2025.json')).default as Row[]) },
];

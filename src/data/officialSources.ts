/**
 * Official emission-factor publishers. This is a catalogue of where to get factors and how to read them.
 * It deliberately contains NO factor values: values are imported from the file you download, so the
 * edition and row reference travel with every number.
 */
export interface OfficialSource {
  id: string; publisher: string; dataset: string; region: string; covers: string; url: string;
  file: string; howTo: string; cadence: string; mode: 'desnz' | 'generic' | 'manual';
}

export const OFFICIAL_SOURCES: OfficialSource[] = [
  { id: 'cea', publisher: 'Central Electricity Authority (Govt. of India)', dataset: 'CO₂ Baseline Database for the Indian Power Sector',
    region: 'India', covers: 'Scope 2 location-based grid electricity', url: 'https://cea.nic.in',
    file: 'User Guide PDF (and Excel database) for the latest version', cadence: 'Annual; later versions can revise earlier years',
    howTo: 'Bundled as a ready-to-use pack above (v22.0). For newer versions: for corporate Scope 2 (location-based) use the all-India weighted average emission rate (tCO₂/MWh) for your fiscal year, not the combined/operating margin used for CDM projects. tCO₂/MWh equals kgCO₂/kWh. Record the version number.',
    mode: 'manual' },
  { id: 'desnz', publisher: 'UK Dept. for Energy Security & Net Zero (formerly Defra/BEIS)', dataset: 'Greenhouse gas reporting: conversion factors',
    region: 'UK · widely used internationally for Scope 3', covers: 'Fuels, refrigerants, business travel, freight, hotel stays, waste, material use, WTT',
    url: 'https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting',
    file: '"Flat file" (.xlsx or .csv) for the year matching your reporting period', cadence: 'Annual (June)',
    howTo: '2025 and 2026 sets are bundled above. For other years, import the flat file directly; SustainHub recognises its columns. Keep the "kg CO2e" rows unless you report gas by gas. UK electricity factors apply to UK grids only.',
    mode: 'desnz' },
  { id: 'epa', publisher: 'US Environmental Protection Agency', dataset: 'GHG Emission Factors Hub',
    region: 'USA', covers: 'Stationary & mobile combustion, eGRID electricity, Scope 3 transport, travel, waste',
    url: 'https://www.epa.gov/climateleadership/ghg-emission-factors-hub', file: 'Emission Factors Hub (.xlsx)', cadence: 'Annual',
    howTo: 'Open the table you need, then map the name, unit and factor columns. Factors are often split by gas (kg CO₂, g CH₄, g N₂O) — combine with GWPs or use the CO₂e column where given.',
    mode: 'generic' },
  { id: 'ipcc', publisher: 'IPCC Task Force on National GHG Inventories', dataset: '2006 IPCC Guidelines (Vol. 2 Energy) & Emission Factor Database (EFDB)',
    region: 'Global default', covers: 'Default fuel CO₂/CH₄/N₂O factors and net calorific values', url: 'https://www.ipcc-nggip.iges.or.jp/EFDB/',
    file: 'EFDB export or Vol. 2 Ch. 1–2 tables', cadence: 'Fixed defaults (2019 Refinement updates some)',
    howTo: 'Defaults are per TJ of energy. Convert using the fuel net calorific value (TJ/Gg) to get a factor per kg or per litre, and cite the table number.',
    mode: 'generic' },
  { id: 'ghgp-gwp', publisher: 'GHG Protocol (WRI / WBCSD)', dataset: 'Global Warming Potential values (IPCC AR4 / AR5 / AR6)',
    region: 'Global', covers: 'Refrigerant and other gas GWPs for fugitive Scope 1', url: 'https://ghgprotocol.org',
    file: 'Global Warming Potential Values PDF', cadence: 'Updated with IPCC assessment reports',
    howTo: 'AR5 and AR6 values (v2.0, Aug 2024) are bundled above. Fugitive refrigerant factor = GWP (kgCO₂e per kg gas). Use the same AR edition across the whole inventory and state it. Blends (e.g. R-410A) = mass-weighted GWP of components.',
    mode: 'manual' },
];

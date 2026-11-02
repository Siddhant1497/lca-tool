import type { HubState } from '../types/hub';

/**
 * ILLUSTRATIVE SAMPLE DATA – fictional organisation and projects.
 * Not real measurements. Score thresholds are placeholders: always take
 * thresholds from the current rating-system guide before using them.
 */
export const SAMPLE: Omit<HubState, 'loaded' | 'isSample'> = {
  settings: { targetYear: 2030, annualPct: 4.2, s2Method: 'location', revenueUnit: '₹ crore', currency: '₹', orgName: 'Sample Realty Ltd (fictional)', modules: { certs: true, lca: true }, s3Pct: 2.5, netZeroYear: 2050, nzPct: 90 },
  factors: [], activities: [], docs: [],
  ghg: [
    { year: 2019, scope1: 1850, scope2: 4200, scope3: 21500,
      denom: { area: 42000, fte: 2100, revenue: 820 } },
    { year: 2020, scope1: 1700, scope2: 3800, scope3: 19000,
      denom: { area: 42000, fte: 2050, revenue: 760 } },
    { year: 2021, scope1: 1780, scope2: 3900, scope3: 20400,
      denom: { area: 45000, fte: 2200, revenue: 880 } },
    { year: 2022, scope1: 1720, scope2: 3500, scope2m: 3100, scope3: 20900,
      denom: { area: 45000, fte: 2350, revenue: 990 } },
    { year: 2023, scope1: 1600, scope2: 3150, scope2m: 2600, scope3: 20100,
      denom: { area: 48000, fte: 2400, revenue: 1080 },
      s3cats: { 1: 10200, 2: 4600, 3: 1180, 4: 1400, 5: 280, 6: 590, 7: 1200, 12: 650 } },
    { year: 2024, scope1: 1520, scope2: 2700, scope2m: 2050, scope3: 19300,
      denom: { area: 48000, fte: 2450, revenue: 1150 },
      s3cats: { 1: 9800, 2: 4200, 3: 1100, 4: 1350, 5: 260, 6: 640, 7: 1250, 12: 700 } },
  ],
  levers: [
    { id: 'l1', name: 'Open-access solar PPA',        scope: 2, abatement: 520,  status: 'Planned', year: 2026, costPerT: -1800 },
    { id: 'l2', name: 'Heat-pump retrofit (boilers)', scope: 1, abatement: 180,  status: 'Planned', year: 2027, costPerT: 2400 },
    { id: 'l3', name: 'BMS tuning & retro-commissioning', scope: 2, abatement: 140, status: 'In progress', year: 2025, costPerT: -2600 },
    { id: 'l4', name: 'Fleet electrification',        scope: 1, abatement: 60,   status: 'Identified', year: 2028, costPerT: 5200 },
    { id: 'l5', name: 'LED + controls upgrade',       scope: 2, abatement: 90,   status: 'Implemented', year: 2023, costPerT: -3100 },
    { id: 'l6', name: 'Low-carbon concrete specification', scope: 3, abatement: 1200, status: 'Identified', year: 2026, costPerT: 900 },
  ],
  projects: [
    { id: 'p1', name: 'Sample HQ Campus', system: 'LEED', version: 'v4.1 BD+C', targetLabel: 'Gold', needed: 60,
      secured: 41, likely: 14, max: 110, unit: 'pts', stage: 'Construction', next: 'Close out EA energy model & commissioning plan',
      categories: [
        { name: 'Integrative Process', max: 1,  secured: 1, likely: 0 },
        { name: 'Location & Transport', max: 16, secured: 8, likely: 2 },
        { name: 'Sustainable Sites',   max: 10, secured: 5, likely: 1 },
        { name: 'Water Efficiency',    max: 11, secured: 6, likely: 1 },
        { name: 'Energy & Atmosphere', max: 33, secured: 10, likely: 5 },
        { name: 'Materials & Resources', max: 13, secured: 4, likely: 2 },
        { name: 'Indoor Env. Quality', max: 16, secured: 6, likely: 2 },
        { name: 'Innovation',          max: 6,  secured: 1, likely: 1 },
        { name: 'Regional Priority',   max: 4,  secured: 0, likely: 0 },
      ] },
    { id: 'p2', name: 'Sample Logistics Park', system: 'IGBC', version: 'Green New Buildings', targetLabel: 'Gold', needed: 60,
      secured: 52, likely: 10, max: 100, unit: 'pts', stage: 'Submitted', next: 'Respond to preliminary review comments' },
    { id: 'p3', name: 'Sample Residential Block', system: 'EDGE', version: 'Certified', targetLabel: 'Certified', needed: 20,
      secured: 24, likely: 0, max: 40, unit: '%', stage: 'Certified', next: 'Post-occupancy data for audit renewal' },
    { id: 'p4', name: 'Sample Office Fit-out', system: 'WELL', version: 'v2', targetLabel: 'Silver', needed: 50,
      secured: 31, likely: 9, max: 110, unit: 'pts', stage: 'Design', next: 'Confirm Air & Light preconditions with MEP' },
    { id: 'p5', name: 'Sample Retail Centre', system: 'Fitwel', version: 'Multitenant', targetLabel: '2-Star', needed: 105,
      secured: 96, likely: 14, max: 144, unit: 'pts', stage: 'Registered', next: 'Complete scorecard documentation' },
    { id: 'p6', name: 'Sample School', system: 'GRIHA', version: 'v2019', targetLabel: '3-Star', needed: 56,
      secured: 38, likely: 6, max: 100, unit: 'pts', stage: 'Design', next: 'Daylight & energy simulation results' },
  ],
};

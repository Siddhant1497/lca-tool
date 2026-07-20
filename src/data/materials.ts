import type { Material } from '../types/lca';

/**
 * EPD Material Database – values per kg of material (A1-A3) unless noted.
 * Sources: ICE Database v3.0 (Univ. of Bath), EN 15804 EPDs, ecoinvent 3.x,
 *          World Steel/European Aluminium/Glass for Europe EPDs.
 */
export const MATERIALS: Material[] = [

  // ── Concrete & Cement ─────────────────────────────────────────────────────
  {
    id: 'concrete_c25', name: 'Concrete C25/30 (Ready-mix)', category: 'concrete',
    unit: 'm3', density: 2400, serviceLife: 60, source: 'ICE Database v3.0',
    description: 'Standard structural concrete C25/30, unreinforced – value per m³',
    epd: {
      A1_A3: { GWP: 259, ODP: 3.4e-5, AP: 1.08, EP: 0.149, POCP: 0.120, ADP_fossil: 1992 },
      A4:    { GWP: 5.2, ODP: 5e-7, AP: 0.018, EP: 0.003, POCP: 0.004, ADP_fossil: 71 },
      C1_C4: { GWP: 3.6, ODP: 3e-7, AP: 0.012, EP: 0.002, POCP: 0.003, ADP_fossil: 43 },
      D:     { GWP: -4.1, ODP: -2e-7, AP: -0.015, EP: -0.002, POCP: -0.003, ADP_fossil: -35 },
    },
  },
  {
    id: 'concrete_c30', name: 'Concrete C30/37 (Ready-mix)', category: 'concrete',
    unit: 'm3', density: 2400, serviceLife: 60, source: 'ICE Database v3.0',
    description: 'Higher-strength structural concrete C30/37 – value per m³',
    epd: {
      A1_A3: { GWP: 281, ODP: 3.6e-5, AP: 1.15, EP: 0.156, POCP: 0.130, ADP_fossil: 2160 },
      A4:    { GWP: 5.2, ODP: 5e-7, AP: 0.018, EP: 0.003, POCP: 0.004, ADP_fossil: 71 },
    },
  },
  {
    id: 'cement_opc', name: 'Portland Cement (OPC)', category: 'concrete',
    unit: 'kg', serviceLife: 60, source: 'ICE Database v3.0',
    epd: { A1_A3: { GWP: 0.83, ODP: 1.2e-7, AP: 2.5e-3, EP: 1.8e-4, POCP: 3.9e-4, ADP_fossil: 5.73 } },
  },
  {
    id: 'concrete_block', name: 'Concrete Block (Masonry Unit)', category: 'masonry',
    unit: 'kg', density: 2000, serviceLife: 60, source: 'ICE Database v3.0',
    epd: { A1_A3: { GWP: 0.093, ODP: 1.3e-8, AP: 3.1e-4, EP: 4.6e-5, POCP: 4.2e-5, ADP_fossil: 0.71 } },
  },

  // ── Steel & Metals ────────────────────────────────────────────────────────
  {
    id: 'rebar_steel', name: 'Reinforcing Steel (Rebar)', category: 'steel',
    unit: 'kg', serviceLife: 60, source: 'ICE Database v3.0; World Steel EPD',
    description: 'Deformed steel bar – ~65% recycled content',
    epd: {
      A1_A3: { GWP: 1.46, ODP: 3.3e-7, AP: 5.1e-3, EP: 3.4e-4, POCP: 6.7e-4, ADP_fossil: 19.8 },
      A4:    { GWP: 0.04, ODP: 4e-9, AP: 1.3e-4, EP: 2.2e-5, POCP: 2.8e-5, ADP_fossil: 0.52 },
      D:     { GWP: -0.96, ODP: -2.1e-7, AP: -3.3e-3, EP: -2.2e-4, POCP: -4.4e-4, ADP_fossil: -12.9 },
    },
  },
  {
    id: 'steel_section_virgin', name: 'Structural Steel – Virgin (Hot-rolled)', category: 'steel',
    unit: 'kg', serviceLife: 60, source: 'World Steel EPD; ICE Database v3.0',
    description: '~30% recycled content, BF-BOF route',
    epd: {
      A1_A3: { GWP: 2.46, ODP: 6.7e-7, AP: 6.6e-3, EP: 5.1e-4, POCP: 1.3e-3, ADP_fossil: 24.4 },
      D:     { GWP: -1.12, ODP: -3e-7, AP: -3.9e-3, EP: -2.9e-4, POCP: -7.5e-4, ADP_fossil: -14.1 },
    },
  },
  {
    id: 'steel_section_recycled', name: 'Structural Steel – Recycled (EAF)', category: 'steel',
    unit: 'kg', serviceLife: 60, source: 'World Steel EPD',
    description: 'Electric arc furnace, ~100% scrap',
    epd: {
      A1_A3: { GWP: 0.44, ODP: 2.1e-7, AP: 2.1e-3, EP: 1.8e-4, POCP: 4.5e-4, ADP_fossil: 6.8 },
      D:     { GWP: -1.12, ODP: -3e-7, AP: -3.9e-3, EP: -2.9e-4, POCP: -7.5e-4, ADP_fossil: -14.1 },
    },
  },
  {
    id: 'aluminum_virgin', name: 'Aluminum – Primary (Virgin)', category: 'steel',
    unit: 'kg', serviceLife: 60, source: 'European Aluminium EPD',
    epd: {
      A1_A3: { GWP: 11.46, ODP: 5.4e-6, AP: 3.6e-2, EP: 2.6e-3, POCP: 3.2e-3, ADP_fossil: 151 },
      D:     { GWP: -7.3, ODP: -3.5e-6, AP: -2.3e-2, EP: -1.7e-3, POCP: -2.1e-3, ADP_fossil: -97 },
    },
  },
  {
    id: 'aluminum_recycled', name: 'Aluminum – Secondary (Recycled)', category: 'steel',
    unit: 'kg', serviceLife: 60, source: 'European Aluminium EPD',
    epd: {
      A1_A3: { GWP: 1.69, ODP: 7.8e-7, AP: 5.3e-3, EP: 3.8e-4, POCP: 4.7e-4, ADP_fossil: 22.5 },
      D:     { GWP: -7.3, ODP: -3.5e-6, AP: -2.3e-2, EP: -1.7e-3, POCP: -2.1e-3, ADP_fossil: -97 },
    },
  },
  {
    id: 'stainless_steel', name: 'Stainless Steel (Grade 304)', category: 'steel',
    unit: 'kg', serviceLife: 60, source: 'ISSF EPD; ICE Database v3.0',
    epd: { A1_A3: { GWP: 6.15, ODP: 1.3e-6, AP: 1.9e-2, EP: 1.3e-3, POCP: 2.7e-3, ADP_fossil: 77.6 } },
  },
  {
    id: 'zinc_sheet', name: 'Zinc Sheet (Roofing / Cladding)', category: 'cladding',
    unit: 'kg', serviceLife: 60, source: 'IZA EPD',
    epd: { A1_A3: { GWP: 3.86, ODP: 1.4e-6, AP: 1.2e-2, EP: 8.5e-4, POCP: 1.7e-3, ADP_fossil: 51.1 } },
  },
  {
    id: 'copper', name: 'Copper (Piping & Fittings)', category: 'mep',
    unit: 'kg', serviceLife: 40, source: 'Copper Alliance EPD',
    epd: {
      A1_A3: { GWP: 3.81, ODP: 1.4e-6, AP: 1.9e-2, EP: 1.3e-3, POCP: 1.5e-3, ADP_fossil: 47.8 },
      D:     { GWP: -2.4, ODP: -9e-7, AP: -1.2e-2, EP: -8.4e-4, POCP: -9.7e-4, ADP_fossil: -30.8 },
    },
  },

  // ── Timber & Wood ─────────────────────────────────────────────────────────
  {
    id: 'timber_softwood', name: 'Timber – Softwood (Sawn, Kiln-dried)', category: 'timber',
    unit: 'kg', density: 500, serviceLife: 60, biogenicCarbonIncluded: true,
    source: 'ICE Database v3.0', description: 'C24 structural sawn softwood, biogenic carbon included',
    epd: {
      A1_A3: { GWP: -0.9, ODP: 8.3e-8, AP: 1.1e-3, EP: 6.4e-5, POCP: 3.7e-4, ADP_fossil: 1.78 },
      C1_C4: { GWP: 0.45, ODP: 4e-8, AP: 5.5e-4, EP: 3.2e-5, POCP: 1.9e-4, ADP_fossil: 0.89 },
      D:     { GWP: -0.52, ODP: -4.8e-8, AP: -6.4e-4, EP: -3.7e-5, POCP: -2.1e-4, ADP_fossil: -1.03 },
    },
  },
  {
    id: 'timber_hardwood', name: 'Timber – Hardwood (Sawn)', category: 'timber',
    unit: 'kg', density: 700, serviceLife: 60, biogenicCarbonIncluded: true,
    source: 'ICE Database v3.0',
    epd: { A1_A3: { GWP: -1.1, ODP: 1.1e-7, AP: 1.5e-3, EP: 9.2e-5, POCP: 5.4e-4, ADP_fossil: 2.21 } },
  },
  {
    id: 'glulam', name: 'Glued Laminated Timber (Glulam GL24h)', category: 'timber',
    unit: 'kg', density: 480, serviceLife: 60, biogenicCarbonIncluded: true,
    source: 'EPD Norge; ICE Database v3.0',
    epd: {
      A1_A3: { GWP: -0.7, ODP: 1.4e-7, AP: 1.8e-3, EP: 1.1e-4, POCP: 6.1e-4, ADP_fossil: 2.89 },
      D:     { GWP: -0.45, ODP: -4.2e-8, AP: -5.5e-4, EP: -3.2e-5, POCP: -1.8e-4, ADP_fossil: -0.89 },
    },
  },
  {
    id: 'clt', name: 'Cross-Laminated Timber (CLT)', category: 'timber',
    unit: 'kg', density: 480, serviceLife: 60, biogenicCarbonIncluded: true,
    source: 'KLH EPD; CORRIM',
    epd: {
      A1_A3: { GWP: -0.52, ODP: 2e-7, AP: 2.6e-3, EP: 1.6e-4, POCP: 8.9e-4, ADP_fossil: 4.11 },
      D:     { GWP: -0.45, ODP: -4.2e-8, AP: -5.5e-4, EP: -3.2e-5, POCP: -1.8e-4, ADP_fossil: -0.89 },
    },
  },
  {
    id: 'plywood', name: 'Plywood (Structural)', category: 'timber',
    unit: 'kg', density: 550, serviceLife: 30, source: 'ICE Database v3.0',
    epd: { A1_A3: { GWP: 1.07, ODP: 2.8e-7, AP: 3.4e-3, EP: 2.5e-4, POCP: 7.4e-4, ADP_fossil: 13.9 } },
  },
  {
    id: 'osb', name: 'Oriented Strand Board (OSB/3)', category: 'timber',
    unit: 'kg', density: 600, serviceLife: 25, source: 'ICE Database v3.0',
    epd: { A1_A3: { GWP: 0.96, ODP: 2.5e-7, AP: 3.1e-3, EP: 2.2e-4, POCP: 6.6e-4, ADP_fossil: 12.5 } },
  },

  // ── Masonry & Stone ───────────────────────────────────────────────────────
  {
    id: 'brick_clay', name: 'Brick – Fired Clay (Facing)', category: 'masonry',
    unit: 'kg', density: 1900, serviceLife: 60, source: 'BDA EPD; ICE Database v3.0',
    epd: {
      A1_A3: { GWP: 0.22, ODP: 3.5e-8, AP: 6.8e-4, EP: 5.3e-5, POCP: 1.2e-4, ADP_fossil: 2.34 },
      C1_C4: { GWP: 0.05, ODP: 8e-9, AP: 1.6e-4, EP: 1.3e-5, POCP: 2.9e-5, ADP_fossil: 0.53 },
    },
  },
  {
    id: 'granite', name: 'Granite (Natural Stone)', category: 'masonry',
    unit: 'kg', density: 2700, serviceLife: 60, source: 'ICE Database v3.0',
    epd: { A1_A3: { GWP: 0.07, ODP: 1.2e-8, AP: 2.3e-4, EP: 1.7e-5, POCP: 3.8e-5, ADP_fossil: 0.83 } },
  },
  {
    id: 'limestone', name: 'Limestone / Sandstone', category: 'masonry',
    unit: 'kg', density: 2200, serviceLife: 60, source: 'ICE Database v3.0',
    epd: { A1_A3: { GWP: 0.04, ODP: 8.7e-9, AP: 1.5e-4, EP: 1.1e-5, POCP: 2.5e-5, ADP_fossil: 0.51 } },
  },

  // ── Insulation ────────────────────────────────────────────────────────────
  {
    id: 'mineral_wool_glass', name: 'Mineral Wool – Glass Wool', category: 'insulation',
    unit: 'kg', density: 20, serviceLife: 60, source: 'EURIMA EPD; ICE Database v3.0',
    epd: {
      A1_A3: { GWP: 1.35, ODP: 2.8e-7, AP: 4.3e-3, EP: 3.1e-4, POCP: 7.2e-4, ADP_fossil: 16.2 },
      C1_C4: { GWP: 0.12, ODP: 2.5e-8, AP: 3.9e-4, EP: 2.8e-5, POCP: 6.5e-5, ADP_fossil: 1.46 },
    },
  },
  {
    id: 'mineral_wool_rock', name: 'Mineral Wool – Rock Wool', category: 'insulation',
    unit: 'kg', density: 30, serviceLife: 60, source: 'ROCKWOOL EPD; ICE Database v3.0',
    epd: {
      A1_A3: { GWP: 1.05, ODP: 2.1e-7, AP: 3.6e-3, EP: 2.5e-4, POCP: 5.8e-4, ADP_fossil: 13.8 },
      C1_C4: { GWP: 0.09, ODP: 1.9e-8, AP: 3.1e-4, EP: 2.2e-5, POCP: 5.2e-5, ADP_fossil: 1.08 },
    },
  },
  {
    id: 'eps_insulation', name: 'EPS – Expanded Polystyrene', category: 'insulation',
    unit: 'kg', density: 18, serviceLife: 50, source: 'EUMEPS EPD; ICE Database v3.0',
    epd: { A1_A3: { GWP: 3.43, ODP: 3.1e-7, AP: 1.0e-2, EP: 7.3e-4, POCP: 1.6e-3, ADP_fossil: 93.7 } },
  },
  {
    id: 'xps_insulation', name: 'XPS – Extruded Polystyrene', category: 'insulation',
    unit: 'kg', density: 35, serviceLife: 50, source: 'ICE Database v3.0',
    description: 'Note: high ODP from HFC blowing agents',
    epd: { A1_A3: { GWP: 3.87, ODP: 8.3e-6, AP: 1.2e-2, EP: 8.2e-4, POCP: 1.8e-3, ADP_fossil: 103 } },
  },
  {
    id: 'pir_insulation', name: 'PIR – Polyisocyanurate (Rigid Foam)', category: 'insulation',
    unit: 'kg', density: 32, serviceLife: 50, source: 'EPFA EPD; ICE Database v3.0',
    epd: { A1_A3: { GWP: 4.17, ODP: 3.4e-7, AP: 1.3e-2, EP: 8.8e-4, POCP: 1.9e-3, ADP_fossil: 86.4 } },
  },
  {
    id: 'cellulose_insulation', name: 'Cellulose Insulation (Blown)', category: 'insulation',
    unit: 'kg', density: 40, serviceLife: 50, source: 'ICE Database v3.0',
    description: 'Recycled newspaper-based loose-fill insulation',
    epd: { A1_A3: { GWP: 0.34, ODP: 5.2e-8, AP: 1.2e-3, EP: 7.8e-5, POCP: 1.9e-4, ADP_fossil: 4.1 } },
  },

  // ── Glazing ───────────────────────────────────────────────────────────────
  {
    id: 'float_glass', name: 'Float Glass (Single)', category: 'glazing',
    unit: 'kg', density: 2500, serviceLife: 30, source: 'Glass for Europe EPD',
    epd: { A1_A3: { GWP: 0.86, ODP: 1.9e-7, AP: 2.9e-3, EP: 2.0e-4, POCP: 5.1e-4, ADP_fossil: 7.94 } },
  },
  {
    id: 'dg_unit', name: 'Double Glazing Unit (DGU)', category: 'glazing',
    unit: 'm2', serviceLife: 30, source: 'ICE Database v3.0',
    description: 'Argon-filled, low-e coating (6+16+6mm) – value per m²',
    epd: {
      A1_A3: { GWP: 47.3, ODP: 1.05e-5, AP: 0.159, EP: 0.011, POCP: 0.028, ADP_fossil: 437 },
      C1_C4: { GWP: 4.7, ODP: 1e-6, AP: 0.016, EP: 0.001, POCP: 0.003, ADP_fossil: 44 },
    },
  },
  {
    id: 'tg_unit', name: 'Triple Glazing Unit (TGU)', category: 'glazing',
    unit: 'm2', serviceLife: 30, source: 'Manufacturer EPDs',
    description: 'Krypton-filled, Uw ≈ 0.6 W/m²K – value per m²',
    epd: { A1_A3: { GWP: 67.1, ODP: 1.5e-5, AP: 0.226, EP: 0.016, POCP: 0.040, ADP_fossil: 621 } },
  },

  // ── Finishes & Interiors ──────────────────────────────────────────────────
  {
    id: 'gypsum_board', name: 'Gypsum Plasterboard (Drywall 12.5mm)', category: 'finishes',
    unit: 'kg', density: 950, serviceLife: 30, source: 'Knauf EPD; British Gypsum EPD',
    epd: { A1_A3: { GWP: 0.40, ODP: 7.5e-8, AP: 1.4e-3, EP: 9.8e-5, POCP: 2.2e-4, ADP_fossil: 4.52 } },
  },
  {
    id: 'ceramic_tile', name: 'Ceramic / Porcelain Tiles', category: 'finishes',
    unit: 'kg', density: 2200, serviceLife: 30, source: 'Tile Industry EPD',
    epd: { A1_A3: { GWP: 0.59, ODP: 9.2e-8, AP: 1.9e-3, EP: 1.4e-4, POCP: 3.1e-4, ADP_fossil: 5.87 } },
  },
  {
    id: 'carpet_nylon', name: 'Carpet – Nylon (Tufted)', category: 'finishes',
    unit: 'kg', density: 1100, serviceLife: 15, source: 'ICE Database v3.0',
    epd: { A1_A3: { GWP: 6.34, ODP: 9.7e-7, AP: 2.2e-2, EP: 1.5e-3, POCP: 3.1e-3, ADP_fossil: 123 } },
  },
  {
    id: 'carpet_wool', name: 'Carpet – Wool (Woven)', category: 'finishes',
    unit: 'kg', density: 1300, serviceLife: 15, source: 'ICE Database v3.0',
    epd: { A1_A3: { GWP: 5.12, ODP: 7.8e-7, AP: 1.8e-2, EP: 1.2e-3, POCP: 2.5e-3, ADP_fossil: 98 } },
  },
  {
    id: 'paint_water', name: 'Paint – Water-Based Interior', category: 'finishes',
    unit: 'kg', serviceLife: 10, source: 'ICE Database v3.0',
    epd: { A1_A3: { GWP: 2.12, ODP: 3.8e-7, AP: 7.3e-3, EP: 5.2e-4, POCP: 1.1e-3, ADP_fossil: 43.5 } },
  },
  {
    id: 'timber_flooring', name: 'Timber Flooring (Engineered)', category: 'finishes',
    unit: 'kg', density: 600, serviceLife: 25, source: 'ICE Database v3.0',
    epd: { A1_A3: { GWP: 0.51, ODP: 1.3e-7, AP: 1.7e-3, EP: 1.0e-4, POCP: 4.8e-4, ADP_fossil: 6.2 } },
  },

  // ── Roofing ───────────────────────────────────────────────────────────────
  {
    id: 'bitumen_membrane', name: 'Bitumen Waterproofing Membrane (SBS)', category: 'roofing',
    unit: 'kg', density: 1100, serviceLife: 25, source: 'ICE Database v3.0',
    epd: { A1_A3: { GWP: 0.45, ODP: 8.5e-8, AP: 1.9e-3, EP: 1.2e-4, POCP: 3.2e-4, ADP_fossil: 17.3 } },
  },
  {
    id: 'epdm_membrane', name: 'EPDM Roofing Membrane', category: 'roofing',
    unit: 'kg', density: 1200, serviceLife: 30, source: 'EPDM Roofing Association EPD',
    epd: {
      A1_A3: { GWP: 3.62, ODP: 4.1e-7, AP: 1.1e-2, EP: 7.8e-4, POCP: 1.5e-3, ADP_fossil: 65.3 },
      D:     { GWP: -1.2, ODP: -1.4e-7, AP: -3.7e-3, EP: -2.6e-4, POCP: -5e-4, ADP_fossil: -21.6 },
    },
  },
  {
    id: 'concrete_roof_tile', name: 'Concrete Roof Tile', category: 'roofing',
    unit: 'kg', density: 2200, serviceLife: 60, source: 'ICE Database v3.0',
    epd: { A1_A3: { GWP: 0.11, ODP: 1.4e-8, AP: 3.6e-4, EP: 5.4e-5, POCP: 4.9e-5, ADP_fossil: 0.88 } },
  },
  {
    id: 'clay_roof_tile', name: 'Clay Roof Tile', category: 'roofing',
    unit: 'kg', density: 2100, serviceLife: 60, source: 'ICE Database v3.0',
    epd: { A1_A3: { GWP: 0.27, ODP: 4.3e-8, AP: 8.3e-4, EP: 6.5e-5, POCP: 1.5e-4, ADP_fossil: 2.87 } },
  },

  // ── MEP / Services ────────────────────────────────────────────────────────
  {
    id: 'pvc_pipe', name: 'PVC Pipe (Rigid uPVC)', category: 'mep',
    unit: 'kg', serviceLife: 40, source: 'VinylPlus EPD',
    epd: { A1_A3: { GWP: 3.10, ODP: 5.6e-7, AP: 9.5e-3, EP: 6.8e-4, POCP: 1.3e-3, ADP_fossil: 65.6 } },
  },
  {
    id: 'hdpe_pipe', name: 'HDPE Pipe', category: 'mep',
    unit: 'kg', serviceLife: 50, source: 'Plastics Europe EPD',
    epd: { A1_A3: { GWP: 1.93, ODP: 3.4e-7, AP: 5.9e-3, EP: 4.2e-4, POCP: 8.1e-4, ADP_fossil: 77.8 } },
  },

  // ── Other ─────────────────────────────────────────────────────────────────
  {
    id: 'gravel', name: 'Gravel / Aggregate', category: 'other',
    unit: 'kg', density: 1700, serviceLife: 60, source: 'ICE Database v3.0',
    epd: { A1_A3: { GWP: 0.0048, ODP: 7e-10, AP: 1.5e-5, EP: 1e-6, POCP: 2.2e-6, ADP_fossil: 0.061 } },
  },
  {
    id: 'sand', name: 'Sand (Construction)', category: 'other',
    unit: 'kg', density: 1600, serviceLife: 60, source: 'ICE Database v3.0',
    epd: { A1_A3: { GWP: 0.0049, ODP: 6.8e-10, AP: 1.4e-5, EP: 9.8e-7, POCP: 2e-6, ADP_fossil: 0.059 } },
  },
];

export const getMaterialById = (id: string) => MATERIALS.find((m) => m.id === id);
export const getMaterialsByCategory = (cat: string) => MATERIALS.filter((m) => m.category === cat);
export const searchMaterials = (q: string) => {
  const ql = q.toLowerCase();
  return MATERIALS.filter((m) =>
    m.name.toLowerCase().includes(ql) ||
    m.category.toLowerCase().includes(ql) ||
    (m.description?.toLowerCase().includes(ql) ?? false),
  );
};

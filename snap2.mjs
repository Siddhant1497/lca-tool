import { chromium } from 'playwright';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = 'http://localhost:3000';

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

const lcaState = {
  activePage: 'dashboard',
  project: {
    id: 'demo-1',
    name: 'Riverside Office Tower',
    description: 'A 10-storey mixed-use office tower in London',
    buildingType: 'office',
    location: 'London, UK',
    country: 'UK',
    grossFloorArea: 12500,
    conditionedFloorArea: 11000,
    stories: 10,
    buildingHeight: 42,
    lifespan: 60,
    energyIntensity: 120,
    gridCarbonIntensity: 0.233,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  materialEntries: [
    { id: 'e1', materialId: 'concrete_c30', name: 'Concrete C30', component: 'Foundations', stage: 'A1_A3', quantity: 850, unit: 'm3', category: 'concrete', notes: '', b4Replacement: false, serviceLife: 60 },
    { id: 'e2', materialId: 'rebar_steel', name: 'Reinforcement Steel', component: 'Foundations', stage: 'A1_A3', quantity: 68000, unit: 'kg', category: 'metals', notes: '', b4Replacement: false, serviceLife: 60 },
    { id: 'e3', materialId: 'concrete_c30', name: 'Concrete C30', component: 'Ground Floor Slab', stage: 'A1_A3', quantity: 620, unit: 'm3', category: 'concrete', notes: '', b4Replacement: false, serviceLife: 60 },
    { id: 'e4', materialId: 'steel_section_virgin', name: 'Structural Steel', component: 'Columns / Beams / Frame', stage: 'A1_A3', quantity: 480000, unit: 'kg', category: 'metals', notes: '', b4Replacement: false, serviceLife: 60 },
    { id: 'e5', materialId: 'rebar_steel', name: 'Reinforcement Steel', component: 'Columns / Beams / Frame', stage: 'A1_A3', quantity: 120000, unit: 'kg', category: 'metals', notes: '', b4Replacement: false, serviceLife: 60 },
    { id: 'e6', materialId: 'concrete_c25', name: 'Concrete C25', component: 'Floors / Slabs', stage: 'A1_A3', quantity: 1200, unit: 'm3', category: 'concrete', notes: '', b4Replacement: false, serviceLife: 60 },
    { id: 'e7', materialId: 'brick_clay', name: 'Clay Brick', component: 'External Walls', stage: 'A1_A3', quantity: 180000, unit: 'kg', category: 'masonry', notes: '', b4Replacement: false, serviceLife: 60 },
    { id: 'e8', materialId: 'mineral_wool_glass', name: 'Glass Mineral Wool', component: 'External Walls', stage: 'A1_A3', quantity: 24000, unit: 'kg', category: 'insulation', notes: '', b4Replacement: true, serviceLife: 30 },
    { id: 'e9', materialId: 'dg_unit', name: 'Double Glazing', component: 'Windows / Glazing', stage: 'A1_A3', quantity: 1800, unit: 'm2', category: 'glass', notes: '', b4Replacement: true, serviceLife: 30 },
    { id: 'e10', materialId: 'aluminum_virgin', name: 'Aluminium Curtain Wall', component: 'Windows / Glazing', stage: 'A1_A3', quantity: 18000, unit: 'kg', category: 'metals', notes: '', b4Replacement: true, serviceLife: 30 },
    { id: 'e11', materialId: 'gypsum_board', name: 'Gypsum Plasterboard', component: 'Internal Partitions', stage: 'A1_A3', quantity: 85000, unit: 'kg', category: 'boards', notes: '', b4Replacement: false, serviceLife: 60 },
    { id: 'e12', materialId: 'carpet_nylon', name: 'Carpet (Nylon)', component: 'Floor Finishes', stage: 'A1_A3', quantity: 9500, unit: 'kg', category: 'finishes', notes: '', b4Replacement: true, serviceLife: 15 },
    { id: 'e13', materialId: 'bitumen_membrane', name: 'Bitumen Waterproofing', component: 'Roof', stage: 'A1_A3', quantity: 8500, unit: 'kg', category: 'membranes', notes: '', b4Replacement: true, serviceLife: 20 },
    { id: 'e14', materialId: 'concrete_c25', name: 'Concrete C25', component: 'Roof', stage: 'A1_A3', quantity: 340, unit: 'm3', category: 'concrete', notes: '', b4Replacement: false, serviceLife: 60 },
    { id: 'e15', materialId: 'pvc_pipe', name: 'PVC Pipework', component: 'M&E / Services', stage: 'A1_A3', quantity: 4200, unit: 'kg', category: 'pipes', notes: '', b4Replacement: true, serviceLife: 25 },
  ],
  baselineEntries: [
    { id: 'b1', materialId: 'concrete_c30', name: 'Concrete C30', component: 'Foundations', stage: 'A1_A3', quantity: 850, unit: 'm3', category: 'concrete', notes: '', b4Replacement: false, serviceLife: 60 },
    { id: 'b2', materialId: 'rebar_steel', name: 'Reinforcement Steel', component: 'Foundations', stage: 'A1_A3', quantity: 90000, unit: 'kg', category: 'metals', notes: '', b4Replacement: false, serviceLife: 60 },
    { id: 'b3', materialId: 'steel_section_virgin', name: 'Structural Steel', component: 'Columns / Beams / Frame', stage: 'A1_A3', quantity: 600000, unit: 'kg', category: 'metals', notes: '', b4Replacement: false, serviceLife: 60 },
    { id: 'b4', materialId: 'concrete_c25', name: 'Concrete C25', component: 'Floors / Slabs', stage: 'A1_A3', quantity: 1400, unit: 'm3', category: 'concrete', notes: '', b4Replacement: false, serviceLife: 60 },
    { id: 'b5', materialId: 'brick_clay', name: 'Clay Brick', component: 'External Walls', stage: 'A1_A3', quantity: 200000, unit: 'kg', category: 'masonry', notes: '', b4Replacement: false, serviceLife: 60 },
    { id: 'b6', materialId: 'xps_insulation', name: 'XPS Insulation', component: 'External Walls', stage: 'A1_A3', quantity: 18000, unit: 'kg', category: 'insulation', notes: '', b4Replacement: false, serviceLife: 60 },
    { id: 'b7', materialId: 'dg_unit', name: 'Double Glazing', component: 'Windows / Glazing', stage: 'A1_A3', quantity: 1800, unit: 'm2', category: 'glass', notes: '', b4Replacement: false, serviceLife: 60 },
  ],
  hasBaseline: true,
};

const navTo = async (label) => {
  await page.getByRole('button', { name: new RegExp(label, 'i') }).click();
  await page.waitForTimeout(600);
};

const clickTab = async (label) => {
  const tabs = await page.$$('.tab');
  for (const t of tabs) {
    const txt = await t.innerText();
    if (txt.toLowerCase().includes(label.toLowerCase())) { await t.click(); break; }
  }
  await page.waitForTimeout(400);
};

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate((state) => {
  localStorage.setItem('lca_tool_v1', JSON.stringify(state));
}, lcaState);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// 1. Dashboard with data
await page.screenshot({ path: '/tmp/lca_06_dashboard_data.png' });
console.log('1/8 dashboard with data');

// 2. LCA Results - overview
await navTo('LCA Results');
await page.screenshot({ path: '/tmp/lca_07_results_overview.png' });
console.log('2/8 results overview');

// 3. Results - stage breakdown
await clickTab('stage');
await page.screenshot({ path: '/tmp/lca_08_results_stage.png' });
console.log('3/8 stage breakdown');

// 4. Results - materials
await clickTab('material');
await page.screenshot({ path: '/tmp/lca_09_results_materials.png' });
console.log('4/8 materials table');

// 5. Results - baseline
await clickTab('baseline');
await page.screenshot({ path: '/tmp/lca_10_results_baseline.png' });
console.log('5/8 baseline comparison');

// 6. Compliance
await navTo('Compliance');
await page.screenshot({ path: '/tmp/lca_11_compliance.png' });
console.log('6/8 compliance');

// 7. Scroll compliance for detail
await page.evaluate(() => window.scrollBy(0, 500));
await page.waitForTimeout(300);
await page.screenshot({ path: '/tmp/lca_12_compliance_detail.png' });
console.log('7/8 compliance detail');

// 8. Export page
await navTo('Export Report');
await page.screenshot({ path: '/tmp/lca_13_export.png' });
console.log('8/8 export');

await browser.close();
console.log('All done.');

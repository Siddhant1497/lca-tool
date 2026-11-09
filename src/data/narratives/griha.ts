/**
 * GRIHA v2019 narrative templates (new construction), in the same structure as the IGBC set.
 * {{Name|fmt}} = project fact entered once in the Project facts form; [[hint]] = fact typed per criterion.
 * Criterion names and points follow the GRIHA v2019 structure (100 points + 5 innovation). Mandatory /
 * partly-mandatory status and appraisal thresholds are left to the team: confirm them in the current manual.
 */
import type { NRating, NCredit } from '../../utils/narrative';

const c = (id: string, name: string, pts: string, intent: string, approach: string[], evidence: string[], result: string, preempt: string[] = []): NCredit =>
  ({ id, name, pts, tab: 'Project facts', intent, approach, evidence, result, preempt });
const P = '{{Proj_Name|@}}';

export const GRIHA_V2019: NRating = {
  family: 'GRIHA', facts: true,
  title: 'GRIHA v2019',
  tokens: [['Proj_Name', '@'], ['Proj_City', '@'], ['Proj_RegID', '@'], ['Climate_Zone', '@'], ['Site_Area', '#,##0'], ['BUA_Total', '#,##0'], ['Occupants', '#,##0'], ['Bld_Type', '@'], ['Cert_Level', '@'], ['Total_Points', '0'], ['Proj_Stage', '@']],
  sample: {
    project: 'SAMPLE – Government School Campus (illustrative, not a real project)', sample: true, blank: 0, total: 11,
    totals: { pts: 62, level: '3 Star', mand: 'Mandatory criteria targeted', stage: 'Design stage' },
    targets: {},
    labels: { Proj_Name: 'Project name', Proj_City: 'City / location', Proj_RegID: 'GRIHA registration number', Climate_Zone: 'Climate zone', Site_Area: 'Site area (m2)', BUA_Total: 'Built-up area (m2)',
      Occupants: 'Design occupancy', Bld_Type: 'Building typology', Cert_Level: 'Target rating', Total_Points: 'Targeted points', Proj_Stage: 'Stage' },
    values: { 'Proj_Name|@': 'SAMPLE – Government School Campus', 'Proj_City|@': 'Jaipur, Rajasthan', 'Proj_RegID|@': 'GRIHA/0000/2026', 'Climate_Zone|@': 'Hot and dry',
      'Site_Area|#,##0': '24,000', 'BUA_Total|#,##0': '18,500', 'Occupants|#,##0': '1,800', 'Bld_Type|@': 'Institutional (school)', 'Cert_Level|@': '3 Star', 'Total_Points|0': '62', 'Proj_Stage|@': 'Design stage' },
  },
  sections: [
    { title: 'Project summary', credits: [
      c('Project', 'Project description', '', `${P} (GRIHA registration {{Proj_RegID|@}}) is a {{Bld_Type|@}} project in {{Proj_City|@}}, {{Climate_Zone|@}} climate zone, registered under GRIHA v2019.`,
        ['Site area {{Site_Area|#,##0}} m2; built-up area {{BUA_Total|#,##0}} m2; design occupancy {{Occupants|#,##0}}.', 'The project targets {{Total_Points|0}} points ({{Cert_Level|@}}).'],
        ['Area statement and occupancy calculation [[reference]].'], 'Use the same areas and occupancy in every criterion.', ['Rating bands: 25–40 1 Star, 41–55 2 Star, 56–70 3 Star, 71–85 4 Star, 86+ 5 Star (confirm in the current manual).']),
    ] },
    { title: 'Section 1: Sustainable Site Planning', credits: [
      c('Cr 1', 'Green Infrastructure', '5 points', 'Preserve and enhance the site\'s natural features and green cover.',
        ['Existing trees: [[number]] surveyed, [[number]] preserved in situ, [[number]] transplanted; compensatory planting of [[number]] trees.', 'Soft landscape over [[area]] m2 ([[percent]]% of site area), with [[percent]]% native species.'],
        ['Tree survey and site plan marking preserved, transplanted and new trees; landscape plan with species list.'], 'The project targets [[points]] of 5 points.', ['Keep the tree survey dated before site clearance.']),
      c('Cr 2', 'Low Impact Design', '5 points', 'Reduce the impact of development through passive, climate-responsive design.',
        ['Passive strategies for the {{Climate_Zone|@}} zone: [[orientation, shading, courtyards, thermal mass, natural ventilation]].', 'Site planning that reduces disturbance: [[cut-and-fill balance, footprint, contours retained]].'],
        ['Climate analysis; drawings showing passive strategies; shading and orientation analysis.'], 'The project targets [[points]] of 5 points.'),
      c('Cr 3', 'Design to Mitigate Urban Heat Island Effect', '2 points', 'Reduce heat absorbed by site and roof surfaces.',
        ['Non-roof: [[tree shade, grass pavers, high-SRI paving]] over [[percent]]% of hard-paved area.', 'Roof: [[high-SRI finish, vegetated roof, solar PV]] over [[percent]]% of exposed roof area.'],
        ['Site and roof plans marking treatments; SRI data sheets; area calculation.'], 'The project targets [[points]] of 2 points.'),
    ] },
    { title: 'Section 2: Construction Management', credits: [
      c('Cr 4', 'Air and Soil Pollution Control', '1 point', 'Limit air and soil pollution during construction.',
        ['Dust control: [[barricading to height, water sprinkling, covered transport, wheel washing]]. Soil: [[erosion control, spill management]].'],
        ['Construction management plan; dated photographs of measures.'], 'The project targets [[0 / 1]] of 1 point.'),
      c('Cr 5', 'Top Soil Preservation', '1 point', 'Preserve fertile topsoil for reuse in landscaping.',
        ['Topsoil of [[volume]] m3 stripped to [[depth]] and stored at [[location]], [[covered / stabilised]], and reused for [[landscape areas]].'],
        ['Topsoil management plan; soil test; photographs of storage and reuse.'], 'The project targets [[0 / 1]] of 1 point.'),
      c('Cr 6', 'Construction Management Practices', '2 points', 'Manage construction waste, energy and water use responsibly.',
        ['Construction waste segregated into [[streams]] with [[percent]]% diverted; construction water and energy metered; [[other practices]].'],
        ['Waste log and receipts; metering records; photographs.'], 'The project targets [[points]] of 2 points.'),
    ] },
    { title: 'Section 3: Energy Optimization', credits: [
      c('Cr 7', 'Energy Optimization', '12 points', 'Reduce building energy consumption beyond the ECBC benchmark.',
        ['Compliance path: [[prescriptive / whole-building simulation in software]] against [[ECBC 2017 / ECSBC]] for a {{Bld_Type|@}} building of {{BUA_Total|#,##0}} m2.', 'EPI of proposed design: [[kWh/m2/yr]] against benchmark [[kWh/m2/yr]] ([[percent]]% reduction). Key measures: [[envelope U-values, glazing SHGC/VLT, LPD, HVAC efficiency, controls]].'],
        ['Energy simulation report or ECBC compliance forms; equipment schedules and cut sheets.'], 'The project targets [[points]] of 12 points.', ['Use the same area and operating hours as the area statement.']),
      c('Cr 8', 'Renewable Energy Utilization', '5 points', 'Meet part of the energy demand from on-site renewable sources.',
        ['On-site [[solar PV]] of [[kWp]] generating [[kWh]]/yr, [[percent]]% of total annual energy demand; [[solar water heating]] for [[percent]]% of hot water demand.'],
        ['RE generation calculation (PVsyst / PVWatts); roof layout; cut sheets.'], 'The project targets [[points]] of 5 points.'),
      c('Cr 9', 'Low ODP and GWP Materials', '1 point', 'Avoid refrigerants and insulation with high ozone-depletion or warming potential.',
        ['HVAC refrigerants: [[type, ODP, GWP]]. Insulation blowing agents: [[type]]. Fire suppression: halon-free.'],
        ['Refrigerant schedule; insulation and HVAC cut sheets; declaration.'], 'The project targets [[0 / 1]] of 1 point.'),
    ] },
    { title: 'Section 4: Occupant Comfort', credits: [
      c('Cr 10', 'Visual Comfort', '4 points', 'Provide adequate daylight and glare-free visual environments.',
        ['Daylight simulation in [[software]] shows [[percent]]% of living areas meeting the daylight factor / UDI criteria; glare control by [[shading devices]].', 'Artificial lighting meets [[NBC 2016 illuminance levels]].'],
        ['Daylight simulation report with inputs and results by space; lighting design.'], 'The project targets [[points]] of 4 points.', ['State glazing VLT and surface reflectances used in the model.']),
      c('Cr 11', 'Thermal and Acoustic Comfort', '2 points', 'Maintain thermal and acoustic comfort for occupants.',
        ['Thermal: [[percent]]% of occupied hours within [[NBC / IMAC adaptive]] comfort band for [[spaces]]. Acoustic: background noise within [[limits]] for [[spaces]].'],
        ['Thermal comfort simulation; acoustic design narrative and calculations.'], 'The project targets [[points]] of 2 points.'),
      c('Cr 12', 'Maintaining Good Indoor Air Quality', '6 points', 'Ensure healthy indoor air through ventilation and low-emitting materials.',
        ['Fresh air per [[ASHRAE 62.1 / NBC]] for [[spaces]]; low-VOC [[paints, adhesives, sealants]]; [[CO2 / PM monitoring]].'],
        ['Ventilation calculation; product data sheets with VOC content; monitoring layout.'], 'The project targets [[points]] of 6 points.'),
    ] },
    { title: 'Section 5: Water Management', credits: [
      c('Cr 13', 'Water Demand Reduction', '3 points', 'Reduce water demand through efficient fixtures and landscape.',
        ['Fixture demand is [[percent]]% below the GRIHA baseline for {{Occupants|#,##0}} occupants, using [[low-flow fixtures with flow rates]]. Landscape demand reduced by [[percent]]% through [[native species, drip]].'],
        ['Water demand calculation; fixture cut sheets; landscape plan.'], 'The project targets [[points]] of 3 points.'),
      c('Cr 14', 'Wastewater Treatment', '3 points', 'Treat wastewater on site for reuse.',
        ['On-site [[STP technology]] of [[KLD]] capacity treats [[percent]]% of wastewater to [[CPCB / SPCB]] reuse standards; treated water reused for [[flushing, landscape]].'],
        ['STP design and capacity calculation; water balance; layout.'], 'The project targets [[points]] of 3 points.'),
      c('Cr 15', 'Rainwater Management', '5 points', 'Reduce run-off and recharge ground water or store rainwater for use.',
        ['Run-off from [[area]] m2 managed through [[recharge pits, storage tanks]] of [[volume]] m3, capturing [[percent]]% of run-off.'],
        ['Rainwater calculation with rainfall data source; drainage layout; percolation report if recharge.'], 'The project targets [[points]] of 5 points.'),
      c('Cr 16', 'Water Quality and Self-Sufficiency', '5 points', 'Ensure water quality and reduce dependence on external supply.',
        ['Water quality testing per [[IS 10500]] for [[sources]]; on-site sources meet [[percent]]% of demand.'],
        ['Water test reports; water balance showing self-sufficiency.'], 'The project targets [[points]] of 5 points.'),
    ] },
    { title: 'Section 6: Solid Waste Management', credits: [
      c('Cr 17', 'Waste Management – Post Occupancy', '4 points', 'Segregate and manage waste during operation.',
        ['Source segregation into [[streams]] with bins on [[floors / areas]]; central collection at [[location]]; tie-ups with [[authorised recyclers]].'],
        ['Waste management plan; layout of bins and storage; agreements.'], 'The project targets [[points]] of 4 points.'),
      c('Cr 18', 'Organic Waste Treatment On-Site', '2 points', 'Treat organic waste on site.',
        ['Organic waste of [[kg/day]] treated by [[composter / biogas]] of [[capacity]] at [[location]].'],
        ['Waste generation calculation; equipment specification; layout.'], 'The project targets [[points]] of 2 points.'),
    ] },
    { title: 'Section 7: Sustainable Building Materials', credits: [
      c('Cr 19', 'Utilization of Alternative Materials in Buildings', '5 points', 'Reduce embodied impacts by using alternative and recycled materials.',
        ['Materials with recycled or industrial-waste content: [[fly ash bricks / AAC blocks, PPC/PSC cement, recycled steel]] making up [[percent]]% of [[material category]].'],
        ['Material calculation; manufacturer certificates and invoices.'], 'The project targets [[points]] of 5 points.'),
      c('Cr 20', 'Reduction in GWP through Life Cycle Assessment', '5 points', 'Reduce embodied carbon through life-cycle assessment of the building.',
        ['Cradle-to-gate LCA in [[tool]] shows [[percent]]% reduction in GWP against a baseline building of the same function and area ({{BUA_Total|#,##0}} m2).'],
        ['LCA report with baseline and proposed, scope, data sources and results.'], 'The project targets [[points]] of 5 points.', ['Use the same scope and data sources for baseline and proposed.']),
      c('Cr 21', 'Alternative Materials for External Site Development', '2 points', 'Use low-impact materials for external works.',
        ['External paving and landscape use [[recycled aggregates, interlocking pavers, local stone]] over [[percent]]% of external hardscape.'],
        ['Site plan with materials; specifications; invoices.'], 'The project targets [[points]] of 2 points.'),
    ] },
    { title: 'Section 8: Life Cycle Costing', credits: [
      c('Cr 22', 'Life Cycle Cost Analysis', '5 points', 'Use life-cycle costing to select design options.',
        ['LCC analysis over [[years]] years compared [[options, e.g. glazing, HVAC, PV]] at a discount rate of [[percent]]%; the selected options [[result]].'],
        ['LCC report with assumptions, options and results.'], 'The project targets [[points]] of 5 points.'),
    ] },
    { title: 'Section 9: Socio-Economic Strategies', credits: [
      c('Cr 23', 'Safety and Sanitation for Construction Workers', '1 point', 'Provide safe working conditions and sanitation for construction workers.',
        ['For a peak workforce of [[number]]: [[toilets, drinking water, PPE, first aid, crèche]] provided; safety officer [[name]].'],
        ['Labour welfare plan; photographs; contractor declaration.'], 'The project targets [[0 / 1]] of 1 point.'),
      c('Cr 24', 'Universal Accessibility', '2 points', 'Make the building accessible to people with disabilities.',
        ['Accessible parking, ramps, lifts, toilets and signage per [[Harmonised Guidelines 2021 / NBC 2016]] at [[locations]].'],
        ['Drawings with dimensions; checklist against the guidelines.'], 'The project targets [[points]] of 2 points.'),
      c('Cr 25', 'Dedicated Facilities for Service Staff', '2 points', 'Provide facilities for service and support staff.',
        ['Service staff of [[number]] provided with [[rest rooms, toilets, changing rooms, drinking water]] at [[locations]].'],
        ['Floor plans marking facilities; staffing calculation.'], 'The project targets [[points]] of 2 points.'),
      c('Cr 26', 'Positive Social Impact', '3 points', 'Create positive impact for occupants and the local community.',
        ['Measures: [[local labour and materials, awareness programmes, community facilities]] with [[quantified outcomes]].'],
        ['Narrative with evidence for each measure.'], 'The project targets [[points]] of 3 points.'),
    ] },
    { title: 'Section 10: Performance Metering and Monitoring', credits: [
      c('Cr 27', 'Commissioning for Final Rating', '7 points', 'Verify that building systems perform as designed.',
        ['Commissioning of [[HVAC, lighting, RE, water systems]] by [[agency]] on [[dates]], with performance data for [[period]].'],
        ['Commissioning report; performance monitoring data.'], 'The project targets [[points]] of 7 points.'),
      c('Cr 28', 'Smart Metering and Monitoring', '', 'Monitor energy and water use through metering.',
        ['Meters on [[energy and water end uses]] linked to [[BMS / monitoring system]].'],
        ['Metering layout; BMS points list; cut sheets.'], 'Status: [[met / pending]].', ['Confirm points and mandatory status in the GRIHA v2019 manual.']),
      c('Cr 29', 'Operation and Maintenance Protocol', '', 'Keep the building performing as designed through planned O&M.',
        ['O&M manual covering [[systems]], with training for [[facility staff]] on [[dates]].'],
        ['O&M manual; training records.'], 'Status: [[met / pending]].', ['Confirm points and mandatory status in the GRIHA v2019 manual.']),
    ] },
    { title: 'Section 11: Innovation', credits: [
      c('Cr 30', 'Innovation', '5 points', 'Reward measures beyond the rating requirements.',
        ['Innovation measures: [[name and quantified benefit for each]].'], ['Narrative and calculations for each measure.'], 'The project targets [[points]] of 5 bonus points.'),
    ] },
  ],
};

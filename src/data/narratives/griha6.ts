/**
 * GRIHA Version 6 narrative templates (new construction). Criterion names, points and appraisal types follow the
 * GRIHA Version 6 manual (V1.1), "List of Criteria", and the official V6 self-evaluation checklist (see official.ts).
 * Intents are from the V6 manual. Appraisal thresholds are fill-ins: confirm them in the manual for the typology.
 * Main changes from v2019: Cr 9 and Cr 29 are mandatory (0 points); IAQ is 7 points; the LCA criterion moves to
 * Cr 21 under "Life Cycle Assessment and Costing" with LCC at 3 points; Positive Social Impact is 2 points;
 * Project Commissioning is 4 points and Smart Metering 6.
 */
import type { NRating, NCredit } from '../../utils/narrative';

const c = (id: string, name: string, pts: string, type: string, intent: string, approach: string[], evidence: string[], preempt: string[] = []): NCredit =>
  ({ id, name, pts, tab: 'Project facts', intent, approach, evidence,
    result: pts === 'Mandatory' ? 'Mandatory: [[met / pending]].' : `The project targets [[points]] of ${pts}.`,
    preempt: [`Appraisal type (GRIHA V6): ${type}.`, ...preempt] });
const P = '{{Proj_Name|@}}';
const PM = 'Partly mandatory', OPT = 'Optional';

export const GRIHA_V6: NRating = {
  family: 'GRIHA', facts: true,
  title: 'GRIHA Version 6',
  tokens: [['Proj_Name', '@'], ['Proj_City', '@'], ['Proj_RegID', '@'], ['Climate_Zone', '@'], ['Site_Area', '#,##0'], ['BUA_Total', '#,##0'], ['Occupants', '#,##0'], ['Bld_Type', '@'], ['Cert_Level', '@'], ['Total_Points', '0'], ['Proj_Stage', '@']],
  sample: {
    project: 'SAMPLE – Government School Campus (illustrative, not a real project)', sample: true, blank: 0, total: 11,
    totals: { pts: 62, level: '3 Star', mand: 'Mandatory appraisals targeted', stage: 'Design stage' },
    targets: {},
    labels: { Proj_Name: 'Project name', Proj_City: 'City / location', Proj_RegID: 'GRIHA registration number', Climate_Zone: 'Climate zone', Site_Area: 'Site area (m2)', BUA_Total: 'Built-up area (m2)',
      Occupants: 'Design occupancy', Bld_Type: 'Building typology', Cert_Level: 'Target rating', Total_Points: 'Targeted points', Proj_Stage: 'Stage' },
    values: { 'Proj_Name|@': 'SAMPLE – Government School Campus', 'Proj_City|@': 'Jaipur, Rajasthan', 'Proj_RegID|@': 'GRIHA/0000/2026', 'Climate_Zone|@': 'Hot and dry',
      'Site_Area|#,##0': '24,000', 'BUA_Total|#,##0': '18,500', 'Occupants|#,##0': '1,800', 'Bld_Type|@': 'Institutional (school)', 'Cert_Level|@': '3 Star', 'Total_Points|0': '62', 'Proj_Stage|@': 'Design stage' },
  },
  sections: [
    { title: 'Project summary', credits: [
      { id: 'Project', name: 'Project description', pts: '', tab: 'Project facts',
        intent: `${P} (GRIHA registration {{Proj_RegID|@}}) is a {{Bld_Type|@}} project in {{Proj_City|@}}, {{Climate_Zone|@}} climate zone, registered under GRIHA Version 6.`,
        approach: ['Site area {{Site_Area|#,##0}} m2; built-up area {{BUA_Total|#,##0}} m2; design occupancy {{Occupants|#,##0}}.', 'The project targets {{Total_Points|0}} points ({{Cert_Level|@}}).'],
        evidence: ['Area statement and occupancy calculation [[reference]].'], result: 'Use the same areas and occupancy in every criterion.',
        preempt: ['Percentile bands (V6 manual, Table 7): 25–40 1 Star, 41–55 2 Star, 56–70 3 Star, 71–85 4 Star, 86 and more 5 Star. Non-applicable points come off the denominator.'] },
    ] },
    { title: 'Section 1: Sustainable Site Planning', credits: [
      c('Cr 1', 'Green Infrastructure', '5 points', PM, 'Ensure the site follows the master or development plan, protect and plant native vegetation, and give occupants access to amenities and low-emission transport.',
        ['Site plan conforms to [[development plan / master plan]] (mandatory). Existing mature trees: [[number]]; preservation by [[no felling / transplanting / 3:1 compensatory planting]] (mandatory where trees exist).', 'Trees: [[number]] provided, at least one per 80 m2 of site area ({{Site_Area|#,##0}} m2). Amenities: [[five basic amenities and average distance]]. Transport: [[designated parking for green vehicles / NMT facilities / bicycle parking]].'],
        ['Development plan approval; tree survey and landscape plan; amenity map; parking plan.'], ['Keep the tree survey dated before site clearance.']),
      c('Cr 2', 'Low Impact Design Strategies', '5 points', OPT, 'Protect natural site features and work them into the design.',
        ['[[number]] low-impact strategies for the {{Climate_Zone|@}} zone, of which [[number]] are passive: [[orientation, shading, courtyards, thermal mass, natural ventilation, contour retention]] (5 strategies with at least 3 passive for 5 points).'],
        ['Climate analysis; drawings and analysis for each strategy.']),
      c('Cr 3', 'Design to Mitigate UHIE', '2 points', OPT, 'Use design strategies that reduce the urban heat island effect.',
        ['Alternative [[1: predicted hourly temperature reduction / 2: peak air temperature difference]] of [[°C]] against the GRIHA base case, modelled in [[software]], from [[shade, vegetation, high-SRI surfaces, water bodies]].'],
        ['Microclimate simulation report with base case and proposed; site and roof plans.']),
    ] },
    { title: 'Section 2: Construction Management', credits: [
      c('Cr 4', 'Air and Soil Pollution Control', '1 point', PM, 'Minimise air and soil pollution from construction activities.',
        ['At least six measures to control air and soil pollution: [[barricading, sprinkling, covered transport, wheel washing, covered stockpiles, spill control]] (mandatory). Soil erosion channels and sedimentation basins: [[details]].'],
        ['Construction management plan; dated photographs of measures.']),
      c('Cr 5', 'Topsoil Preservation', '1 point', OPT, 'Preserve fertile topsoil and avoid its degradation during construction.',
        ['Topsoil of [[volume]] m3 from the excavated area stripped to [[depth]], stored at [[location]], stabilised and reused for [[landscape areas]].'],
        ['Topsoil management plan; soil test; photographs of storage and reuse.']),
      c('Cr 6', 'Construction Management Practices', '2 points', OPT, 'Adopt good management practices on site during construction.',
        ['Construction waste managed and safely disposed of: [[streams, diversion]]. Water-saving measures during construction: [[at least two strategies, e.g. curing compounds, treated water, metering]].'],
        ['Waste log and receipts; water records; photographs.']),
    ] },
    { title: 'Section 3: Energy Optimisation', credits: [
      c('Cr 7', 'Energy Optimization', '12 points', PM, 'Make the project energy efficient through a better envelope and efficient equipment and lighting.',
        ['Mandatory: [[ECBC / ECSBC]] compliance; EPI below the GRIHA benchmark; BEE star-labelled equipment where applicable.', 'Envelope heat gain [[W/m2]] against the threshold for a {{Bld_Type|@}} building; exterior lighting efficacy; additional EPI reduction of [[percent]]% from the GRIHA benchmark (up to 8 points at 50% or more) in [[software]].'],
        ['Energy simulation report; envelope calculation; equipment schedules and BEE labels.'], ['Use the same built-up area ({{BUA_Total|#,##0}} m2) and operating hours as the area statement.']),
      c('Cr 8', 'Renewable Energy Utilization', '5 points', PM, 'Increase renewable energy use and reduce dependence on conventional fuels.',
        ['Alternative [[1: on-site / on-site and off-site combination / 2: off-site]] renewable energy of [[kWp]] generating [[kWh]]/yr, [[percent]]% of annual energy demand (typology-based thresholds).'],
        ['RE generation calculation (PVsyst / PVWatts); layout; agreements for off-site RE.']),
      c('Cr 9', 'Low ODP and GWP Materials', 'Mandatory', 'Mandatory', 'Use low-GWP, low-ODP materials in insulation, HVAC, refrigeration and fire-fighting systems.',
        ['Insulation: [[type, blowing agent]] with zero ODP. Refrigerants: [[type]] CFC- and HCFC-free. Fire suppression and extinguishers: halon-free.'],
        ['Insulation and HVAC cut sheets; refrigerant schedule; fire system specification.']),
    ] },
    { title: 'Section 4: Occupant Comfort', credits: [
      c('Cr 10', 'Visual Comfort', '4 points', PM, 'Provide daylight and good artificial lighting through active and passive design.',
        ['Mandatory: WWR ≤ 60% with minimum VLT, skylight SRR ≤ 5%, glare limits, and artificial lighting within the recommended illuminance range.', 'Daylight: [[percent]]% of regularly occupied area meets the illuminance or DA requirement, simulated in [[software]] (Alternative [[1 / 2]]).'],
        ['Daylight simulation report with inputs and results by space; glazing schedule; lighting design.'], ['State glazing VLT and surface reflectances used in the model.']),
      c('Cr 11', 'Thermal and Acoustic Comfort', '2 points', PM, 'Keep occupants thermally and acoustically comfortable through standards and design.',
        ['Thermal comfort for [[AC / non-AC / mixed-mode]] spaces per [[NBC 2016 / IMAC]] (mandatory). Acoustics: [[at least two noise mitigation strategies]]; indoor noise within [[NBC limits]].'],
        ['Thermal comfort analysis; acoustic narrative and measurements.']),
      c('Cr 12', 'Maintaining Indoor Air Quality', '7 points', OPT, 'Design and monitor ventilation so indoor air quality meets the relevant standards.',
        ['Outdoor air quality per CPCB NAAQS; ventilation per ASHRAE 62.1-2010 Sections 4–7 for [[spaces]].', 'Continuous monitoring of CO, CO2, temperature and RH at [[AHU / space]] level with digital displays; low-VOC finishes, adhesives and sealants; [[three further IAQ strategies]].'],
        ['Ventilation calculation; monitoring layout and specifications; VOC data sheets.']),
    ] },
    { title: 'Section 5: Water Management', credits: [
      c('Cr 13', 'Water Demand Reduction', '4 points', OPT, 'Reduce building and landscape water demand.',
        ['Building water demand [[percent]]% below the GRIHA base case for {{Occupants|#,##0}} occupants using [[low-flow fixtures and flow rates]]; landscape demand [[percent]]% below base case through [[native species, drip]].'],
        ['Water demand calculation; fixture cut sheets; landscape plan.']),
      c('Cr 14', 'Wastewater Treatment', '2 points', OPT, 'Segregate grey and black water and treat them on site to reduce freshwater use.',
        ['100% of wastewater treated on site by [[STP technology]] of [[KLD]]; grey and black water segregated; treated water reused for [[flushing, landscape, cooling]].'],
        ['STP design and capacity; plumbing schematic; water balance.']),
      c('Cr 15', 'Rainwater Management', '5 points', OPT, 'Manage rainwater to minimise run-off from the project.',
        ['[[percent]]% of post-construction storm-water run-off managed on site through [[recharge pits, storage tanks, permeable surfaces]] of [[volume]] m3.'],
        ['Run-off calculation with rainfall data source; drainage layout; percolation test if recharging.']),
      c('Cr 16', 'Water Quality and Self-Sufficiency', '5 points', PM, 'Assess water quality and quantity and move toward self-sufficiency.',
        ['Water quality meets [[IS 10500 / CPCB]] norms for each use (mandatory). WPI reduction of [[percent]]% from the GRIHA benchmark through [[on-site sources]].'],
        ['Water test reports; WPI calculation; water balance.']),
    ] },
    { title: 'Section 6: Solid Waste Management', credits: [
      c('Cr 17', 'Waste Management – Post Occupancy', '4 points', PM, 'Give occupants the infrastructure to manage solid waste and meet statutory disposal norms.',
        ['Compliance with notified waste rules and multi-coloured segregation bins (mandatory). Dedicated, segregated storage of [[area]] m2 at [[location]]; contractual tie-ups with [[authorised recyclers]].'],
        ['Waste management plan; layout of bins and storage; recycler agreements.']),
      c('Cr 18', 'Organic Waste Treatment', '2 points', OPT, 'Divert organic waste from landfill by treating it, preferably on site.',
        ['Organic waste of [[kg/day]] quantified and treated by [[composter / biogas / off-site tie-up]] of [[capacity]].'],
        ['Waste generation calculation; equipment specification or agreement.']),
    ] },
    { title: 'Section 7: Sustainable Building Materials', credits: [
      c('Cr 19', 'Utilization of Alternative Materials in Building', '5 points', OPT, 'Use alternative materials that conserve resources and divert waste from landfill.',
        ['OPC replaced by [[percent]]% with BIS-recommended waste in [[concrete]]; recycled aggregate [[percent]]%; walling from [[fly ash / AAC / alternative blocks]]; mortar and plaster with [[percent]]% OPC replacement.'],
        ['Material calculation; mix designs; manufacturer certificates and invoices.']),
      c('Cr 20', 'Alternative Materials for External Site Development', '2 points', OPT, 'Replace conventional materials in external works with alternatives.',
        ['[[percent]]% of roads and vehicular pathways and 100% of footpaths and kerbs use [[recycled aggregates, interlocking pavers, C&D waste products]].'],
        ['Site plan with materials; specifications; invoices.']),
    ] },
    { title: 'Section 8: Life Cycle Assessment and Costing', credits: [
      c('Cr 21', 'Reduction in Global Warming Potential through Life Cycle Assessment', '5 points', OPT, 'Choose low-GWP products through a life-cycle assessment of the building.',
        ['LCA of the [[superstructure / building components]] in [[tool]] shows [[percent]]% GWP reduction against the base case for {{BUA_Total|#,##0}} m2 (Alternative [[1 / 2]]).'],
        ['LCA report with base case and proposed, scope, data sources and results.'], ['Use the same scope and data sources for base case and proposed.']),
      c('Cr 22', 'Life Cycle Cost Analysis', '3 points', OPT, 'Show the payback of the combined energy, water and materials strategies.',
        ['GRIHA LCC calculator shows a cumulative payback of [[years]] years [[or ROI-based analysis]] for [[strategies]].'],
        ['LCC calculator output with assumptions; cost data.']),
    ] },
    { title: 'Section 9: Socio-Economic Strategies', credits: [
      c('Cr 23', 'Safety and Sanitation for Construction Workers', '1 point', PM, 'Provide safe, healthy and hygienic conditions for construction workers.',
        ['NBC 2016 requirements for [[safety, sanitation, drinking water, first aid]] for a peak workforce of [[number]] (mandatory). [[Crèche for workers\' children / awareness events]].'],
        ['Labour welfare plan; photographs; contractor declaration.']),
      c('Cr 24', 'Universal Accessibility', '2 points', OPT, 'Make the built environment barrier-free for people with disabilities and older people.',
        ['Accessible parking, ramps, lifts, toilets and signage per [[Harmonised Guidelines 2021]] at [[locations]].'],
        ['Drawings with dimensions; checklist against the guidelines.']),
      c('Cr 25', 'Dedicated Facilities for Service Staff', '2 points', OPT, 'Provide service staff with dedicated rest rooms and toilets.',
        ['Rest room(s) of [[area]] m2 and toilets per NBC 2016 for [[number]] service staff at [[locations]].'],
        ['Floor plans marking facilities; staffing calculation.']),
      c('Cr 26', 'Positive Social Impact', '2 points', PM, 'Promote clean indoor and outdoor air and environmental awareness among occupants and the community.',
        ['Tobacco smoke control measures (mandatory). Measures: [[on-site measure for clean air / awareness programme / community facility]].'],
        ['Narrative with evidence for each measure; no-smoking policy and signage.']),
    ] },
    { title: 'Section 10: Performance Monitoring and Metering', credits: [
      c('Cr 27', 'Project Commissioning', '4 points', PM, 'Confirm electro-mechanical systems are designed and installed to the owner\'s operational requirements.',
        ['Commissioning plan developed and implemented (mandatory) for [[HVAC low side, water systems, electrical, RE]] by [[agency]] on [[dates]].'],
        ['Commissioning plan and report; test records.']),
      c('Cr 28', 'Smart Metering and Monitoring', '6 points', PM, 'Meter and monitor energy and water use to analyse performance.',
        ['Source metering (mandatory); extended metering per Table 28.2c; smart meters tracking energy and water through [[BMS / platform]]; monthly data shared with [[GRIHA Council]].'],
        ['Metering layout; BMS points list; data-sharing commitment.']),
      c('Cr 29', 'Operation and Maintenance Protocol', 'Mandatory', 'Mandatory', 'Set out O&M procedures for building systems and train the staff who run them.',
        ['Core facility group formed; supplier training clauses in contracts; O&M protocol as [[manual / multimedia]] for [[systems]].'],
        ['O&M manual; contract clauses; training records.']),
    ] },
    { title: 'Section 11: Innovation', credits: [
      c('Cr 30', 'Innovation', '5 points', OPT, 'Adopt innovative strategies that raise the project\'s sustainability.',
        ['Innovation measures: [[name and quantified benefit for each]].'], ['Narrative and calculations for each measure.'], ['Innovation points are bonus points: added to the numerator only.']),
    ] },
  ],
};

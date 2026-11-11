/**
 * Official scorecards the narrative templates are checked against (see narrative.test.ts).
 * Each list was read from the publisher's own file, downloaded on 9 Nov 2026:
 *  - LEED v4 / v4.1 BD+C: the USGBC checklist workbooks, "New Construction" sheet.
 *  - LEED v5 BD+C: the USGBC v5 BD+C New Construction scorecard workbook, "BD+C credit category view".
 *  - GRIHA v2019: GRIHA Council, GRIHA V.2019 Volume 1, Table 6 "Rating structure for GRIHA v.2019".
 *  - GRIHA Version 6: GRIHA Council, GRIHA Version 6 manual (V1.1), "List of Criteria", cross-checked with the
 *    official V6 self-evaluation checklist.
 * The four "Regional Priority: Specific Credit" rows on the LEED v4/v4.1 checklists are kept as one 4-point entry.
 * Points are maximum points; 'Required' = prerequisite (LEED) and 'Mandatory' = 0-point mandatory criterion (GRIHA).
 */
export type OfficialItem = [name: string, pts: number | 'Required' | 'Mandatory'];
export interface OfficialScorecard { title: string; publisher: string; document: string; url: string; total: number; levels: string; items: OfficialItem[] }

export const OFFICIAL: Record<string, OfficialScorecard> = {
  leed4bdc: {
    title: 'LEED v4 BD+C: New Construction', publisher: 'USGBC', document: 'LEED v4 for Building Design and Construction checklist (1-page workbook)',
    url: 'https://www.usgbc.org/resources/checklist-leed-v4-building-design-and-construction', total: 110,
    levels: 'Certified 40–49, Silver 50–59, Gold 60–79, Platinum 80–110',
    items: [['Integrative Process', 1], ['LEED for Neighborhood Development Location', 16], ['Storage and Collection of Recyclables', 'Required'], ['Sensitive Land Protection', 1], ['Construction and Demolition Waste Management Planning', 'Required'], ['High Priority Site', 2], ['Building Life-Cycle Impact Reduction', 5], ['Surrounding Density and Diverse Uses', 5], ['Building Product Disclosure and Optimization - Environmental Product Declarations', 2], ['Access to Quality Transit', 5], ['Building Product Disclosure and Optimization - Sourcing of Raw Materials', 2], ['Bicycle Facilities', 1], ['Building Product Disclosure and Optimization - Material Ingredients', 2], ['Reduced Parking Footprint', 1], ['Construction and Demolition Waste Management', 2], ['Green Vehicles', 1], ['Minimum Indoor Air Quality Performance', 'Required'], ['Construction Activity Pollution Prevention', 'Required'], ['Environmental Tobacco Smoke Control', 'Required'], ['Site Assessment', 1], ['Enhanced Indoor Air Quality Strategies', 2], ['Site Development - Protect or Restore Habitat', 2], ['Low-Emitting Materials', 3], ['Open Space', 1], ['Construction Indoor Air Quality Management Plan', 1], ['Rainwater Management', 3], ['Indoor Air Quality Assessment', 2], ['Heat Island Reduction', 2], ['Thermal Comfort', 1], ['Light Pollution Reduction', 1], ['Interior Lighting', 2], ['Daylight', 3], ['Quality Views', 1], ['Outdoor Water Use Reduction', 'Required'], ['Acoustic Performance', 1], ['Indoor Water Use Reduction', 'Required'], ['Building-Level Water Metering', 'Required'], ['Outdoor Water Use Reduction', 2], ['Innovation', 5], ['Indoor Water Use Reduction', 6], ['LEED Accredited Professional', 1], ['Cooling Tower Water Use', 2], ['Water Metering', 1], ['Fundamental Commissioning and Verification', 'Required'], ['Minimum Energy Performance', 'Required'], ['Building-Level Energy Metering', 'Required'], ['Fundamental Refrigerant Management', 'Required'], ['Enhanced Commissioning', 6], ['Optimize Energy Performance', 18], ['Advanced Energy Metering', 1], ['Demand Response', 2], ['Renewable Energy Production', 3], ['Enhanced Refrigerant Management', 1], ['Green Power and Carbon Offsets', 2], ['Regional Priority', 4]],
  },
  leed41bdc: {
    title: 'LEED v4.1 BD+C: New Construction', publisher: 'USGBC', document: 'LEED v4.1 BD+C scorecard workbook',
    url: 'https://www.usgbc.org/resources/leed-v41-bdc-scorecard', total: 110,
    levels: 'Certified 40–49, Silver 50–59, Gold 60–79, Platinum 80–110',
    items: [['Integrative Process', 1], ['LEED for Neighborhood Development Location', 16], ['Storage and Collection of Recyclables', 'Required'], ['Sensitive Land Protection', 1], ['Building Life-Cycle Impact Reduction', 5], ['High Priority Site and Equitable Development', 2], ['Environmental Product Declarations', 2], ['Surrounding Density and Diverse Uses', 5], ['Sourcing of Raw Materials', 2], ['Access to Quality Transit', 5], ['Material Ingredients', 2], ['Bicycle Facilities', 1], ['Construction and Demolition Waste Management', 2], ['Reduced Parking Footprint', 1], ['Electric Vehicles', 1], ['Minimum Indoor Air Quality Performance', 'Required'], ['Environmental Tobacco Smoke Control', 'Required'], ['Construction Activity Pollution Prevention', 'Required'], ['Enhanced Indoor Air Quality Strategies', 2], ['Site Assessment', 1], ['Low-Emitting Materials', 3], ['Protect or Restore Habitat', 2], ['Construction Indoor Air Quality Management Plan', 1], ['Open Space', 1], ['Indoor Air Quality Assessment', 2], ['Rainwater Management', 3], ['Thermal Comfort', 1], ['Heat Island Reduction', 2], ['Interior Lighting', 2], ['Light Pollution Reduction', 1], ['Daylight', 3], ['Quality Views', 1], ['Acoustic Performance', 1], ['Outdoor Water Use Reduction', 'Required'], ['Indoor Water Use Reduction', 'Required'], ['Building-Level Water Metering', 'Required'], ['Innovation', 5], ['Outdoor Water Use Reduction', 2], ['LEED Accredited Professional', 1], ['Indoor Water Use Reduction', 6], ['Optimize Process Water Use', 2], ['Water Metering', 1], ['Fundamental Commissioning and Verification', 'Required'], ['Minimum Energy Performance', 'Required'], ['Building-Level Energy Metering', 'Required'], ['Fundamental Refrigerant Management', 'Required'], ['Enhanced Commissioning', 6], ['Optimize Energy Performance', 18], ['Advanced Energy Metering', 1], ['Grid Harmonization', 2], ['Renewable Energy', 5], ['Enhanced Refrigerant Management', 1], ['Regional Priority', 4]],
  },
  leed5bdc: {
    title: 'LEED v5 BD+C: New Construction', publisher: 'USGBC', document: 'LEED v5 BD+C New Construction project scorecard workbook',
    url: 'https://www.usgbc.org/resources/project-scorecard-leed-v5-building-design-and-construction-new-construction', total: 110,
    levels: 'Certified 40–49, Silver 50–59, Gold 60–79, Platinum 80–110',
    items: [['Climate Resilience Assessment', 'Required'], ['Human Impact Assessment', 'Required'], ['Carbon Assessment', 'Required'], ['Integrative Design Process', 1],
      ['Sensitive Land Protection', 1], ['Equitable Development', 2], ['Compact and Connected Development', 6], ['Transportation Demand Management', 4], ['Electric Vehicles', 2],
      ['Minimize Site Disturbance', 'Required'], ['Biodiverse Habitat', 2], ['Accessible Outdoor Space', 1], ['Rainwater Management', 3], ['Enhanced Resilient Site Design', 2], ['Heat Island Reduction', 2], ['Light Pollution Reduction', 1],
      ['Water Metering and Reporting', 'Required'], ['Minimum Water Efficiency', 'Required'], ['Water Metering and Leak Detection', 1], ['Enhanced Water Efficiency', 8],
      ['Operational Carbon Projection and Decarbonization Plan', 'Required'], ['Minimum Energy Efficiency', 'Required'], ['Fundamental Commissioning', 'Required'], ['Energy Metering and Reporting', 'Required'], ['Fundamental Refrigerant Management', 'Required'],
      ['Electrification', 5], ['Reduce Peak Thermal Loads', 5], ['Enhanced Energy Efficiency', 10], ['Renewable Energy', 5], ['Enhanced Commissioning', 4], ['Grid Interactive', 2], ['Enhanced Refrigerant Management', 2],
      ['Planning for Zero Waste Operations', 'Required'], ['Quantify and Assess Embodied Carbon', 'Required'], ['Building and Materials Reuse', 3], ['Reduce Embodied Carbon', 6], ['Low-Emitting Materials', 2], ['Building Product Selection and Procurement', 5], ['Construction and Demolition Waste Diversion', 2],
      ['Construction Management', 'Required'], ['Fundamental Air Quality', 'Required'], ['No Smoking or Vehicle Idling', 'Required'], ['Enhanced Air Quality', 1], ['Occupant Experience', 7], ['Accessibility and Inclusion', 1], ['Resilient Spaces', 2], ['Air Quality Testing and Monitoring', 2],
      ['Project Priorities', 9], ['LEED AP', 1]],
  },
  griha2019: {
    title: 'GRIHA v2019', publisher: 'GRIHA Council', document: 'GRIHA V.2019 Volume 1, Table 6: Rating structure for GRIHA v.2019',
    url: 'https://www.grihaindia.org/manuals', total: 100,
    levels: '25–40 1 Star, 41–55 2 Star, 56–70 3 Star, 71–85 4 Star, 86 and more 5 Star (percentile)',
    items: [['Green Infrastructure', 5], ['Low Impact Design Strategies', 5], ['Design to Mitigate UHIE', 2], ['Air and Soil Pollution Control', 1], ['Topsoil Preservation', 1], ['Construction Management Practices', 2],
      ['Energy Optimization', 12], ['Renewable Energy Utilization', 5], ['Low ODP and GWP Materials', 1], ['Visual Comfort', 4], ['Thermal and Acoustic Comfort', 2], ['Indoor Air Quality', 6],
      ['Water Demand Reduction', 4], ['Wastewater Treatment', 2], ['Rainwater Management', 5], ['Water Quality and Self-Sufficiency', 5], ['Waste Management – Post Occupancy', 4], ['Organic Waste Treatment', 2],
      ['Utilization of Alternative Materials in Building', 5], ['Reduction in Global Warming Potential through Life Cycle Assessment', 5], ['Alternative Materials for External Site Development', 2], ['Life Cycle Cost Analysis', 5],
      ['Safety and Sanitation for Construction Workers', 1], ['Universal Accessibility', 2], ['Dedicated Facilities for Service Staff', 2], ['Positive Social Impact', 3],
      ['Project Commissioning', 'Mandatory'], ['Smart Metering and Monitoring', 7], ['Operation and Maintenance Protocol', 'Mandatory'], ['Innovation', 5]],
  },
  griha6: {
    title: 'GRIHA Version 6', publisher: 'GRIHA Council', document: 'GRIHA Version 6 manual (V1.1), List of Criteria; GRIHA V6 self-evaluation checklist',
    url: 'https://www.grihaindia.org/griha-rating', total: 100,
    levels: '25–40 1 Star, 41–55 2 Star, 56–70 3 Star, 71–85 4 Star, 86 and more 5 Star (percentile)',
    items: [['Green Infrastructure', 5], ['Low Impact Design Strategies', 5], ['Design to Mitigate UHIE', 2], ['Air and Soil Pollution Control', 1], ['Topsoil Preservation', 1], ['Construction Management Practices', 2],
      ['Energy Optimization', 12], ['Renewable Energy Utilization', 5], ['Low ODP and GWP Materials', 'Mandatory'], ['Visual Comfort', 4], ['Thermal and Acoustic Comfort', 2], ['Maintaining Indoor Air Quality', 7],
      ['Water Demand Reduction', 4], ['Wastewater Treatment', 2], ['Rainwater Management', 5], ['Water Quality and Self-Sufficiency', 5], ['Waste Management – Post Occupancy', 4], ['Organic Waste Treatment', 2],
      ['Utilization of Alternative Materials in Building', 5], ['Alternative Materials for External Site Development', 2], ['Reduction in Global Warming Potential through Life Cycle Assessment', 5], ['Life Cycle Cost Analysis', 3],
      ['Safety and Sanitation for Construction Workers', 1], ['Universal Accessibility', 2], ['Dedicated Facilities for Service Staff', 2], ['Positive Social Impact', 2],
      ['Project Commissioning', 4], ['Smart Metering and Monitoring', 6], ['Operation and Maintenance Protocol', 'Mandatory'], ['Innovation', 5]],
  },
};

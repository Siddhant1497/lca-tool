# Fact-check and legal notes for the script pack

These are the checks behind each refined script in `projects/*/script.md`. Every number that appears on screen is listed here with its source. If a figure changes in a newer report, update the script and re-render.

## Corrections made to the original drafts

| Script | Original claim | Problem | Now says | Source |
|---|---|---|---|---|
| Short 1 | Buildings use "28 percent of the entire world's energy" | 28% is the operational share of global *CO₂* (WorldGBC), not energy | Running buildings uses ~30% of global final energy | IEA Tracking Buildings (2021 data): 30% of final energy consumption |
| Short 1 | "Not cars. Not planes. Buildings." | Fine rhetorically, but the energy comparison wasn't sourced | Removed the direct comparison | n/a |
| Short 1 | "One leaky old unit can do more damage than your car does in a year" | True only if a whole charge escapes, not a typical slow leak | "If a typical home system's full charge escapes … roughly a year of driving" | R-410A GWP 2,088 (IPCC AR4); residential charge ≈ 2.7–5.4 kg → 5.6–11.3 t CO₂e; EPA car ≈ 4.6 t CO₂/yr |
| Short 1 | Heat pump "way more efficient than either a furnace or old-school AC" | Overstated for cooling | "3–4 units of heat per unit of electricity" | IEA, The Future of Heat Pumps: typical COP ≈ 4; field seasonal values ≈ 3 |
| Short 1 | "Pays itself back … usually inside a few years" | Payback varies widely (climate, tariffs, what is replaced) | "Whether it pays back in three years or ten depends on your climate and prices" | n/a (hedged) |
| Short 2 | "I'm LEED Platinum. I generate more energy than I use." | LEED Platinum does not imply net-positive energy | The character only claims its solar covers its use (a fictional building's claim) | n/a |
| Short 2 | "Zero embodied carbon" for the old building | Its embodied carbon exists, it's just already spent | "Zero *new* concrete … my construction carbon was spent decades ago" | n/a |
| Short 2 | "Renovation beats new construction almost every single time" | Overstated; the study itself says reuse benefits depend on materials | "Often wins … not always, it depends on what the retrofit uses" + 10–80 yr payback stat | Preservation Green Lab, *The Greenest Building* (2011) |
| Short 5 | Cement + steel ≈ "18 percent of all global emissions" | Not supported; IEA puts steel ≈ 8% and cement ≈ 7% | "Around 15 percent" | IEA report for the 2022 G7 presidency |
| Short 5 | "More than every plane on Earth" | True, now quantified | "Roughly seven times … aviation is about two percent" | ATAG Fact Sheet 2: ≈2% of CO₂ (882 Mt, 2023) |
| Short 6 | "If the Earth left a Google review" | Trademark: using Google's name and review UI could imply affiliation | "Online reviews" with a generic card, plus a fictional-buildings disclaimer | n/a |
| Short 6 | "Riverside EDGE-certified housing block" | Attributes a real certification to a fictional building | "Riverside housing block" | n/a |
| Short 7 | "The buildings actually doing this properly publish both numbers" | Absolute claim | "The most credible projects report both, ideally as whole-life carbon" | EN 15978; WorldGBC |
| Long-form 1 | EDGE "may be certifying more floor area … than any system" | Unverifiable comparison | ">100 million m² certified (reported 2025)" | IFC / ConstructAfrica (2025); IFC (2023): 65M m², 96 countries |
| Long-form 1 | "GRIHA … means almost nothing to an international investor" | Disparaging toward a named body | "Carries much less weight with an international investor" | n/a |
| Long-form 1 | "a prestigious plaque nobody ever double-checked" | Implies a named system skips verification | Neutral: EDGE requires a third-party site audit; other systems' site checks vary by system and credit | EDGE Certification Protocol; GBCI certification agreement (discretionary site visits) |
| Long-form 2 | [YOUR DETAIL] slots | Needed real details | Generic, clearly marked `[GENERIC]` examples in the script file; the description says they're composites | n/a |

## Figures kept, with their sources

- **37% of global CO₂** (net-zero video): UNEP/GlobalABC *Global Status Report for Buildings and Construction 2025–2026* (published 19 May 2026).
- **10–80 years**: Preservation Green Lab, *The Greenest Building* (2011); most building types take 20–30 years.
- **EDGE ≥20%** savings in energy, water and embodied energy in materials versus a local baseline. EDGE Advanced is ≥40% energy; check the current protocol before quoting tiers.
- **LEED in 150+ countries and territories**: USGBC (2015). The "180+" figure that circulates could not be verified, so it isn't used.
- **GRIHA**: developed by TERI and adopted by MNRE as India's national rating system; mandatory for many central government and PSU buildings.
- **IGBC**: part of the Confederation of Indian Industry (CII). Its founding year was not verified, so no year is stated.
- **Embodied carbon ≈ 11% of global emissions**: WorldGBC, *Bringing Embodied Carbon Upfront* (2019). Used in descriptions only.

## Legal and platform notes

1. **Trademarks.** LEED, EDGE, IGBC and GRIHA appear only as names, never as logos, which is nominative use. Every description includes a "not affiliated with or endorsed by" line. Don't add their logos or plaque photos showing logos.
2. **Fictional content.** The Short 2 and Short 6 buildings and reviews are fictional and labelled as such in the descriptions. No real building, developer or review platform is named.
3. **Opinions.** The street-food rankings and "not cheap, not quick" are framed as opinion. The descriptions say "Comparisons are personal opinion."
4. **First-person claims.** Short 3 and Long-form 2 narrate as you ("I audit green buildings for a living"). They're accurate only because you do this work. If you share the videos under a different identity, change the wording.
5. **AI narration.** The voice is synthetic but doesn't imitate any real person. YouTube's altered-content label isn't required for a synthetic narrator, but the descriptions say "Narration is AI-generated" for transparency.
6. **Photo licences.** New photos are limited to CC0, public domain and CC BY. CC BY-SA is excluded because the pipeline crops and colour-grades photos, and an edited CC BY-SA image may count as an adaptation that triggers its ShareAlike terms. CC BY requires attribution, so paste `out/<slug>/credits.txt` into each video description. Some earlier net-zero photos are CC BY-SA, and those are flagged in that video's credits.
7. **Client confidentiality.** No client, project or location names appear anywhere. Keep it that way when you replace the `[GENERIC]` examples.

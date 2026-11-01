# Sustainability Command Center – build map

What was built, how the 7 dashboard prompts map to it, and what is still sample/placeholder.

## Prompt → feature map

| # | Prompt idea | Where it lives |
|---|---|---|
| 1 | Dashboard blueprint | `CommandCenter.tsx`: 6 KPIs → 2×2 charts → certification table |
| 2 | Animated charts | Recharts staggered entrance (900 ms), `CountUp` on KPIs, responsive containers, reduced-motion respected |
| 3 | Dark mode | `[data-theme="dark"]` token set in `index.css`, toggle in header, persisted, follows OS on first visit, no flash |
| 4 | Collapsible sidebar | `Sidebar.tsx` + `UiContext`: 230 → 64 px, icons stay fixed (no jump), `[` shortcut, `aria-expanded`, persisted, auto-collapses < 900 px |
| 5 | Empty states | `EmptyState.tsx`: first-run (import CSV / sample), no levers, no projects, no category scorecard |
| 6 | Loading skeletons | `Skeleton.tsx`: layout-matched shimmer shown while the lazy-loaded page chunk loads |
| 7 | Master map | This file |

## What the dashboard computes (real logic, not decoration)

- **GHG by scope** from a yearly CSV (`year,scope1,scope2,scope3`, tCO₂e). First row = base year.
- **Pathway**: linear absolute contraction of base-year Scope 1+2. Default 4.2 %/yr (SBTi 1.5 °C-aligned for Scope 1+2); target year and rate are editable.
- **Gap & lever coverage**: required cut from latest year to the target-year pathway value vs. abatement from levers that are *not yet implemented* (implemented levers are already in the actuals, so counting them would double-count).
- **Certification status**: secured vs. likely vs. target score; "at risk" = secured + likely < target.

## Data Manager (v2)

| Tab | What it does |
|---|---|
| GHG inventory | Add/edit/delete years with validation; Scope 2 location- **and** market-based (dual reporting). CSV import accepts an optional `scope2_market` column. |
| Certifications | Project form with validation; optional category scorecard that rolls up totals. One-click LEED v4/v4.1 BD+C template (110 pts, category maxima only, so you still enter your own points). |
| Levers | Add/edit/delete; open Scope 1+2 total shown (implemented levers excluded from the gap). |
| Activity calculator | User-built emission-factor library (every factor must cite a source; **none are prefilled**), activity entries → tCO₂e, per-year roll-up, "Apply to inventory" that overwrites only the scopes the activities cover. |
| Export & backup | CSV per dataset (activities export includes factor + source for audit trail), JSON backup/restore, clear-all. |

The Command Center has a Scope 2 location/market toggle, print-to-PDF styles, a "needs attention" list, and partial-data handling: each section shows its own empty state when the data for it is missing.

## Honest limits

- **Sample data is fictional**, and its score thresholds (IGBC, GRIHA, WELL, Fitwel, EDGE) are placeholders. Take real thresholds from the current rating-system guide.
- **No built-in emission factors.** This is deliberate: you add each factor with its source, so every number can be traced. A curated, cited default set can be added once each value is confirmed.
- Scope 3 is one number per year; there is no 15-category breakdown yet.
- Data lives in browser `localStorage`, so use the JSON backup to keep it safe or to move between machines.

## v3 additions

- **Scope 3 by category.** All 15 GHG Protocol categories in the inventory form, a hotspot chart on the dashboard, and category-tagged emission factors so the calculator fills the split. Building-LCA A1–A3 can be added to Cat 2 with one click.
- **Intensity.** Denominators per year (m², FTE, turnover) with a metric switcher, plus the BRSR per-rupee figure for ₹ units.
- **Levers.** Delivery year drives a stepped "with dated levers" projection on the pathway. Cost per tonne drives a custom-SVG MACC.
- **Disclosures page.** GHG Protocol, GRI 305, BRSR P6 and IFRS S2 tables with comparatives, readiness scores and copy-as-table.
- **Excel workbook.** 9 formatted sheets with numeric cells (not text), lazy-loaded so it costs nothing until used.
- **Quality.** Command palette (Ctrl/⌘+K), scroll reset between pages, vendor chunking, and 18 unit tests on the calculation logic (`npm test`).

## Suggested next steps

1. Curated emission-factor packs (e.g. India CEA grid baseline, fuel factors), each value cited and confirmed before it ships.
2. Gas-by-gas Scope 1 split (CO₂, CH₄, N₂O, HFCs…) for BRSR E7 and GRI 305-1.
3. Multi-site inventory (per-building rows rolled up into the organisation).
4. Project-level LCA results feeding certification credits (LEED MRc Building Life-Cycle Impact Reduction).
5. Optional cloud sync / team sharing.

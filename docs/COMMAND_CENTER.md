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

## Suggested next steps

1. Scope 3 category breakdown (GHG Protocol 15 categories) + feed building-LCA embodied carbon into Cat. 1/2.
2. Intensity metrics (tCO₂e per m², per employee, per ₹ revenue) for BRSR / GRESB style reporting.
3. Curated emission-factor packs (e.g. national grid baseline, fuel factors), each value cited and confirmed before inclusion.
4. BRSR / CDP / GRI / ISSB data-point checklist driven off the same inventory.
5. XLSX export with formatted sheets.

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

## Honest limits

- **Sample data is fictional**, and its score thresholds (IGBC, GRIHA, WELL, Fitwel, EDGE) are placeholders. Take real thresholds from the current rating-system guide before using them in a client deliverable.
- **No emission-factor engine yet.** You import tCO₂e totals; nothing converts activity data (kWh, litres, km, spend) to emissions. Scope 2 is a single number – dual reporting (location- and market-based) is the obvious next addition.
- **Certification projects and levers are sample-only** – there is no editor yet, so importing a CSV clears them. Data lives in browser `localStorage` only.
- The LCA pages (embodied carbon, EN 15978, LEED MRc1) are unchanged; the Command Center only echoes the embodied-carbon intensity in its subtitle.

## Suggested next steps (in value order)

1. Project / lever editor forms (add, edit, delete) + export to CSV/XLSX.
2. Activity-data → emissions calculator with a versioned, source-cited emission-factor table (confirm every factor and boundary with the user).
3. Scope 2 dual reporting; Scope 3 category breakdown (GHG Protocol 15 categories).
4. Feed LCA embodied carbon into Scope 3 Cat. 1/2 and a per-project carbon budget.
5. BRSR / CDP / GRI / ISSB data-point checklist driven off the same inventory.

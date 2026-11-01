# SustainHub

One workspace for a sustainability consultant's core numbers: **GHG inventory, decarbonisation pathway, certification portfolio, reporting disclosures and building LCA**. It runs in the browser and needs no backend. Data stays on your machine.

![Command Center](docs/screenshots/command-center-light.png)

## What's inside

| Area | What it does |
|---|---|
| **Command Center** | KPIs with sparklines, Scope 1+2 against a linear 1.5 °C-aligned pathway with a "with dated levers" projection, scope split, inventory trend, Scope 3 hotspots by GHG Protocol category, MACC, intensity trends (per m², per FTE, per turnover), LEED category scorecard, certification pipeline with a "needs attention" list, and the full portfolio table. Location/market Scope 2 toggle. |
| **Data Manager** | Validated editors for inventory years (Scope 2 dual reporting, 15 Scope 3 categories, intensity denominators), certification projects (LEED, IGBC, GRIHA, EDGE, WELL, Fitwel; category scorecards with a LEED v4/v4.1 BD+C template), levers (delivery year, cost per tonne), and an **activity calculator** with your own source-cited emission-factor library. |
| **Disclosures** | Report-ready tables for **GHG Protocol, GRI 305, BRSR Principle 6 and IFRS S2**, with previous-year comparatives and an Available / Partial / Missing status on every line. Copy any table straight into Excel or Word. |
| **Exports** | Formatted multi-sheet **Excel workbook** (Summary, Inventory, Scope 3, Intensity, Disclosures, Certifications, Levers, Factors, Activities), CSVs, JSON backup/restore, print-to-PDF styles. |
| **Building LCA** | Material inventory against EPD data, EN 15978 stages A–D, LEED v4/v4.1 MRc1, BREEAM Mat 01 and ISO 14044 checks. The A1–A3 result can be added to Scope 3 Category 2 (capital goods) with one click. |

Plus: dark mode, a collapsible sidebar (`[`), a **Ctrl/⌘ + K** command palette, skeleton loading, empty states on every panel, a mobile layout, and reduced-motion support.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests for the calculation logic
npm run build      # production build in dist/
```

## Method notes

- **Pathway.** Linear absolute contraction of base-year Scope 1+2, by default 4.2 %/yr (the SBTi 1.5 °C rate for Scope 1+2). The rate and target year are editable. The base year is the earliest inventory year.
- **Gap coverage.** Only levers that are **not yet implemented** count against the remaining gap, because implemented ones are already in the actuals. The projection line steps down in each lever's delivery year, and levers without a year are listed rather than guessed.
- **MACC.** Open levers with a cost, cheapest first. Bar width is tCO₂e/yr and height is cost per tonne, with negative values for net savings.
- **Scope 2.** Location- and market-based figures are stored separately. Years without a market-based figure are flagged when you switch to market-based, rather than silently mixed.
- **Intensity.** Scope 1+2 per m² (kgCO₂e), per FTE and per turnover. BRSR's per-rupee figure appears when turnover is in a ₹ unit.
- **Emission factors.** None are built in. Each factor you add must cite its source, and the activities export carries the factor and source for the audit trail.

## Honest limits

- The sample portfolio is fictional, and its certification thresholds are placeholders.
- Disclosure references map your data to each framework; check them against the version you report under. This is not an assurance review.
- Data is stored in browser `localStorage`, so use **Export & backup → Download backup** regularly.

See [`docs/COMMAND_CENTER.md`](docs/COMMAND_CENTER.md) for the design notes and roadmap.

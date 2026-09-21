---
name: Number display formatting
description: How displayed numbers are formatted app-wide (thousands separators) and which raw toFixed sites must NOT be grouped.
---

# Number display formatting

Displayed numbers across the app must use Latin/English digits and thousands separators (e.g. `1,000`).

Decimal values show 0–2 fractional digits: omit the decimal point for whole numbers, strip trailing zeros, and retain up to two meaningful decimal places.

The canonical display formatters all apply grouping via `toLocaleString("en-US", ...)`:
- `formatNumber` / `formatNumberWithCommas` in `client/src/lib/formatNumber.ts` (max 2 decimals, trailing zeros stripped).
- `formatNumberAr(value, decimals)` in `shared/number-utils.ts` — keeps EXACTLY `decimals` places **and** groups. This is the preferred replacement for a display `EXPR.toFixed(n)` because it preserves fixed precision. Pass `Number(EXPR)` if the source is a DB decimal string; it safely returns `"0"` for non-finite input.

**Why:** the user explicitly confirmed app-wide English numerals and a maximum of two decimals, shown only when the value has a fractional part. Central helpers prevent inconsistent screens.

**How to apply / do NOT group these `toFixed` sites** (leave as-is):
- CSS/style values (width/height/left/top/transform/progress-bar widths).
- GPS coordinates (lat/lng/latitude/longitude) — commas corrupt them.
- Values not rendered as visible text: object-literal values, API request bodies, setState payloads, anything assigned to a key/variable.
- Percentages, hours, per-unit/gram weights, thickness (micron), dimensions (cm), small ratios — grouping is invisible/meaningless.
- Three.js / 3D scene positions.

**Gotcha:** never re-parse a formatter's output with `parseFloat`/`Number` — grouped output contains commas, so `parseFloat("1,234.5")` returns `1`. `formatNumberWithCommas` used to do this and was fixed to parse the raw value.

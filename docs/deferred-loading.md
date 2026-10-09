# Initial-load size and regression checks

Measured with the same `npm run build` command before and after deferring
feature imports. Sizes below use Vite's decimal kB reporting.

| Initial asset | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Main JavaScript | 803.86 kB | 493.21 kB | 38.6% |
| Main JavaScript, gzip | 233.21 kB | 151.41 kB | 35.1% |
| Initial CSS | 139.11 kB | 33.55 kB | 75.9% |
| Initial CSS, gzip | 27.33 kB | 8.00 kB | 70.7% |

This measures asset size, not elapsed page-load time on a particular device.
The initial JS + CSS transfer after gzip is 159.41 kB instead of 260.54 kB
(38.8% less). Feature chunks still download when their corresponding pages
or dialogs are opened.

## Behavior and constraints

- Personal dashboard, HR, factory production, print views, order controls,
  and customer/order/product dialogs are deferred.
- Excel (`xlsx`) and PDF (`html2canvas` + `jspdf`) already used dynamic imports
  in the attendance report. They remain behind their export actions; exporter
  behavior was not replaced.
- SheetJS remains 500.06 kB (161.71 kB gzip). The build still warns about that
  **on-demand** chunk. The main entry is now below 500 kB. No warning threshold,
  dependency, or build configuration was changed to hide the warning.
- Suspense supplies translated loading feedback. A failed chunk displays an
  explicit error and a reload action, clearing React.lazy's rejected import
  cache. Navigation and print permission checks remain unchanged.

## Verification

```sh
npm run build
npm run check
npm run i18n:check
node scripts/check-deferred-loading.cjs
```

The deferred-loading script serves the **production build** from a disposable
HTTP server with synthetic API responses. It never connects to the application
database or signs in to a real account. It verifies Arabic/English navigation,
initial network isolation, lazy loading feedback, real XLSX downloads and
values, PDF export, attendance print HTML, private/public order printing,
read-only/forbidden print permissions, and chunk-failure recovery.

Existing browser regression suites also passed against the running development
workflow, with every application API intercepted:

```sh
node scripts/check-language-flags.cjs   # 172 checks
node scripts/check-order-actions.cjs   # 442 checks, including paginated PDFs
```

These existing scripts write fixture screenshots/PDFs under `screenshots/`;
do not include regenerated binaries as source changes. The normal unsigned
preview was also checked visually. Signed-in behavior was verified using the
isolated browser fixtures, not a real user session.

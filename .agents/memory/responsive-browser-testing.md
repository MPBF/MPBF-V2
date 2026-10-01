---
name: Responsive browser focus testing
description: Avoid false failures when checking focus-dependent controls in multiple responsive iframes.
---

Run focus-dependent interaction checks sequentially across responsive iframe viewports, not concurrently.

**Why:** Iframes share the browser's active focus. Focusing a combobox in one frame can blur and close a dropdown in another, producing false failures even though each viewport works on its own.

**How to apply:** Finish one frame's search, keyboard, selection, and blur checks before starting the next. Hidden or transparent frames still compete for focus.

HTML intercepted for isolated React component tests must receive the Vite React refresh preamble when it imports modules from the development server.

**Why:** Intercepting the HTML bypasses Vite's HTML transformation, while its module transformation still expects the refresh globals. The resulting preamble error is a test-host failure, not a broken component.

**How to apply:** Prefer the server's transformed HTML; if replacing the document through a browser route, supply the refresh preamble and check page errors before interpreting missing controls as product failures.
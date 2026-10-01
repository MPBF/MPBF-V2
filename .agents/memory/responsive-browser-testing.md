---
name: Responsive browser focus testing
description: Avoid false failures when checking focus-dependent controls in multiple responsive iframes.
---

Run focus-dependent interaction checks sequentially across responsive iframe viewports, not concurrently.

**Why:** Iframes share the browser's active focus. Focusing a combobox in one frame can blur and close a dropdown in another, producing false failures even though each viewport works on its own.

**How to apply:** Finish one frame's search, keyboard, selection, and blur checks before starting the next. Hidden or transparent frames still compete for focus.
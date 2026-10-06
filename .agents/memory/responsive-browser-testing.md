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

Locate equivalent responsive actions by their accessible name and visibility, not by assuming they all have the same naming attribute.

**Why:** Desktop icon actions can use an accessible label/title while mobile actions use visible text. Attribute-only selectors falsely report missing mobile edit actions.

**How to apply:** Use accessible-name locators where available; otherwise account for visible text as well as accessible labels and titles.

Wait for the new document and its page-specific content after full navigation.
Do not treat an unchanged shared container selector as proof of navigation.

**Why:** navigation can return while the previous page still has matching
containers. Tests can falsely pass layout checks or inspect stale permissions.

**How to apply:** synchronize navigation before assertions; expand collapsed
details before asserting that their contents are visibly displayed.

For CDP checks of native Enter activation, bring the target page to the front
and send the carriage-return text with the key event.

**Why:** a synthetic key name and virtual key code alone produced a false
failure for a working native summary disclosure; focused-page events with
carriage-return text passed.

**How to apply:** focus the summary after activating its page, then send Enter
keydown with `text: "\r"` and its corresponding keyup before checking `open`.

Wait for Chromium to exit before removing its temporary profile.

**Why:** Chromium can continue writing its profile after receiving termination,
making successful browser checks fail during cleanup with ENOTEMPTY.

**How to apply:** synchronize child-process exit before profile cleanup and
allow bounded retries for remaining filesystem activity.
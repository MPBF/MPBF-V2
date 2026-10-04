---
name: Recovery contract testing
description: Avoid permissive write fixtures and verify draft lifecycle after uncertain saves.
---

Queue fixtures must enforce the server's expected **current** positions, not
merely return success. Verify captured UI-generated positions against the real
server contract in a disposable schema.

Recovered-write tests must simulate a committed operation whose response is
lost, verify the same operation key and one committed result, and check that
success clears the submitted draft while preserving later edits and other drafts.

**Why:** permissive write fixtures concealed reversed queue positions, and
checking UUID reuse alone missed populated forms that could submit duplicates
after a successful retry.

**How to apply:** use an idempotent fixture ledger and transport interruption
after commitment. Exercise both initial submission and retry through the same
success lifecycle, including film, receipts and location forms.
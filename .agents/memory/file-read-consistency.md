---
name: File read consistency
description: Verify conflicting file-reader and shell observations before using review references.
---

If a file-reading tool disagrees with the current shell filesystem, verify the source directly in the shell before citing lines or applying changes.

**Why:** During a review, file-reader responses contained older source while shell reads and Git showed the current version. Trusting those responses would have invalidated otherwise correct findings.

**How to apply:** Use narrowly scoped shell reads and searches to confirm the relevant code whenever file lengths or cited lines unexpectedly disagree. Do not infer that another agent edited the app solely from conflicting reader output.
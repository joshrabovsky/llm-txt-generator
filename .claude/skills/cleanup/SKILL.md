---
name: cleanup
description: Audit the repo for unused files, imports, exports, and dependencies. Report findings and confirm before deleting anything.
disable-model-invocation: true
allowed-tools: Bash, Read, Glob, Grep
context: fork
---

Audit the repository for unused code and dependencies. This is a two-phase skill — report first, delete nothing until confirmed.

## Phase 1: Audit

Run the following checks and compile a full report:

1. **Unused dependencies** — `npx knip --reporter json` to find unused packages in package.json
2. **Unused files** — files that are never imported anywhere in the project
3. **Unused exports** — functions/types exported but never imported
4. **Unused imports** — `npm run lint -- --rule '{no-unused-vars: error}'` to catch unused variables and imports

Compile findings into a clear report grouped by category:

```
## Unused Dependencies
- lodash (in package.json, never imported)

## Unused Files
- lib/utils/old-helper.ts (never imported)

## Unused Exports
- lib/crawler/index.ts: export `parseLinks` (never used)

## Unused Imports
- app/page.tsx:3 — import { useState } (never used)
```

## Phase 2: Confirm & Clean

After presenting the report:
1. Ask the user which categories or specific items they want removed
2. Wait for explicit confirmation before deleting or modifying anything
3. Remove only what was confirmed
4. Run `npm run type-check` after cleanup to verify nothing broke
5. Report what was removed

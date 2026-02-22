---
name: deploy
description: Run all checks, commit, push branch, and open a PR for review
disable-model-invocation: true
allowed-tools: Bash
---

Run all checks then create a PR. Stop immediately if any step fails — report the error clearly and do not proceed.

Note: Direct pushes to main are protected. All changes must go through a PR that passes CI.

Steps:
1. `npm run type-check` — fail fast on TypeScript errors
2. `npm run lint` — fail fast on lint errors
3. `npm run build` — verify production build succeeds
4. `git add -A && git status` — show what's being committed
5. `git diff --cached --stat` — summarize changes
6. `git commit -m "<auto-summary of changes>"` — commit with a descriptive message (only if there are staged changes)
7. `git push origin HEAD` — push current branch to GitHub
8. `gh pr create --title "<title>" --body "<summary>" --base main` — open a PR targeting main

Report the PR URL on success.

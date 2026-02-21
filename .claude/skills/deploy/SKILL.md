---
name: deploy
description: Run all checks and deploy to production via git push
disable-model-invocation: true
allowed-tools: Bash
---

Run all checks then deploy. Stop immediately if any step fails — report the error clearly and do not proceed.

Steps:
1. `npm run type-check` — fail fast on TypeScript errors
2. `npm run lint` — fail fast on lint errors
3. `npm run build` — verify production build succeeds
4. `git add -A && git status` — show what's being committed
5. `git diff --cached --stat` — summarize changes
6. `git commit -m "deploy: <auto-summary of changes>"` — commit with a descriptive message (only if there are staged changes)
7. `git push` — push to GitHub, which triggers Vercel auto-deploy

Report the GitHub push confirmation and remind the user that Vercel will auto-deploy within ~30 seconds.

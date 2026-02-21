---
name: deploy
description: Build and deploy the application to production
disable-model-invocation: true
allowed-tools: Bash
---

Build and deploy the application to production. Stop immediately if any step fails.

Steps:
1. `npm run type-check` — fail fast on TypeScript errors
2. `npm run lint` — fail fast on lint errors
3. `npm run build` — create production build
4. `vercel --prod` — deploy to Vercel

Report the live deployment URL on success. Do not proceed to the next step if any step fails — report the error clearly and stop.

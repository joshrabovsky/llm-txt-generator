# TODO

## Setup
- [x] Scaffold Next.js project (TypeScript, Tailwind, App Router)
- [x] Install cheerio

## Backend
- [x] `lib/types.ts` — shared types
- [x] `lib/crawler/fetcher.ts` — fetchHtml()
- [x] `lib/crawler/parser.ts` — parsePageData() + extractLinks()
- [x] `lib/crawler/sitemap.ts` — fetchSitemapUrls()
- [x] `lib/crawler/index.ts` — crawlWebsite() orchestrator
- [x] `lib/generator/index.ts` — generateLlmsTxt()
- [x] `app/api/generate/route.ts` — streaming POST endpoint

## Frontend
- [x] `app/page.tsx` — URL input form + live progress + output display

## Docs
- [x] `ARCHITECTURE.md`
- [x] `TODO.md`
- [ ] `README.md` — setup and deployment instructions

## Deployment
- [x] Initialize GitHub repo (https://github.com/joshrabovsky/llm-txt-generator)
- [x] Deploy to Vercel (https://llms-txt-generator-hkea52aix-joshrabovskys-projects.vercel.app)
- [ ] Add collaborators to GitHub repo (chazzhou, allapk19, sherman-grewal, joshuaprunty, nuarmstrong, rahibk, joeydotdev, kirk-xuhj, bgaleotti, fedeya)

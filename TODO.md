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

## Enhancements
- [ ] Side-by-side UI: deterministic crawl output vs LLM-generated llms.txt
- [ ] Show existing llms.txt if one already exists at the target domain
- [ ] Fix sitemap index bug: Google-style sitemap indexes point to child sitemaps (XML), not HTML pages — we're trying to crawl them as pages

## Testing
- [ ] Unit tests for lib/crawler/fetcher.ts
- [ ] Unit tests for lib/crawler/parser.ts
- [ ] Unit tests for lib/crawler/sitemap.ts
- [ ] Unit tests for lib/generator/index.ts
- [ ] Integration test for POST /api/generate route
- [ ] Choose test framework (Vitest vs Jest)

## Docs
- [x] `ARCHITECTURE.md`
- [x] `TODO.md`
- [x] `README.md` — setup and deployment instructions

## Deployment
- [x] Initialize GitHub repo (https://github.com/joshrabovsky/llm-txt-generator)
- [x] Deploy to Vercel (https://llms-txt-generator-two.vercel.app)
- [ ] Add collaborators to GitHub repo (chazzhou, allapk19, sherman-grewal, joshuaprunty, nuarmstrong, rahibk, joeydotdev, kirk-xuhj, bgaleotti, fedeya)

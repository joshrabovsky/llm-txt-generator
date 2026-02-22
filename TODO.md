# TODO

## Setup
- [x] Scaffold Next.js project (TypeScript, Tailwind, App Router)
- [x] Install cheerio

## Backend
- [x] `lib/types.ts` — shared types + EventType as const
- [x] `lib/crawler/fetcher.ts` — fetchHtml() with typed FetchResult
- [x] `lib/crawler/parser.ts` — parsePageData() + extractLinks()
- [x] `lib/crawler/sitemap.ts` — fetchSitemapUrls() with sitemap index support
- [x] `lib/crawler/index.ts` — crawlWebsite() orchestrator
- [x] `lib/crawler/llmstxt.ts` — fetchExistingLlmsTxt()
- [x] `lib/generator/index.ts` — generateLlmsTxt()
- [x] `app/api/v1/llms-txt/generate/route.ts` — streaming deterministic POST
- [x] `app/api/v1/llms-txt/generate-aeo/route.ts` — streaming Gemini POST
- [x] `app/api/v1/llms-txt/existing/route.ts` — GET existing llms.txt (server-side)

## Frontend
- [x] `app/page.tsx` — URL input, three tabs (Deterministic, AI Optimized, Existing)
- [x] Live crawl progress stream with skip events
- [x] Toast notification for invalid URLs
- [x] URL normalization (auto-prepend https://)
- [x] Copy + Download per tab
- [x] Profound favicon

## Enhancements
- [x] AI Optimized tab (Gemini AEO generation)
- [x] Existing llms.txt tab
- [x] Sitemap index support (fetch child sitemaps, 5 pages per child)
- [ ] Card title inside AI Optimized tab still says "AI-Enhanced llms.txt" — update to "AI Optimized llms.txt"

## Testing
- [ ] Choose test framework (Vitest vs Jest)
- [ ] Unit tests for lib/crawler/fetcher.ts
- [ ] Unit tests for lib/crawler/parser.ts
- [ ] Unit tests for lib/crawler/sitemap.ts
- [ ] Unit tests for lib/generator/index.ts
- [ ] Integration test for POST /api/v1/llms-txt/generate

## Docs
- [x] `ARCHITECTURE.md`
- [x] `TODO.md`
- [x] `README.md`
- [ ] Update ARCHITECTURE.md to reflect new routes and three-tab UI

## Deployment
- [x] Initialize GitHub repo (https://github.com/joshrabovsky/llm-txt-generator)
- [x] Deploy to Vercel (https://llms-txt-generator-two.vercel.app)
- [ ] Add collaborators to GitHub repo (chazzhou, allapk19, sherman-grewal, joshuaprunty, nuarmstrong, rahibk, joeydotdev, kirk-xuhj, bgaleotti, fedeya)
- [ ] Screenshots or demo video for submission

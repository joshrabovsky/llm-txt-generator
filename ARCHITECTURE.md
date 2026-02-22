# Architecture: llms.txt Generator

## Overview

A Next.js web application where a user inputs a website URL and receives a generated `llms.txt` file conforming to the [llmstxt.org](https://llmstxt.org) spec. The crawl runs server-side to bypass CORS restrictions, and progress is streamed live to the browser as each page is processed. Three output tabs are provided: Deterministic, AI Optimized (Gemini AEO), and Existing.

---

## Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR + API routes in one project — no CORS |
| Language | TypeScript | Type safety across lib and API boundary |
| HTML Parsing | cheerio | Lightweight server-side jQuery-like parser |
| AI Generation | Google Gemini (`gemini-3-flash-preview`) | Free tier, streaming support, AEO optimization |
| Styling | Tailwind CSS + shadcn/ui | Utility-first styling; shadcn copies components into the codebase (no runtime overhead) |
| Testing | Vitest | Zero-config TypeScript test runner, 36 tests |
| CI | GitHub Actions | Type-check + lint + test on every push to main |
| Deployment | Vercel | Native Next.js platform, free tier, auto-deploy on push |

---

## Directory Structure

```
lib/                              # Pure business logic — zero Next.js dependencies
  types.ts                        # Shared types + EventType as const
  crawler/
    fetcher.ts                    # fetchHtml() — HTTP fetch with timeout + typed FetchResult
    parser.ts                     # parsePageData() + extractLinks() via cheerio
    sitemap.ts                    # fetchSitemapUrls() — standard sitemap + sitemap index support
    llmstxt.ts                    # fetchExistingLlmsTxt() — fetches /llms.txt from domain
    index.ts                      # crawlWebsite() — orchestrator (sitemap-first, BFS fallback)
  generator/
    index.ts                      # generateLlmsTxt() — formats CrawlResult into llms.txt string
  __tests__/
    fetcher.test.ts               # 5 unit tests
    parser.test.ts                # 12 unit tests
    sitemap.test.ts               # 6 unit tests
    generator.test.ts             # 8 unit tests

app/
  layout.tsx                      # Root layout — page title, metadata, Profound favicon
  page.tsx                        # Client component — three-tab UI, state machines, stream readers
  icon.svg                        # Profound SVG favicon
  api/v1/llms-txt/
    generate/
      route.ts                    # POST — deterministic crawl, streams NDJSON
      __tests__/route.test.ts     # 5 integration tests
    generate-aeo/
      route.ts                    # POST — Gemini AEO generation, streams NDJSON tokens
    existing/
      route.ts                    # GET — fetches /llms.txt from domain server-side

.github/workflows/
  ci.yml                          # GitHub Actions: type-check + lint + test on push
```

---

## API Routes (`/api/v1/llms-txt/`)

All routes are versioned under `/api/v1/llms-txt/` — versioning allows future breaking changes without affecting existing consumers.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/v1/llms-txt/generate` | Crawl site, stream deterministic llms.txt |
| `POST` | `/api/v1/llms-txt/generate-aeo` | Take crawl result, stream Gemini-optimized llms.txt |
| `GET` | `/api/v1/llms-txt/existing?url=...` | Fetch existing llms.txt from domain server-side |

---

## Type System (`lib/types.ts`)

```
EventType (as const object)
  Progress | Skip | AiToken | Done | Error

PageData
  url         string   — canonical URL of the page
  title       string   — extracted from <title> → <h1> → URL pathname (fallback chain)
  description string   — extracted from meta[name=description] → og:description → ""

CrawlResult
  siteTitle       string       — title of the root page (or base hostname as fallback)
  siteDescription string       — description of the root page
  baseUrl         string       — protocol + host only (e.g. https://example.com)
  pages           PageData[]   — all successfully crawled pages

GenerateResult extends CrawlResult
  llmsTxt   string   — the final formatted llms.txt output string

FetchResult (in fetcher.ts)
  | { success: true;  html: string   }   — page fetched successfully
  | { success: false; reason: string }   — failure with a specific reason

CrawlProgressEvent (discriminated union — streamed as NDJSON)
  | { type: "progress"; message: string; pagesFound: number }   — page crawled successfully
  | { type: "skip";     url: string;     reason: string     }   — page skipped with reason
  | { type: "ai_token"; token: string                       }   — Gemini token streamed
  | { type: "done";     result: GenerateResult              }   — crawl/generation complete
  | { type: "error";    message: string                     }   — unrecoverable failure
```

---

## Full System Flow

```
╔══════════════════════════════════════════════════════════════════╗
║  BROWSER (app/page.tsx)                                          ║
║                                                                  ║
║  Three independent state objects:                                ║
║    appState:      "idle"|"crawling"|"done"|"error"               ║
║    aiStatus:      "idle"|"loading"|"done"|"error"                ║
║    existingStatus:"idle"|"loading"|"found"|"not-found"           ║
║                                                                  ║
║  User submits URL → handleSubmit()                               ║
║    1. Normalize URL (prepend https:// if no protocol)            ║
║    2. Validate hostname has a dot (reject "sleep", ".com")       ║
║    3. Fire three operations:                                     ║
║       a. POST /api/v1/llms-txt/generate  (awaited, streaming)    ║
║       b. GET  /api/v1/llms-txt/existing  (fire-and-forget)       ║
║       c. POST /api/v1/llms-txt/generate-aeo (after crawl done)   ║
║                                                                  ║
║  Three tabs — each shows its own state:                          ║
║    Deterministic → progress log + llms.txt output                ║
║    AI Optimized  → spinner → streaming tokens → final output     ║
║    Existing      → loading → found/not-found                     ║
╚══════════╦═══════════════════════╦══════════════════════════════╝
           │                       │
           │ POST /generate        │ GET /existing?url=...
           ▼                       ▼
╔══════════════════════╗  ╔═════════════════════════════════════╗
║  /generate           ║  ║  /existing                          ║
║                      ║  ║                                     ║
║  1. Validate URL     ║  ║  fetchExistingLlmsTxt(baseUrl)      ║
║  2. Create stream    ║  ║  → fetch {domain}/llms.txt          ║
║  3. crawlWebsite()   ║  ║  → return text or null              ║
║  4. if 0 pages →     ║  ║  (server-side — bypasses CORS)      ║
║     stream error     ║  ╚═════════════════════════════════════╝
║  5. generateLlmsTxt  ║
║  6. stream done      ║
╚══════════╦═══════════╝
           │ CrawlResult returned
           │ browser sends to:
           ▼
╔══════════════════════════════════════════════════════════════════╗
║  /generate-aeo                                                   ║
║                                                                  ║
║  1. Validate pages.length > 0                                    ║
║  2. Build prompt from CrawlResult (titles + descriptions + URLs) ║
║  3. client.models.generateContentStream(gemini-3-flash-preview)  ║
║  4. For each chunk: stream { type: "ai_token", token }           ║
║  5. When done: stream { type: "done", result: { llmsTxt } }      ║
╚══════════════════════════════════════════════════════════════════╝

CRAWLER ORCHESTRATOR (lib/crawler/index.ts)
─────────────────────────────────────────
crawlWebsite(url, onProgress):
  1. fetchSitemapUrls(baseUrl)
     ├─ Standard sitemap → extract page URLs directly
     └─ Sitemap index → fetch up to 10 child sitemaps,
                        take 5 pages per child (max 50 total)
  2. If no sitemap → BFS from root URL
  3. For each URL in queue (max 50):
     ├─ fetchHtml(url) → FetchResult
     │   ├─ success → parsePageData(html, url) → PageData
     │   └─ failure → stream { type: "skip", url, reason }
     └─ if BFS mode → extractLinks(html) → push to queue
  4. Return CrawlResult
```

---

## Key Design Decisions

### 1. `lib/` is framework-agnostic
All business logic lives in `lib/` with zero Next.js dependencies. The API routes are thin adapters. This means the crawler and generator are independently testable and could be extracted to a CLI, Lambda, or separate service without rewriting.

### 2. Sitemap-first crawling with index support
`/sitemap.xml` is checked before BFS link-following. Both standard sitemaps (`<urlset>`) and sitemap indexes (`<sitemapindex>`) are handled. For sitemap indexes, up to 10 child sitemaps are fetched with 5 pages each — giving representative coverage across all site sections without flooding the output with one product's pages.

### 3. Three parallel operations on submit
The deterministic crawl, existing llms.txt check, and AI generation are decoupled. The existing check fires immediately (no dependency on crawl). AI generation starts after crawl completes (needs the crawl data). None block each other unnecessarily.

### 4. NDJSON streaming for both crawl and AI
Both `/generate` and `/generate-aeo` use the same NDJSON streaming pattern. The browser uses identical stream reader logic for both — the only difference is event types (`progress`/`skip` vs `ai_token`). This consistency simplifies the frontend significantly.

### 5. Server-side existing llms.txt fetch
`/existing` fetches the target domain's `llms.txt` server-side. If done client-side, CORS headers on most domains would block the browser request silently. Server-side bypasses this entirely.

### 6. API versioning (`/api/v1/`)
All routes are namespaced under `/api/v1/llms-txt/`. If the request/response shape changes in the future, `/v2` routes can be added without breaking existing consumers.

---

## Constraints & Trade-offs

| Constraint | Implication |
|---|---|
| Vercel 10s serverless timeout | MAX_PAGES = 50; Playwright not viable |
| cheerio (no JS execution) | JS-rendered SPAs won't parse correctly |
| Sitemap index — one level deep | Nested sitemap indexes are not recursively fetched |
| Gemini free tier | Rate limits may affect high-traffic usage |
| No rate limiting on our API | Public tool — could be abused for crawling at scale |
| AI generation depends on crawl | AEO tab only populates after deterministic crawl finishes |

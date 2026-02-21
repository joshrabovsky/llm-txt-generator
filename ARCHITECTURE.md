# Architecture: llms.txt Generator

## Overview

A Next.js web application where a user inputs a website URL and receives a generated `llms.txt` file conforming to the [llmstxt.org](https://llmstxt.org) spec. The crawl runs server-side to bypass CORS restrictions, and progress is streamed live to the browser as each page is processed.

---

## Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR + API routes in one project — no CORS |
| Language | TypeScript | Type safety across lib and API boundary |
| HTML Parsing | cheerio | Lightweight server-side jQuery-like parser |
| Styling | Tailwind CSS + shadcn/ui | Utility-first styling; shadcn copies components into the codebase (no runtime overhead) |
| Deployment | Vercel | Native Next.js platform, free tier, zero config, auto-deploy on push |

---

## Directory Structure

```
lib/                              # Pure business logic — zero Next.js dependencies
  types.ts                        # All shared TypeScript types and event shapes
  crawler/
    fetcher.ts                    # fetchHtml() — HTTP fetch with timeout + typed result
    parser.ts                     # parsePageData() + extractLinks() via cheerio
    sitemap.ts                    # fetchSitemapUrls() — fetches and parses /sitemap.xml
    index.ts                      # crawlWebsite() — orchestrator (sitemap-first, BFS fallback)
  generator/
    index.ts                      # generateLlmsTxt() — formats CrawlResult into llms.txt string

app/
  layout.tsx                      # Root layout — sets page title and metadata
  page.tsx                        # Client component — UI, state machine, stream reader
  api/
    generate/
      route.ts                    # POST /api/generate — thin Next.js adapter, streams NDJSON
```

---

## Type System (`lib/types.ts`)

All data shapes are defined once and shared across the entire codebase:

```
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
  | { type: "done";     result: GenerateResult              }   — crawl complete
  | { type: "error";    message: string                     }   — unrecoverable failure
```

---

## Full System Flow

```
╔══════════════════════════════════════════════════════════════════╗
║  BROWSER (app/page.tsx)                                          ║
║                                                                  ║
║  AppState: "idle" | "crawling" | "done" | "error"               ║
║                                                                  ║
║  User types URL → handleSubmit()                                 ║
║    setState("crawling")                                          ║
║    setProgress([]), setResult(null), setError(null)              ║
║                                                                  ║
║  fetch("POST /api/generate", { body: { url } })                  ║
╚══════════════════════╦═══════════════════════════════════════════╝
                       │ HTTP POST — body: { url: string }
                       ▼
╔══════════════════════════════════════════════════════════════════╗
║  NEXT.JS API ROUTE (app/api/generate/route.ts)                   ║
║                                                                  ║
║  1. await request.json()       — parse incoming request body     ║
║  2. validate url exists        — return 400 if missing           ║
║  3. new URL(url)               — return 400 if malformed         ║
║  4. new TextEncoder()          — converts strings → Uint8Array   ║
║  5. new ReadableStream({ start(controller) { ... } })            ║
║     └─ defines send() helper:                                    ║
║        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
║  6. return new Response(stream, headers)                         ║
║     └─ response headers sent to browser immediately             ║
║     └─ stream.start() begins executing                           ║
╚══════════════════════╦═══════════════════════════════════════════╝
                       │ calls crawlWebsite(url, send)
                       ▼
╔══════════════════════════════════════════════════════════════════╗
║  CRAWLER ORCHESTRATOR (lib/crawler/index.ts)                     ║
║                                                                  ║
║  crawlWebsite(inputUrl, onProgress)                              ║
║                                                                  ║
║  1. Normalize URL → baseUrl (protocol + host only)               ║
║  2. onProgress({ type: "progress", message: "Checking sitemap"}) ║
║                                                                  ║
║  3. fetchSitemapUrls(baseUrl)  ──────────────────────────────►   ║
║     └─ see SITEMAP block below                                   ║
║                                                                  ║
║  4a. Sitemap found:                                              ║
║      onProgress({ type: "progress", message: "Found N URLs" })   ║
║      queue = sitemapUrls.slice(0, 50)                            ║
║                                                                  ║
║  4b. No sitemap:                                                 ║
║      onProgress({ type: "progress", message: "Starting BFS" })   ║
║      queue = [baseUrl]                                           ║
║                                                                  ║
║  5. BFS LOOP (while queue.length > 0 && pages.length < 50)       ║
║     │                                                            ║
║     ├─ url = queue.shift()          — dequeue next URL (FIFO)    ║
║     ├─ normalize url (strip /)                                   ║
║     ├─ if visited.has(url) → continue  (Set for O(1) lookup)     ║
║     ├─ visited.add(url)                                          ║
║     │                                                            ║
║     ├─ fetchHtml(url)  ───────────────────────────────────────►  ║
║     │   └─ see FETCHER block below                               ║
║     │                                                            ║
║     ├─ if fetchResult.success === false:                         ║
║     │   onProgress({ type: "skip", url, reason })  ──► browser  ║
║     │   continue                                                 ║
║     │                                                            ║
║     ├─ parsePageData(html, url)  ─────────────────────────────►  ║
║     │   └─ see PARSER block below                                ║
║     │                                                            ║
║     ├─ pages.push(pageData)                                      ║
║     ├─ onProgress({ type: "progress", ... })  ────────► browser  ║
║     │                                                            ║
║     └─ if no sitemap: extractLinks(html, baseUrl)                ║
║         └─ push unseen same-origin links to queue                ║
║                                                                  ║
║  6. Find root page (pathname === "/") for site-level metadata     ║
║  7. return CrawlResult                                           ║
╚══════════════════════╦═══════════════════════════════════════════╝
                       │
          ┌────────────┴──────────────────────────┐
          ▼                                       ▼
╔═════════════════════════╗           ╔═══════════════════════════╗
║  FETCHER                ║           ║  SITEMAP                  ║
║  (lib/crawler/          ║           ║  (lib/crawler/sitemap.ts) ║
║   fetcher.ts)           ║           ║                           ║
║                         ║           ║  fetchSitemapUrls(base)   ║
║  fetchHtml(url)         ║           ║  1. build /sitemap.xml URL║
║  1. AbortController     ║           ║  2. fetch with User-Agent ║
║     setTimeout 10s      ║           ║  3. if !ok → return []    ║
║  2. fetch(url, {        ║           ║  4. parseSitemapXml(xml)  ║
║     signal,             ║           ║     └─ cheerio xmlMode    ║
║     User-Agent header   ║           ║     └─ try url > loc      ║
║     })                  ║           ║        (standard sitemap) ║
║  3. clearTimeout        ║           ║     └─ fallback:          ║
║  4. if !ok →            ║           ║        sitemap > loc      ║
║     { success: false,   ║           ║        (sitemap index)    ║
║       reason: HTTP XXX }║           ║  5. return string[]       ║
║  5. check content-type  ║           ╚═══════════════════════════╝
║     if !text/html →     ║
║     { success: false,   ║           ╔═══════════════════════════╗
║       reason: Not HTML }║           ║  PARSER                   ║
║  6. return html text    ║           ║  (lib/crawler/parser.ts)  ║
║     { success: true,    ║           ║                           ║
║       html: string }    ║           ║  parsePageData(html, url) ║
║                         ║           ║  1. cheerio.load(html)    ║
║  catch AbortError →     ║           ║  2. title fallback chain: ║
║    { success: false,    ║           ║     <title> →             ║
║      reason: Timed out }║           ║     <h1> →                ║
║  catch other →          ║           ║     URL pathname          ║
║    { success: false,    ║           ║  3. description chain:    ║
║      reason: Request    ║           ║     meta[name=description]║
║      failed }           ║           ║     → og:description → "" ║
╚═════════════════════════╝           ║  4. return PageData       ║
                                      ║                           ║
                                      ║  extractLinks(html, base) ║
                                      ║  (BFS fallback only)      ║
                                      ║  1. find all a[href]      ║
                                      ║  2. resolve relative URLs ║
                                      ║  3. filter same origin    ║
                                      ║  4. strip hash + trailing/║
                                      ║  5. return string[]       ║
                                      ╚═══════════════════════════╝
                       │
                       │ crawlWebsite() returns CrawlResult
                       ▼
╔══════════════════════════════════════════════════════════════════╗
║  GENERATOR (lib/generator/index.ts)                              ║
║                                                                  ║
║  generateLlmsTxt(result: CrawlResult): string                    ║
║                                                                  ║
║  1. # {siteTitle}                  ← H1                         ║
║  2. > {siteDescription}            ← blockquote (if present)    ║
║  3. ## Overview                    ← pages where pathname === / ║
║     - [title](url): description                                  ║
║  4. ## Pages                       ← all other pages            ║
║     - [title](url): description                                  ║
║                                                                  ║
║  formatPageEntry(page):                                          ║
║    title       = page.title || page.url                          ║
║    description = page.description ? ": {desc}" : ""             ║
║    → "- [{title}]({url}){description}"                           ║
╚══════════════════════╦═══════════════════════════════════════════╝
                       │ returns llmsTxt string
                       │ back in route.ts:
                       │ send({ type: "done", result: { ...crawlResult, llmsTxt } })
                       │ controller.close()
                       ▼
╔══════════════════════════════════════════════════════════════════╗
║  BROWSER — STREAM READER (app/page.tsx)                          ║
║                                                                  ║
║  response.body.getReader()                                       ║
║  TextDecoder — converts Uint8Array chunks → string               ║
║  buffer — accumulates partial chunks between reads               ║
║                                                                  ║
║  loop: reader.read()                                             ║
║    buffer += decoded chunk                                       ║
║    lines = buffer.split("\n")                                    ║
║    buffer = lines.pop()         — keep incomplete last line      ║
║    for each complete line:                                       ║
║      event = JSON.parse(line)                                    ║
║                                                                  ║
║      "progress" → setProgress([...prev, { kind: "progress" }])  ║
║                   scrollToBottom()                               ║
║      "skip"     → setProgress([...prev, { kind: "skip" }])      ║
║                   scrollToBottom()                               ║
║      "done"     → setResult(event.result)                        ║
║                   setState("done")                               ║
║      "error"    → setError(event.message)                        ║
║                   setState("error")                              ║
║                                                                  ║
║  UI renders based on AppState:                                   ║
║    "idle"     → URL input form only                              ║
║    "crawling" → form (disabled) + progress log (Live badge)      ║
║    "done"     → progress log (pages badge) + output card         ║
║    "error"    → error card + Try again button                    ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Key Design Decisions

### 1. `lib/` is framework-agnostic
All business logic lives in `lib/` with zero Next.js dependencies. The API route is a thin adapter. This means the crawler and generator are independently testable and could be extracted to a CLI, Lambda, or separate service without rewriting.

### 2. Sitemap-first crawling
`/sitemap.xml` is checked before BFS link-following. It is the owner-curated, authoritative page list for a site. BFS is the fallback for sites without one. Both standard sitemaps (`<urlset>`) and sitemap indexes (`<sitemapindex>`) are handled, one level deep.

### 3. Typed FetchResult discriminated union
`fetchHtml()` returns `{ success: true, html }` or `{ success: false, reason }` instead of `string | null`. This forces callers to handle the failure case explicitly and exposes a specific reason for every skip — surfaced to the user in the progress log.

### 4. NDJSON streaming over a single HTTP connection
Each crawl event is a newline-delimited JSON object sent over a `ReadableStream`. The browser reads it with `fetch()` + a stream reader. The connection stays open for the duration of the crawl. Chosen over SSE for simplicity — no special wire format, no `EventSource` API required.

### 5. MAX_PAGES = 50
Vercel serverless functions have a 10-second execution limit. Unbounded crawling would timeout. 50 pages covers most sites while staying within limits.

---

## Constraints & Trade-offs

| Constraint | Implication |
|---|---|
| Vercel 10s serverless timeout | MAX_PAGES = 50; Playwright not viable |
| cheerio (no JS execution) | JS-rendered SPAs won't parse correctly |
| Sitemap index — one level deep | Nested sitemap indexes are not recursively fetched |
| No rate limiting on the API | Public tool — could be abused for crawling at scale |

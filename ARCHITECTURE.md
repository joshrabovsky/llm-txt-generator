# Architecture: llms.txt Generator

## Overview

A Next.js web application where a user inputs a website URL and receives a generated `llms.txt` file conforming to the [llmstxt.org](https://llmstxt.org) spec.

## Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR + API routes in one project — no CORS |
| Language | TypeScript | Type safety across lib and API boundary |
| HTML Parsing | cheerio | Lightweight server-side jQuery-like parser |
| Styling | Tailwind CSS | Utility-first, fast to build with |
| Deployment | Vercel | Native Next.js platform, free tier, zero config |

## Directory Structure

```
lib/                        # Pure business logic — no Next.js dependencies
  types.ts                  # Shared types: PageData, CrawlResult, GenerateResult, CrawlProgressEvent
  crawler/
    fetcher.ts              # fetchHtml(url) — raw HTTP fetch with timeout + content-type guard
    parser.ts               # parsePageData(html, url) + extractLinks(html, baseUrl) via cheerio
    sitemap.ts              # fetchSitemapUrls(baseUrl) — parses /sitemap.xml
    index.ts                # crawlWebsite(url, onProgress) — orchestrator (sitemap-first, BFS fallback)
  generator/
    index.ts                # generateLlmsTxt(result) — formats CrawlResult into llms.txt string

app/
  page.tsx                  # UI — URL input form, live progress stream, output display
  api/
    generate/
      route.ts              # POST /api/generate — thin Next.js adapter, streams NDJSON to browser
```

## Data Flow

```
[Browser]
  │
  │  POST /api/generate  { url: "https://example.com" }
  ▼
[app/api/generate/route.ts]          ← Next.js layer (HTTP only, no business logic)
  │
  │  crawlWebsite(url, onProgress)
  ▼
[lib/crawler/index.ts]               ← Orchestrator
  │
  ├─ fetchSitemapUrls(baseUrl)        → lib/crawler/sitemap.ts
  │    └─ fetch /sitemap.xml, parse <loc> tags
  │    └─ if found → use sitemap URLs (up to MAX_PAGES=50)
  │    └─ if not found → BFS from root URL
  │
  ├─ fetchHtml(url)                   → lib/crawler/fetcher.ts
  │    └─ fetch with 10s timeout + User-Agent header
  │    └─ returns null on error / non-HTML content-type
  │
  ├─ parsePageData(html, url)         → lib/crawler/parser.ts
  │    └─ extracts: title, meta description
  │
  └─ extractLinks(html, baseUrl)      → lib/crawler/parser.ts  (BFS only)
       └─ same-origin links, normalized, hash stripped
  │
  │  onProgress(event) called after each page  ──► streamed as NDJSON line to browser
  │
  │  generateLlmsTxt(result)
  ▼
[lib/generator/index.ts]             ← Pure formatter
  │
  └─ outputs llms.txt string:
       # Site Title
       > Site description
       ## Overview
       - [Root Page](url): description
       ## Pages
       - [Page Title](url): description
  │
  │  { type: "done", result: { ...crawlResult, llmsTxt } }  ──► final NDJSON line
  ▼
[Browser]
  └─ reads ReadableStream line-by-line
  └─ renders progress updates live
  └─ displays final llms.txt output
```

## Key Design Decisions

### 1. `lib/` is framework-agnostic
All business logic lives in `lib/` with zero Next.js dependencies. The API route is a thin adapter. This means:
- Business logic is unit-testable without mocking Next.js
- The crawler/generator could be extracted to a CLI or separate service with no rewrites

### 2. Sitemap-first crawling
`/sitemap.xml` is checked before BFS link-following. Most production sites publish one — it's the authoritative, owner-curated page list. BFS is the fallback for sites without one.

### 3. NDJSON streaming over SSE
Each crawl event is a newline-delimited JSON object streamed over a single `ReadableStream`. The browser reads it with `fetch()` + a stream reader. Chosen over SSE for simplicity — no special wire format, no `EventSource` API required.

### 4. `MAX_PAGES = 50`
Vercel serverless functions have a 10-second execution limit. Unbounded crawling would timeout. 50 pages covers most sites while staying well within limits.

## Constraints & Trade-offs

| Constraint | Implication |
|---|---|
| Vercel 10s function timeout | MAX_PAGES = 50; no Playwright |
| cheerio (no JS execution) | JS-rendered SPAs won't parse correctly |
| No auth/rate limiting | Public tool — could be abused for crawling at scale |
| Single-level sitemap index | We don't recursively fetch nested sitemap indexes |

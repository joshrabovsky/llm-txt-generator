# llm-txt-generator

A web application that automatically generates an [`llms.txt`](https://llmstxt.org) file for any website. Enter a URL, watch the crawler work in real time, then copy or download the result.

**Live demo:** https://llms-txt-generator-hkea52aix-joshrabovskys-projects.vercel.app

---

## What is llms.txt?

`llms.txt` is a proposed standard that helps Large Language Models better understand a website's structure and content. Similar to `robots.txt` for search engines, it provides a clean, structured index of a site's key pages in a format optimized for AI systems.

---

## How it works

1. The user enters a website URL
2. The server checks for `/sitemap.xml` — if found, those URLs are used directly
3. If no sitemap exists, the crawler performs a BFS traversal of links from the root page
4. For each page, the title and meta description are extracted via HTML parsing
5. Progress is streamed live to the browser as each page is crawled
6. The results are formatted into a spec-compliant `llms.txt` file

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| HTML Parsing | cheerio |
| Styling | Tailwind CSS + shadcn/ui |
| Deployment | Vercel |

---

## Local setup

**Prerequisites:** Node.js 18+

```bash
# Clone the repo
git clone https://github.com/joshrabovsky/llm-txt-generator.git
cd llm-txt-generator

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment

This project is deployed on Vercel. Any push to `main` triggers an automatic redeployment.

**To deploy your own instance:**

1. Fork this repo
2. Go to [vercel.com](https://vercel.com) and create a new project
3. Import your forked repo — Vercel auto-detects Next.js, no configuration needed
4. Click Deploy

Alternatively, deploy via the Vercel CLI:

```bash
npm install -g vercel
vercel
```

---

## Project structure

```
lib/                        # Business logic — no framework dependencies
  types.ts                  # Shared TypeScript types
  crawler/
    fetcher.ts              # HTTP fetch with timeout and error handling
    parser.ts               # HTML parsing via cheerio
    sitemap.ts              # sitemap.xml fetching and parsing
    index.ts                # Crawl orchestrator (sitemap-first, BFS fallback)
  generator/
    index.ts                # Formats crawl results into llms.txt

app/
  page.tsx                  # UI — form, live progress, output display
  api/generate/route.ts     # Streaming POST endpoint (NDJSON)
```

---

## Limitations

- **JavaScript-rendered sites (SPAs):** Pages that require JavaScript to render content won't be parsed correctly. A headless browser would be required to support these.
- **Bot-protected sites:** Sites that block server-side requests (e.g. returning HTTP 403) will show as skipped in the progress log.
- **Page limit:** Crawls are capped at 50 pages to stay within Vercel's serverless function timeout.

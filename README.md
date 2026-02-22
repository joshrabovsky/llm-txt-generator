# llm-txt-generator

A web application that automatically generates an `llms.txt` file for any website.

**Live demo:** https://llms-txt-generator-two.vercel.app

For architecture, data flow, and design decisions see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Local setup

**Prerequisites:** Node.js 18+

```bash
# Clone the repo
git clone https://github.com/joshrabovsky/llm-txt-generator.git
cd llm-txt-generator

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage

1. Enter any website URL into the input field (e.g. `anthropic.com`)
2. Click **Generate** — the crawler will start immediately
3. Watch the **Deterministic** tab for live crawl progress
4. Once complete, three tabs are available:
   - **Standard** — spec-compliant `llms.txt` generated directly from crawled metadata
   - **AI Optimized** — Gemini-enhanced version optimized for AI discoverability
   - **Existing** — the site's current `llms.txt` if one exists, for reference
5. Use **Copy** or **Download** on any tab to save the output

---

## Gemini API Key Setup

The AI Optimized tab uses Google's Gemini API, which has a free tier.

**Getting a free API key:**
1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with a Google account
3. Click **Create API key** → select **Create new project**
4. Copy the key and add it to `.env.local`

**Important — model availability:**
The free tier quota varies by model and Google account. This project uses `gemini-3-flash-preview` by default (`app/api/v1/llms-txt/generate-aeo/route.ts`). If you hit a `429 Quota Exceeded` error, try switching to a different model in that file:

```ts
model: "gemini-3-flash-preview"  // default
model: "gemini-2.0-flash"        // alternative
model: "gemini-1.5-flash"        // alternative
```

Free tier limits reset daily. If a model returns `limit: 0`, create a fresh Google Cloud project for your API key — existing projects with billing enabled lose free tier access.

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
npx vercel
```

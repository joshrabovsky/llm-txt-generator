# llm-txt-generator

A web application that automatically generates an `llms.txt` file for any website.

**Live demo:** https://llms-txt-generator-hkea52aix-joshrabovskys-projects.vercel.app

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
npx vercel
```

import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { CrawlResult, CrawlProgressEvent, EventType } from "@/lib/types";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const SYSTEM_PROMPT = `You are an expert in AI discoverability and SEO, specializing in helping brands appear prominently across AI interfaces like ChatGPT, Perplexity, and Claude.

Your task is to generate an optimized llms.txt file for a website. llms.txt is a standard that helps Large Language Models understand a website's structure and content — similar to how robots.txt guides search crawlers, but designed for AI systems.

The format is strictly:
# Site Title

> One-line site description

## Section Name

- [Page Title](url): Description

## Another Section

- [Page Title](url): Description

Optimization guidelines:
- Write descriptions that are keyword-rich, specific, and highlight the page's core value
- Group pages into logical sections that reflect the site's information architecture (e.g., Products, Documentation, Blog, About)
- Prioritize the most important and high-traffic pages first within each section
- Rewrite the site description to clearly capture the brand's core value proposition for AI systems
- Use titles that clearly signal page content — avoid vague titles like "Home" or "Page 1"
- Focus on what makes each page uniquely valuable and discoverable by AI systems
- Omit pages that are duplicates, low-value, or not meaningful for AI discoverability

Return only the llms.txt content. No explanation, no markdown fences, no preamble.`;

export async function POST(request: NextRequest) {
  const body: CrawlResult = await request.json();

  if (!body.pages || !body.baseUrl || body.pages.length === 0) {
    return new Response(JSON.stringify({ error: "No pages to generate from" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userMessage = `Generate an optimized llms.txt for this website:

Site: ${body.siteTitle}
Description: ${body.siteDescription}
Base URL: ${body.baseUrl}

Pages (${body.pages.length} total):
${body.pages.map((p) => `- ${p.title} (${p.url})${p.description ? `: ${p.description}` : ""}`).join("\n")}`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: CrawlProgressEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        const geminiStream = await client.models.generateContentStream({
          model: "gemini-3-flash-preview",
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            maxOutputTokens: 2048,
          },
        });

        let fullText = "";

        for await (const chunk of geminiStream) {
          const token = chunk.text ?? "";
          if (token) {
            fullText += token;
            send({ type: EventType.AiToken, token });
          }
        }

        send({
          type: EventType.Done,
          result: {
            ...body,
            llmsTxt: fullText,
          },
        });
      } catch (err) {
        send({
          type: EventType.Error,
          message: err instanceof Error ? err.message : "AI generation failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
